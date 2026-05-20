require('dotenv').config();
const { chromium } = require('playwright');
const { 
  prisma, redis, CrawlerContext, Pipeline, BlockDetectedError, 
  withPrismaRetry, sleep, USER_DATA_DIR, checkLogin, SessionExpiredError 
} = require('./lib/engine');
const { 
  DBStateFilter, NavigationFilter, ExtractionFilter, 
  ValidationFilter, StorageFilter, SessionCheckFilter 
} = require('./lib/filters');
const { XMLParser } = require('fast-xml-parser');

const PRIORITY_KEY = 'univstore:priority_set';

async function discoverAllProductIds(page) {
  console.log("🔍 사이트맵(item.xml) 분석하여 전체 상품 ID 수집 중...");
  try {
    const sitemapUrl = 'https://www.univstore.com/sitemap/item.xml';
    const response = await page.goto(sitemapUrl, { waitUntil: 'networkidle', timeout: 90000 });
    
    if (response.status() === 403 || response.status() === 429 || response.status() === 405) {
      throw new BlockDetectedError(`사이트맵 접근 차단됨 (HTTP ${response.status()})`, response.status());
    }

    const rawContent = await page.content();
    const xmlMatch = rawContent.match(/<\?xml[\s\S]*<\/urlset>/i) || rawContent.match(/<urlset[\s\S]*<\/urlset>/i);
    const xmlData = xmlMatch ? xmlMatch[0] : rawContent;
    
    const parser = new XMLParser({ ignoreAttributes: false, alwaysCreateTextNode: false });
    const jsonObj = parser.parse(xmlData);
    if (!jsonObj.urlset || !jsonObj.urlset.url) return [];
    const urlArray = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];
    return urlArray.map(u => (typeof u.loc === 'string' ? u.loc : u.loc?.['#text']).match(/\/item\/(\d+)/)?.[1]).filter(id => !!id);
  } catch (err) {
    if (err instanceof BlockDetectedError) throw err;
    console.error("❌ 사이트맵 수집 실패:", err.message);
    return [];
  }
}

