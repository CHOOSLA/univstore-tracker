require('dotenv').config();
const {
  prisma, redis, CrawlerContext, Pipeline, BlockDetectedError,
  withPrismaRetry, sleep, USER_DATA_DIR, checkLogin, SessionExpiredError,
  enqueueTasks, getNextTasks, finishTask, failTask, chromium, getExecutablePath, getLaunchOptions
} = require('./lib/engine');
const {
  DBStateFilter, DirectApiFilter, NavigationFilter, SessionCheckFilter,
  ExtractionFilter, ValidationFilter, StorageFilter
} = require('./lib/filters');
const { XMLParser } = require('fast-xml-parser');

async function discoverAllProductIds(page) {
  console.log("🔍 사이트맵(item.xml) 분석하여 전체 상품 ID 수집 중...");
  try {
    const sitemapUrl = 'https://www.univstore.com/sitemap/item.xml';
    const response = await page.goto(sitemapUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    if (response.status() === 403 || response.status() === 429 || response.status() === 405) {
      throw new BlockDetectedError(`사이트맵 접근 차단됨 (HTTP ${response.status()})`, response.status());
    }

    const rawContent = await page.content();
    let xmlData = rawContent;
    if (!rawContent.includes('<urlset')) {
      xmlData = await page.evaluate(() => document.documentElement.textContent);
    }
    
    const xmlMatch = xmlData.match(/<\?xml[\s\S]*<\/urlset>/i) || xmlData.match(/<urlset[\s\S]*<\/urlset>/i);
    xmlData = xmlMatch ? xmlMatch[0] : xmlData;
    
    const parser = new XMLParser({ ignoreAttributes: false, alwaysCreateTextNode: false });
    const jsonObj = parser.parse(xmlData);
    if (!jsonObj.urlset || !jsonObj.urlset.url) return [];
    const urlArray = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];
    const ids = urlArray.map(u => {
      const loc = typeof u.loc === 'string' ? u.loc : (u.loc?.['#text'] || '');
      return loc.match(/\/item\/(\d+)/)?.[1];
    }).filter(id => !!id);
    
    console.log(`✅ 총 ${ids.length}개의 상품 ID를 확보했습니다.`);
    return ids;
  } catch (err) {
    if (err instanceof BlockDetectedError) throw err;
    console.error("❌ 사이트맵 수집 실패:", err.message);
    return [];
  }
}

async function discoverSpecials(page) {
  console.log("\n🎁 래플 및 특가 정보 탐색 중...");
  try {
    const response = await page.goto('https://www.univstore.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    if (response.status() === 403 || response.status() === 429 || response.status() === 405) {
      throw new BlockDetectedError(`메인 페이지 접근 차단됨 (HTTP ${response.status()})`, response.status());
    }

    await page.waitForTimeout(3000);
    const specials = await page.evaluate(() => {
      const results = { raffles: [], flashSales: [] };
      const raffleLinks = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/raffle') || (a.innerText.includes('래플') && a.innerText.length < 20));
      raffleLinks.forEach(a => results.raffles.push({ title: a.innerText.trim(), brand: 'Event', entries: 0, endsAt: new Date(Date.now() + 86400000 * 2).toISOString() }));
      const dealLinks = Array.from(document.querySelectorAll('.usShortcut, .usMainBanner a, a')).filter(a => (a.innerText.includes('특가') || a.innerText.includes('SALE')) && a.innerText.length <= 15);
      dealLinks.forEach(a => results.flashSales.push({ title: a.innerText.trim(), startTime: new Date().toISOString(), endTime: new Date(Date.now() + 86400000).toISOString(), status: 'Ongoing' }));
      return results;
    });
    if (specials.raffles.length > 0 || specials.flashSales.length > 0) {
      await redis.rpush('univstore:specials_updates', JSON.stringify({ type: 'SPECIALS', data: specials, timestamp: new Date().toISOString() }));
    }
  } catch (err) {
    if (err instanceof BlockDetectedError) throw err;
  }
}

