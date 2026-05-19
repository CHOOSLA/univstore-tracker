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
    const rawItemIds = await discoverAllProductIds(initPage);
    
    const dailyPicks = await prisma.dailyPick.findMany({ select: { productId: true } });
    const priorityIds = dailyPicks.map(p => p.productId);
    allItemIds = [...priorityIds, ...rawItemIds.filter(id => !priorityIds.includes(id))];
    totalItems = allItemIds.length;
    await initContext.close();
  } catch (err) {
    if (err instanceof BlockDetectedError) {
      console.error(`🔥 초기화 단계 차단 감지: ${err.message}. 10분 대기...`);
      await initContext.close();
      await sleep(600000);
      process.exit(1); // PM2가 나중에 다시 시도하도록
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
    const batchIds = allItemIds.slice(i, i + BATCH_SIZE);
    try {
      await Promise.all(batchIds.map(async (id, idx) => {
        const batchPage = await browserContext.newPage();
        const ctx = new CrawlerContext(id, i + idx, totalItems, batchPage, browserContext, USER_DATA_DIR);
        try { await pipeline.execute(ctx); } finally { await batchPage.close(); }
      }));
      
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
        await checkLogin(loginPage);
        await loginPage.close();
        continue;
      }

      if (err instanceof BlockDetectedError) {
        console.error(`🔥 Blocked: ${err.message}. Waiting 5 mins...`);
        await browserContext.close();
        await sleep(300000);
        browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, { 
          headless: true,
          args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
        });
        continue;
      }

      console.error(`❌ Batch Error (Index ${i}):`, err.message);
      i += batchIds.length;
      await sleep(2000);
    }
  }

  console.log("🏁 파이프라인 전 공정 완료.");
  await browserContext.close();
  await prisma.$disconnect();
  await redis.quit();
}

run();
