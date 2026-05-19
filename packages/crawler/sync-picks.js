const { chromium } = require('playwright');
const { prisma, redis, Pipeline, CrawlerContext, USER_DATA_DIR, sleep, checkLogin, SessionExpiredError, BlockDetectedError } = require('./lib/engine');
const { 
  DBStateFilter, NavigationFilter, ExtractionFilter, 
  ValidationFilter, StorageFilter, SessionCheckFilter 
} = require('./lib/filters');
require('dotenv').config();

const randomSleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function scrapeDailyPicks() {
  console.log('🚀 EVERYUNIV 추천 PICK 우선순위 수집 시작...');
  
  const browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, { 
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] 
  });

  const page = await browserContext.newPage();

  try {
    // 초기 세션 체크 및 로그인
    await checkLogin(page);

    console.log("🔍 추천 상품 목록 탐색 중...");
    const response = await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });
    
    // 차단 여부 체크
    if (response.status() === 403 || response.status() === 429 || response.status() === 405) {
      throw new BlockDetectedError(`메인 페이지 접근 차단됨 (HTTP ${response.status()})`, response.status());
    }

    await randomSleep(2000, 4000);

    // 24개 상품 ID 추출
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) { window.scrollBy(0, 800); await new Promise(r => setTimeout(r, 1000)); }
    });

    const pickIds = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      return [...new Set(links.map(a => a.href.split('/item/')[1]?.split('?')[0]).filter(id => id && /^\d+$/.test(id)))].slice(0, 24);
    });

    if (pickIds.length === 0) {
      console.warn("⚠️ 추천 상품을 발견하지 못했습니다. (구조 변경 또는 세션 이슈 가능성)");
    } else {
      console.log(`✅ ${pickIds.length}개의 추천 상품 ID 발견.`);
    }

    await prisma.dailyPick.deleteMany({});

    const pipeline = new Pipeline([
      new DBStateFilter(),
      new NavigationFilter(),
      new SessionCheckFilter(),
      new ExtractionFilter(),
      new ValidationFilter(),
      new StorageFilter()
    ]);

    for (let i = 0; i < pickIds.length; i++) {
      const id = pickIds[i];
      const pickPage = await browserContext.newPage();
      const ctx = new CrawlerContext(id, i, pickIds.length, pickPage, browserContext, USER_DATA_DIR);
      
      let retryCount = 0;
      const MAX_RETRIES = 2;

      while (retryCount <= MAX_RETRIES) {
        try {
          await pipeline.execute(ctx);
          await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
          if (ctx.payload) console.log(`✨ [Priority] 수집 완료: [${ctx.payload.brand}] ${ctx.payload.title}`);
          break;
        } catch (err) {
          if (err instanceof SessionExpiredError && retryCount < MAX_RETRIES) {
            console.error(`🔄 [ID ${id}] 세션 만료 감지. 재로그인 시도 (${retryCount + 1}/${MAX_RETRIES})...`);
            const loginPage = await browserContext.newPage();
            await checkLogin(loginPage);
            await loginPage.close();
            retryCount++;
            continue;
          }
          
          if (err instanceof BlockDetectedError) {
            console.error(`🔥 [ID ${id}] 차단 감지: ${err.message}. 잠시 대기...`);
            await sleep(60000); // 1분 대기 후 다음으로
          } else {
            console.error(`❌ [ID ${id}] 수집 실패:`, err.message);
          }
          
          await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
          break;
        }
      }
      await pickPage.close();
    }

    console.log(`🏁 추천 PICK 동기화 공정 완료.`);
  } catch (err) {
    if (err instanceof BlockDetectedError) {
      console.error(`🔥 치명적 차단 발생: ${err.message}. 수집을 중단합니다.`);
    } else {
      console.error('❌ 치명적 에러:', err.message);
    }
  } finally {
    await browserContext.close();
    await prisma.$disconnect();
    await redis.quit();
  }
}

scrapeDailyPicks();