async function run() {
  const BATCH_SIZE = 3;
  const PROGRESS_KEY = `univstore:progress:${new Date().toISOString().split('T')[0]}`;
  let startIndex = parseInt(await redis.get(PROGRESS_KEY) || '0');

  // 1. 초기화 단계
  const executablePath = getExecutablePath();

  if (executablePath) {
    console.log(`🚀 정식 Chrome 브라우저 연결됨: ${executablePath}`);
  } else {
    console.warn("⚠️ 정식 Chrome을 찾을 수 없어 내장 Chromium으로 실행합니다.");
  }

  let initContext = await chromium.launchPersistentContext(USER_DATA_DIR, getLaunchOptions(executablePath));

  let totalItems = 0;
  try {
    const initPage = await initContext.newPage();
    await checkLogin(initPage);
    await discoverSpecials(initPage);
    const allItemIds = await discoverAllProductIds(initPage);
    
    if (allItemIds.length > 0) {
      console.log(`📥 ${allItemIds.length}개의 작업을 큐에 등록 중...`);
      await enqueueTasks(allItemIds, false);
    }
    totalItems = allItemIds.length;
    await initContext.close();
  } catch (err) {
    console.error("❌ 초기화 에러:", err.message);
    await initContext.close();
    process.exit(1);
  }

  // 2. 엔진 가동
  const pipeline = new Pipeline([
    new DBStateFilter(),
    new DirectApiFilter(),
    new NavigationFilter(),
    new SessionCheckFilter(),
    new ExtractionFilter(),
    new ValidationFilter(),
    new StorageFilter()
  ]);

  if (process.env.USE_DIRECT_API === 'true') {
    console.log("⚡ USE_DIRECT_API=true: 페이지 로드 대신 API 직접 호출 모드로 동작합니다.");
  }

  await withPrismaRetry(() => prisma.crawlerStatus.upsert({
    where: { id: 'singleton' },
    update: { totalItems, currentIndex: startIndex, lastStatus: 'RUNNING', lastHeartbeat: new Date() },
    create: { id: 'singleton', totalItems, currentIndex: startIndex, lastStatus: 'RUNNING' }
  }));

  let browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, getLaunchOptions(executablePath));

  let i = startIndex;
  let processedCount = 0;
  
  while (true) {
    // 500개마다 브라우저 재시작 (메모리 관리)
    if (processedCount > 0 && processedCount % 500 === 0) {
      console.log(`\n♻️  메모리 최적화를 위해 브라우저를 재시작합니다... (${processedCount}개 처리 완료)`);
      await browserContext.close();
      await sleep(5000);
      browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, getLaunchOptions(executablePath));
    }

    // 다음 배치 작업 가져오기
    // sync-picks의 우선순위 아이템은 task_queue ZSET에 score=0으로 들어와
    // getNextTasks()에서 자연스럽게 가장 먼저 pop됨

    const batchIds = await getNextTasks(BATCH_SIZE);
    if (batchIds.length === 0) {
      console.log("💤 할 일이 없습니다. 1분 후 다시 확인합니다...");
      await sleep(60000);
      continue;
    }

    try {
      // [안정성 최우선] Promise.all 대신 순차 처리를 통해 브라우저 종료 충돌(Race Condition) 방지
      for (let idx = 0; idx < batchIds.length; idx++) {
        const id = batchIds[idx];
        const batchPage = await browserContext.newPage();
        const currentIdx = i + idx + 1;
        const ctx = new CrawlerContext(id, 0, totalItems, batchPage, browserContext, USER_DATA_DIR);
        
        try { 
          await pipeline.execute(ctx); 
          if (ctx.payload) {
            const statusIcon = ctx.isRecoveryMode ? '✅' : '✨';
            console.log(`${statusIcon} [${currentIdx}/${totalItems}] 수집 완료: [${ctx.payload.brand}] ${ctx.payload.title} (₩${ctx.payload.price.toLocaleString()})`);
          } else if (ctx.shouldSkip) {
            if (ctx.productStatus && ctx.productStatus.priceHistory.length > 0) {
              if ((i + idx) % 100 === 0) console.log(`⏭️ [${currentIdx}/${totalItems}] 오늘 수집됨 (Skipped)`);
            } else {
              console.log(`⏩ [${currentIdx}/${totalItems}] (ID ${id}) 수집 제외됨 (검증 실패 등)`);
            }
          }
          await finishTask(id);
        } catch (err) {
          if (err instanceof SessionExpiredError || err instanceof BlockDetectedError) {
            await batchPage.close();
            throw err; 
          }
          
          console.warn(`⚠️ [${currentIdx}/${totalItems}] (ID ${id}) 수집 실패, 나중에 다시 시도:`, err.message);
          await failTask(id);
        } finally { 
          if (!batchPage.isClosed()) await batchPage.close(); 
        }

        if (idx < batchIds.length - 1) await sleep(1000);
      }
      
      processedCount += batchIds.length;
      i += batchIds.length;
      await redis.set(PROGRESS_KEY, i);
      
      const qLen = await redis.zcard('univstore:task_queue');
      await prisma.crawlerStatus.update({ 
        where: { id: 'singleton' }, 
        data: { currentIndex: i, totalItems: qLen, lastHeartbeat: new Date() } 
      }).catch(() => {});
      
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        console.error("🔄 세션 만료 감지. 재로그인 시도...");
        for (const id of batchIds) await failTask(id);
        const loginPage = await browserContext.newPage();
        try { await checkLogin(loginPage); } catch (e) { await sleep(300000); process.exit(1); }
        finally { await loginPage.close(); }
        continue;
      }

      if (err instanceof BlockDetectedError) {
        console.error(`🔥 Blocked: ${err.message}. 10분 대기...`);
        for (const id of batchIds) await failTask(id);
        await browserContext.close();
        await sleep(600000);
        browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, getLaunchOptions(executablePath));
        continue;
      }

      console.error(`❌ Batch Error:`, err.message);
      for (const id of batchIds) await failTask(id);
      await sleep(5000);
    }
  }
}

run();