async function discoverSpecials(page) {
  console.log("\n🎁 래플 및 특가 정보 탐색 중...");
  try {
    const response = await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle', timeout: 60000 });
    
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

async function handleBatch(batchIds, i, totalItems, pipeline, browserContext) {
  const batchRange = `${i + 1}-${i + batchIds.length}`;
  console.log(`📦 [Batch ${batchRange}/${totalItems}] 수집 시도 중...`);

  // [중요] 차단 회피를 위해 Promise.all 대신 순차 처리로 변경
  for (let idx = 0; idx < batchIds.length; idx++) {
    const id = batchIds[idx];
    const batchPage = await browserContext.newPage();
    const currentIdx = i + idx + 1;
    const ctx = new CrawlerContext(id, i + idx, totalItems, batchPage, browserContext, USER_DATA_DIR);
    try { 
      await pipeline.execute(ctx); 
      if (ctx.payload) {
        const statusIcon = ctx.isRecoveryMode ? '✅' : '✨';
        console.log(`${statusIcon} [${currentIdx}/${totalItems}] 수집 완료: [${ctx.payload.brand}] ${ctx.payload.title} (${ctx.payload.price}원)`);
      } else if (ctx.shouldSkip) {
        if (ctx.productStatus && ctx.productStatus.priceHistory.length > 0) {
          console.log(`⏭️ [${currentIdx}/${totalItems}] (ID ${id}) 오늘 이미 수집됨 - 스킵`);
        } else {
          console.log(`⏩ [${currentIdx}/${totalItems}] (ID ${id}) 수집 제외됨 (검증 실패 등)`);
        }
      }
    } finally { 
      await batchPage.close(); 
      if (idx < batchIds.length - 1) await sleep(1000); // 아이템 간 짧은 휴식
    }
  }
}

async function run() {
  const BATCH_SIZE = 3;
  const PROGRESS_KEY = `univstore:progress:${new Date().toISOString().split('T')[0]}`;
  let startIndex = parseInt(await redis.get(PROGRESS_KEY) || '0');

  let initContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  let allItemIds = [];
  let totalItems = 0;

  try {
    const initPage = await initContext.newPage();
    await checkLogin(initPage);
    await discoverSpecials(initPage);
    allItemIds = await discoverAllProductIds(initPage);
    totalItems = allItemIds.length;
    await initContext.close();
  } catch (err) {
    if (err instanceof BlockDetectedError) {
      console.error(`🔥 초기화 단계 차단 감지: ${err.message}. 15분 대기...`);
      await initContext.close();
      await sleep(900000);
      process.exit(1);
    }
    console.error("❌ 초기화 에러:", err.message);
    await initContext.close();
    process.exit(1);
  }

  console.log(`📊 총 ${totalItems}개의 상품 수집 공정 시작`);

  const pipeline = new Pipeline([
    new DBStateFilter(),
    new NavigationFilter(),
    new SessionCheckFilter(),
    new ExtractionFilter(),
    new ValidationFilter(),
    new StorageFilter()
  ]);

  await withPrismaRetry(() => prisma.crawlerStatus.upsert({
    where: { id: 'singleton' },
    update: { totalItems, currentIndex: startIndex, lastStatus: 'RUNNING', lastHeartbeat: new Date() },
    create: { id: 'singleton', totalItems, currentIndex: startIndex, lastStatus: 'RUNNING' }
  }));

  let browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  let i = startIndex;
  while (i < totalItems) {
    const priorityIds = await redis.spop(PRIORITY_KEY, 10);
    if (priorityIds.length > 0) {
      console.log(`🚀 [Priority] 우선순위 아이템 ${priorityIds.length}개 새치기 처리 시작...`);
      try {
        for (const pid of priorityIds) {
          const pPage = await browserContext.newPage();
          const pCtx = new CrawlerContext(pid, 0, 0, pPage, browserContext, USER_DATA_DIR);
          try { 
            await pipeline.execute(pCtx); 
            if (pCtx.payload) {
              console.log(`✨ [Priority] 수집 완료: [${pCtx.payload.brand}] ${pCtx.payload.title}`);
            }
          } finally { 
            await pPage.close(); 
            await sleep(1500);
          }
        }
        console.log(`✅ [Priority] 처리 완료. 메인 루프(Index ${i})를 재개합니다.`);
      } catch (err) {
        console.error("❌ [Priority] 처리 중 에러:", err.message);
      }
    }

    const batchIds = allItemIds.slice(i, i + BATCH_SIZE);
    try {
      await handleBatch(batchIds, i, totalItems, pipeline, browserContext);
      
      i += batchIds.length;
      await redis.set(PROGRESS_KEY, i);
      await prisma.crawlerStatus.update({ 
        where: { id: 'singleton' }, 
        data: { currentIndex: i, lastHeartbeat: new Date() } 
      }).catch(() => {});
      
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        console.error("🔄 세션 만료 감지. 재로그인을 시도합니다...");
        const loginPage = await browserContext.newPage();
        try {
          await checkLogin(loginPage);
        } catch (lerr) {
          console.error("❌ 재로그인 실패. 10분 대기 후 프로세스 재시작...");
          await browserContext.close();
          await sleep(600000);
          process.exit(1);
        } finally {
          await loginPage.close();
        }
        continue;
      }

      if (err instanceof BlockDetectedError) {
        console.error(`🔥 Blocked: ${err.message}. Waiting 10 mins...`);
        await browserContext.close();
        await sleep(600000);
        browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, { 
          headless: true,
          args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
        });
        continue;
      }

      console.error(`❌ Batch Error (Index ${i}):`, err.message);
      i += batchIds.length;
      await sleep(5000);
    }
  }

  console.log("🏁 파이프라인 전 공정 완료.");
  await browserContext.close();
  await prisma.$disconnect();
  await redis.quit();
}

run();
