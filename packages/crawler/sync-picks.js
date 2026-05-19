const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// 보조 함수: 랜덤 지연 (Stealth Mode)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

async function scrapeDailyPicks() {
  // Stealth 브라우저 설정
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'] 
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('🚀 EveryUniv 추천 PICK 수집 시작 (Stealth Mode)...');
    
    // 1. 페이지 접속
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });
    await randomSleep(2000, 4000); // 인간미 있는 대기

    // 2. 스크롤을 통해 레이지 로딩된 아이템들 활성화 (24개를 찾기 위해)
    console.log('🖱️ 추가 아이템 확보를 위한 스크롤링 중...');
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 1000));
      }
    });
    await randomSleep(2000, 3000);

    // 3. 추천 PICK 섹션 상품 ID 추출 (24개 타겟)
    const pickIds = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      const ids = links
        .map(a => a.href.split('/item/')[1]?.split('?')[0])
        .filter(id => id && /^\d+$/.test(id));
      
      // 중복 제거 후 상위 24개 추출
      return [...new Set(ids)].slice(0, 24);
    });

    console.log(`✅ ${pickIds.length}개의 추천 상품 ID 발견:`, pickIds);

    if (pickIds.length === 0) {
      console.error('❌ 추천 상품을 찾을 수 없습니다.');
      return;
    }

    // 4. DB 동기화 (기존 데이터 초기화 후 천천히 삽입)
    await prisma.dailyPick.deleteMany({});
    console.log('🧹 기존 추천 리스트 초기화 완료.');

    for (const id of pickIds) {
      const product = await prisma.product.findUnique({ where: { id } });
      
      if (product) {
        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
      } else {
        console.log(`📡 신규 상품 감지: ${id} (임시 껍데기 생성)`);
        await prisma.product.create({
          data: { 
            id, 
            title: `수집 중... (${id})`,
            brand: 'EveryUniv'
          }
        }).catch(() => {});
        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
      }
      
      // 각 아이템 처리 사이에도 아주 짧은 지연 (DB 부하 분산)
      await sleep(100);
    }

    console.log(`✨ 총 ${pickIds.length}개의 추천 상품 동기화 완료!`);

  } catch (err) {
    console.error('❌ 수집 실패:', err.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

scrapeDailyPicks();
