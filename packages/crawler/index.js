require('dotenv').config();
const { chromium } = require('playwright');
const { 
  prisma, redis, CrawlerContext, Pipeline, BlockDetectedError, 
  withPrismaRetry, sleep, USER_DATA_DIR, checkLogin, SessionExpiredError,
  enqueueTasks, getNextTasks, finishTask, failTask
} = require('./lib/engine');
const { 
  DBStateFilter, NavigationFilter, ExtractionFilter, 
  ValidationFilter, StorageFilter 
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
  
  // 1. 초기화 및 작업 발굴
  let initContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const initPage = await initContext.newPage();
    await checkLogin(initPage);
    await discoverSpecials(initPage);
    const allItemIds = await discoverAllProductIds(initPage);
    
    // Redis ZSET 큐에 모든 ID 등록 (NX: 기존 항목은 무시)
    if (allItemIds.length > 0) {
      console.log(`📥 ${allItemIds.length}개의 작업을 큐에 등록 중...`);
      await enqueueTasks(allItemIds, false);
    }
    await initContext.close();
  } catch (err) {
    console.error("❌ 초기화 에러:", err.message);
    await initContext.close();
    process.exit(1);
  }

  // 2. 파이프라인 구성
  const pipeline = new Pipeline([
    new DBStateFilter(),
    new NavigationFilter(),
    new ExtractionFilter(),
    new ValidationFilter(),
    new StorageFilter()
  ]);

  let browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  let processedCount = 0;
  console.log(`\n🚀 ZSET 기반 소비자 엔진 가동 (Daemon Mode, Batch: ${BATCH_SIZE})`);

  // 3. 무한 소비자 루프
  while (true) {
    // 500개마다 브라우저 재시작
    if (processedCount > 0 && processedCount % 500 === 0) {
      console.log(`\n♻️  메모리 최적화를 위해 브라우저를 재시작합니다... (${processedCount}개 처리 완료)`);
      await browserContext.close();
      await sleep(5000);
      browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
      });
    }

    // 큐에서 다음 배치 가져오기
    const batchIds = await getNextTasks(BATCH_SIZE);
    if (batchIds.length === 0) {
      console.log("💤 할 일이 없습니다. 1분 후 다시 확인합니다...");
      await sleep(60000);
      continue;
    }

    try {
      await Promise.all(batchIds.map(async (id) => {
        const batchPage = await browserContext.newPage();
        const ctx = new CrawlerContext(id, 0, 0, batchPage, browserContext, USER_DATA_DIR);
        try { 
          await pipeline.execute(ctx); 
          if (ctx.payload) {
            const statusIcon = ctx.isRecoveryMode ? '✅' : '✨';
            console.log(`${statusIcon} 수집 완료: [${ctx.payload.brand}] ${ctx.payload.title} (₩${ctx.payload.price.toLocaleString()})`);
          } else if (ctx.shouldSkip) {
            // 이미 최신인 경우에도 finishTask를 호출하여 큐의 맨 뒤로 보냄
          }
          // 성공(또는 의도된 스킵) 시 큐의 맨 뒤로 이동
          await finishTask(id);
        } catch (err) {
          // 세션 만료나 차단이 아닌 '상품 페이지 에러' 등은 실패로 간주하고 나중에 다시 시도
          if (!(err instanceof SessionExpiredError) && !(err instanceof BlockDetectedError)) {
            console.warn(`⚠️ [ID ${id}] 수집 실패, 나중에 다시 시도:`, err.message);
            await failTask(id); // 맨 앞으로 보내서 바로 재시도하게 하거나, 혹은 적당한 시간 후로 조절 가능
          } else {
            // 세션/차단 에러는 배지 전체 에러로 던져서 catch 블록에서 처리
            throw err;
          }
        } finally { 
          await batchPage.close(); 
        }
      }));
      
      processedCount += batchIds.length;
      
      // 텔레메트리 업데이트 (Daemon 모드이므로 index 대신 처리량 등으로 활용 가능)
      const qLen = await redis.zcard('univstore:task_queue');
      await prisma.crawlerStatus.update({ 
        where: { id: 'singleton' }, 
        data: { currentIndex: processedCount, totalItems: qLen, lastHeartbeat: new Date() } 
      }).catch(() => {});

    } catch (err) {
      if (err instanceof SessionExpiredError) {
        console.error("🔄 세션 만료 감지. 재로그인 시도...");
        // 실패한 배치 아이템들은 큐에서 빠진 상태이므로 다시 넣어줘야 함 (zpopmin 했으므로)
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
        browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, { 
          headless: true, 
          args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] 
        });
        continue;
      }

      console.error(`❌ Batch Error:`, err.message);
      for (const id of batchIds) await failTask(id);
      await sleep(5000);
    }
  }
}

run();
