const { chromium } = require('playwright');
const { prisma, redis, Pipeline, CrawlerContext, USER_DATA_DIR, sleep } = require('./lib/engine');
const { DBStateFilter, NavigationFilter, ExtractionFilter, ValidationFilter, StorageFilter } = require('./lib/filters');
require('dotenv').config();

const randomSleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function scrapeDailyPicks() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'] 
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log('🚀 EVERYUNIV 추천 PICK 우선순위 수집 시작...');
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });
    await randomSleep(2000, 4000);

    // 24개 상품 ID 추출
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) { window.scrollBy(0, 800); await new Promise(r => setTimeout(r, 1000)); }
    });

    const pickIds = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      return [...new Set(links.map(a => a.href.split('/item/')[1]?.split('?')[0]).filter(id => id && /^\d+$/.test(id)))].slice(0, 24);
    });

    console.log(`✅ ${pickIds.length}개의 추천 상품 ID 발견.`);
    await prisma.dailyPick.deleteMany({});

    // 공통 파이프라인 엔진 사용 (리팩토링의 핵심)
    const pipeline = new Pipeline([
      new DBStateFilter(),
      new NavigationFilter(),
      new ExtractionFilter(),
      new ValidationFilter(),
      new StorageFilter()
    ]);

    for (let i = 0; i < pickIds.length; i++) {
      const id = pickIds[i];
      const pickPage = await context.newPage();
      const ctx = new CrawlerContext(id, i, pickIds.length, pickPage, context, USER_DATA_DIR);
      
      try {
        await pipeline.execute(ctx);
        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
        if (ctx.payload) console.log(`✨ [Priority] 수집 완료: [${ctx.payload.brand}] ${ctx.payload.title}`);
      } catch (err) {
        console.error(`❌ [ID ${id}] 수집 실패:`, err.message);
        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
      } finally {
        await pickPage.close();
      }
    }

    console.log(`🏁 추천 PICK 동기화 공정 완료.`);
  } catch (err) {
    console.error('❌ 치명적 에러:', err.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
    await redis.quit();
  }
}

scrapeDailyPicks();
