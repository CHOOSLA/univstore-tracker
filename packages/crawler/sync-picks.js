const { chromium } = require('playwright');
const { prisma, redis, sleep, BlockDetectedError } = require('./lib/engine');
require('dotenv').config();

const PRIORITY_KEY = 'univstore:priority_set';
const randomSleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function scoutDailyPicks() {
  console.log('🕵️ [Scout] EVERYUNIV 추천 PICK 탐색 시작 (Incognito Mode)...');
  const fs = require('fs');
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined;
  
  // 세션(USER_DATA_DIR)을 사용하지 않고 순수 브라우저로 실행하여 충돌 방지
  const browser = await chromium.launch({ 
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--use-gl=desktop',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    ] 
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log("🔍 추천 상품 목록 스캔 중...");
    const response = await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });
    
    if (response.status() === 403 || response.status() === 429 || response.status() === 405) {
      throw new BlockDetectedError(`[Scout] 메인 페이지 접근 차단됨 (HTTP ${response.status()})`, response.status());
    }

    await randomSleep(2000, 4000);

    // 가상 스크롤로 상품 로드 유도
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) { window.scrollBy(0, 800); await new Promise(r => setTimeout(r, 1000)); }
    });

    const pickIds = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      return [...new Set(links.map(a => a.href.split('/item/')[1]?.split('?')[0]).filter(id => id && /^\d+$/.test(id)))].slice(0, 24);
    });

    if (pickIds.length === 0) {
      console.warn("⚠️ [Scout] 추천 상품을 발견하지 못했습니다.");
      return;
    }

    console.log(`✅ [Scout] ${pickIds.length}개의 추천 상품 발견. 우선순위 큐로 전송 중...`);

    // 1. DB DailyPick 업데이트 (UI용)
    await prisma.dailyPick.deleteMany({});
    for (const id of pickIds) {
      await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
    }

    // 2. Redis Priority Queue에 추가 (ZSET 기반 새치기)
    if (pickIds.length > 0) {
      const { enqueueTasks } = require('./lib/engine');
      await enqueueTasks(pickIds, true);
    }

    console.log(`🏁 [Scout] 탐색 공정 완료. (ID 큐 전송 완료)`);
  } catch (err) {
    console.error('❌ [Scout] 치명적 에러:', err.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
    await redis.quit();
  }
}

scoutDailyPicks();
