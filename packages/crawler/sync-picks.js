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
    await randomSleep(2000, 4000);

    // 2. 스크롤링
    console.log('🖱️ 추가 아이템 확보를 위한 스크롤링 중...');
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 1000));
      }
    });
    await randomSleep(2000, 3000);

    // 3. 추천 PICK 섹션 상품 ID 추출
    const pickIds = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      const ids = links
        .map(a => a.href.split('/item/')[1]?.split('?')[0])
        .filter(id => id && /^\d+$/.test(id));
      return [...new Set(ids)].slice(0, 24);
    });

    console.log(`✅ ${pickIds.length}개의 추천 상품 ID 발견:`, pickIds);

    if (pickIds.length === 0) return;

    // 4. DB 동기화
    await prisma.dailyPick.deleteMany({});
    
    // 5. 추천 상품별 즉시 수집 (Priority Sync)
    console.log('⚡ 추천 상품 정보 즉시 수집 시작...');
    
    for (const id of pickIds) {
      const product = await prisma.product.findUnique({ where: { id } });
      
      // 이미 정보가 있는 경우 DailyPick만 등록
      if (product && product.title !== `수집 중... (${id})` && product.imageUrl) {
        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
        continue;
      }

      // 정보가 없거나 '수집 중'인 경우 즉시 수집
      console.log(`🔍 [Priority] 신규 추천 상품 상세 정보 수집 중: ${id}`);
      try {
        await page.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'domcontentloaded' });
        await randomSleep(1500, 3000);

        const itemInfo = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script'));
          const dataScript = scripts.find(s => s.innerText.includes('window.__INITIAL_STATE__'));
          let apiData = null;
          if (dataScript) {
            try {
              const match = dataScript.innerText.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/);
              if (match) apiData = JSON.parse(match[1])?.item?.item;
            } catch (e) {}
          }

          const name = apiData?.front_name || document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음';
          const brand = apiData?.brand_name || document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || 'EveryUniv';
          let imageUrl = apiData?.thumbnail_url || null;
          
          if (!imageUrl) {
             const img = document.querySelector('.usItemImageArea img') || document.querySelector('.usItemThumbnail img');
             if (img) imageUrl = img.src;
          }

          const price = apiData?.price || document.querySelector('.usItemCardInfoPriceCurrent')?.innerText?.replace(/[^0-9]/g, '') || '0';
          const originalPrice = apiData?.market_price || document.querySelector('.usItemCardInfoPriceOriginal')?.innerText?.replace(/[^0-9]/g, '') || price;

          return { title: name, brand, imageUrl, price: parseInt(price), originalPrice: parseInt(originalPrice) };
        });

        // 상품 정보 업데이트 또는 생성
        await prisma.product.upsert({
          where: { id },
          update: {
            title: itemInfo.title,
            brand: itemInfo.brand,
            imageUrl: itemInfo.imageUrl,
            originalPrice: itemInfo.originalPrice,
            updatedAt: new Date()
          },
          create: {
            id,
            title: itemInfo.title,
            brand: itemInfo.brand,
            imageUrl: itemInfo.imageUrl,
            originalPrice: itemInfo.originalPrice
          }
        });

        // 첫 가격 이력 생성 (그래프를 위해)
        if (itemInfo.price > 0) {
          await prisma.priceHistory.create({
            data: { productId: id, price: itemInfo.price }
          }).catch(() => {});
        }

        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
        console.log(`✅ 수집 완료: [${itemInfo.brand}] ${itemInfo.title}`);

      } catch (err) {
        console.error(`❌ 상품 ${id} 수집 실패:`, err.message);
        // 실패해도 DailyPick은 등록 (나중에 메인 크롤러가 처리하도록)
        await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
      }
    }

    console.log(`✨ 총 ${pickIds.length}개의 추천 상품 동기화 및 우선 수집 완료!`);

  } catch (err) {
    console.error('❌ 수집 실패:', err.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

scrapeDailyPicks();
