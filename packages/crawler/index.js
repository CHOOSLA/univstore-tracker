require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const USER_DATA_DIR = path.join(__dirname, 'user_data');

// 랜덤 지연 함수 (Jitter)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 사이트맵을 분석하여 현재 사이트에 존재하는 모든 상품 ID를 추출합니다.
 */
async function discoverAllProductIds() {
  console.log("🔍 사이트맵(item.xml) 분석하여 전체 상품 ID 수집 중...");
  try {
    const sitemapUrl = 'https://www.univstore.com/sitemap/item.xml';
    const response = await axios.get(sitemapUrl);
    
    const parser = new XMLParser();
    const jsonObj = parser.parse(response.data);
    
    const urls = jsonObj.urlset.url.map(u => u.loc);
    const ids = urls
      .map(url => url.match(/\/item\/(\d+)/)?.[1])
      .filter(id => !!id);
      
    console.log(`✅ 총 ${ids.length}개의 상품 ID를 확보했습니다.`);
    
    // DB 로그 기록
    await prisma.systemLog.create({
      data: {
        type: 'SUCCESS',
        service: 'Crawler',
        message: `사이트맵 분석 완료. 상품 ${ids.length}개 발견.`
      }
    });

    return ids;
  } catch (err) {
    console.error("❌ 사이트맵 수집 실패:", err.message);
    await prisma.systemLog.create({
      data: {
        type: 'WARNING',
        service: 'Crawler',
        message: `사이트맵 수집 실패: ${err.message}`
      }
    });
    return [];
  }
}

/**
 * 메인 페이지에서 래플 및 타임 세일 정보를 추출합니다.
 */
async function discoverSpecials(page) {
  console.log("\n🎁 래플 및 특가 정보 탐색 중...");
  try {
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });
    
    const specials = await page.evaluate(() => {
      const results = { raffles: [], flashSales: [] };
      
      // 1. 래플 탐색 (텍스트와 구조 기반)
      const raffleElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.innerText.includes('래플') && el.className.includes('Raffle')
      );
      
      raffleElements.forEach(el => {
        results.raffles.push({
          title: el.querySelector('.title')?.innerText || '진행 중인 래플',
          brand: el.querySelector('.brand')?.innerText || 'Brand',
          entries: parseInt(el.querySelector('.entries')?.innerText.replace(/[^0-9]/g, '') || '0'),
          endsAt: new Date(Date.now() + 86400000 * 2).toISOString(), // 임시 마감일
        });
      });

      // 2. 특가(Flash Sale) 탐색
      const dealLinks = Array.from(document.querySelectorAll('a')).filter(a => 
        a.innerText.includes('특가') || a.href.includes('event')
      );

      dealLinks.forEach(a => {
        results.flashSales.push({
          title: a.innerText.trim(),
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          status: 'Ongoing'
        });
      });

      return results;
    });

    console.log(`✅ ${specials.raffles.length}개의 래플, ${specials.flashSales.length}개의 특가 발견.`);
    
    // Redis로 전송
    if (specials.raffles.length > 0 || specials.flashSales.length > 0) {
      await redis.rpush('univstore:specials_updates', JSON.stringify({
        type: 'SPECIALS',
        data: specials,
        timestamp: new Date().toISOString()
      }));
    }
  } catch (err) {
    console.error("❌ 특가 정보 수집 실패:", err.message);
  }
}

async function run() {
  // ... (브라우저 실행 동일)
  const page = await context.newPage();

  // 1. 세션 유효성 검사 및 로그인
  await checkLogin(page);

  // 2. 특가 및 래플 정보 수집 (신설)
  await discoverSpecials(page);

  // 3. 전체 상품 ID 수집 (Sitemap 기반)
  const allItemIds = await discoverAllProductIds();
  // ... (이하 동일)

  if (totalItems === 0) {
    console.log("⚠️ 수집할 상품이 없습니다. 종료합니다.");
    await context.close();
    return;
  }

  // 3. 상품 정보 및 가격 수집 루프
  for (let i = 0; i < totalItems; i++) {
    const id = allItemIds[i];
    const progress = `${i + 1}/${totalItems}`;

    // [Smart Skip] 오늘 이미 수집된 가격이 있다면 서버 부하 방지를 위해 건너뜁니다.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingHistory = await prisma.priceHistory.findFirst({
      where: {
        productId: id,
        timestamp: { gte: today }
      }
    });

    if (existingHistory) {
      continue;
    }

    // 사람의 행동 양식을 모방하기 위한 랜덤 지연 (1~3초)
    const jitter = Math.floor(Math.random() * 2000) + 1000;
    console.log(`\n[${progress}] ⏳ ${jitter/1000}초 대기 후 상품 ID ${id} 조회...`);
    await sleep(jitter);

    try {
      await page.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const itemInfo = await page.evaluate(() => {
        // 비정상적인 페이지(삭제된 상품 등) 필터링
        const bodyText = document.body.innerText;
        if (bodyText.includes('존재하지 않는 상품') || bodyText.includes('판매가 중단')) {
          return { error: 'Not available' };
        }

        const brand = document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || '';
        const name = document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음';
        
        // 정가 (originalPrice) 추출
        const originalPriceText = document.querySelector('.usItemCardInfoPrice1')?.innerText?.trim() || '0';
        
        // 학생 할인가 (price) 추출
        const studentPriceText = document.querySelector('.usItemCardInfoPrice2')?.innerText?.trim() || 
                                document.querySelector('.usItemSumValue')?.innerText?.trim() || '0';
        
        // 상품 이미지 URL 추출 (가장 정확한 상품 이미지를 찾기 위해 우선순위 적용)
        const selectors = [
          '.usItemImageSwiperSlide img',
          '.usItemImageArea img',
          '.usItemThumbnail img',
          '.usItemAreaTop img'
        ];
        
        let imageUrl = null;
        for (const selector of selectors) {
          const img = document.querySelector(selector);
          // 페이코, 토스 등 결제 아이콘이나 화살표 등은 제외
          if (img && img.src && !img.src.includes('icon') && !img.src.includes('arrow') && img.src.includes('http')) {
            imageUrl = img.src;
            break;
          }
        }
        
        // 만약 못 찾았다면 /goods/ 가 포함된 첫 번째 이미지 선택 (가장 일반적인 상품 이미지 경로)
        if (!imageUrl) {
          const goodsImg = Array.from(document.querySelectorAll('img')).find(img => img.src.includes('/goods/'));
          imageUrl = goodsImg?.src || null;
        }
        
        // 재고 상태 유추
        let stockStatus = 'In Stock';
        if (bodyText.includes('품절') || bodyText.includes('재고 없음')) {
          stockStatus = 'Out of Stock';
        } else if (bodyText.includes('남은 수량') || bodyText.includes('품절 임박')) {
          stockStatus = 'Low Stock';
        }

        // 최적 결제 혜택 추출
        const benefitElement = document.querySelector('.usPaymentDiscountSchemeInfo');
        const bestBenefit = benefitElement?.innerText?.trim() || null;
        
        const isLoggedIn = !bodyText.includes('학생인증 후 가격 확인');

        return {
          brand,
          title: name,
          originalPrice: originalPriceText.replace(/[^0-9]/g, ''),
          price: studentPriceText.replace(/[^0-9]/g, ''),
          imageUrl,
          stockStatus,
          bestBenefit,
          isLoggedIn
        };
      });

      if (itemInfo.error) {
        console.log(`❌ 상품 ${id}: 수집 불가 (존재하지 않거나 중단됨)`);
        continue;
      }

      if (!itemInfo.isLoggedIn) {
        console.log(`⚠️ 세션 만료 감지! 즉시 재로그인을 시도합니다.`);
        await loginWithEverytime(page);
        await page.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'domcontentloaded' });
        continue;
      }

      console.log(`✅ [${itemInfo.brand}] ${itemInfo.title}`);
      console.log(`💰 가격: ${parseInt(itemInfo.price).toLocaleString()}원 (정가: ${parseInt(itemInfo.originalPrice).toLocaleString()}원)`);
      console.log(`🏷️ 혜택: ${itemInfo.bestBenefit || '없음'} | 📦 상태: ${itemInfo.stockStatus}`);
      
      // DB 로그 기록
      await prisma.systemLog.create({
        data: {
          type: 'INFO',
          service: 'Crawler',
          message: `상품 수집: [${itemInfo.brand}] ${itemInfo.title}`
        }
      });

      // 4. 메시지 큐(Redis)로 데이터 전송 (확장된 페이로드)
      const payload = {
        id,
        brand: itemInfo.brand,
        title: itemInfo.title,
        price: parseInt(itemInfo.price),
        originalPrice: parseInt(itemInfo.originalPrice),
        imageUrl: itemInfo.imageUrl,
        stockStatus: itemInfo.stockStatus,
        bestBenefit: itemInfo.bestBenefit,
        timestamp: new Date().toISOString()
      };

      await redis.rpush('univstore:price_updates', JSON.stringify(payload));
      console.log(`📦 Redis Queue에 적재 완료 (처리 대기 중)`);

    } catch (err) {
      console.error(`❌ 상품 ${id} 수집 도중 에러 발생:`, err.message);
      await sleep(5000);
    }
  }

  console.log(`\n✨ 모든 상품에 대한 수집 및 큐 전송이 완료되었습니다.`);
  await context.close();
  await prisma.$disconnect();
  await redis.quit();
}

async function checkLogin(page) {
  await page.goto('https://www.univstore.com/user/login');
  const isLoginPage = await page.isVisible('input[name="userid"]');
  
  if (isLoginPage) {
    await loginWithEverytime(page);
  } else {
    console.log("✅ 기존 세션이 유효합니다.");
  }
}

async function loginWithEverytime(page) {
  console.log("🔐 에브리타임으로 자동 로그인 시도...");
  
  if (!process.env.EVERYTIME_ID || !process.env.EVERYTIME_PW) {
    throw new Error(".env 파일에 에브리타임 계정 정보가 설정되지 않았습니다.");
  }

  try {
    await page.goto('https://www.univstore.com/user/login', { waitUntil: 'networkidle' });
    
    console.log("🖱️ 에브리타임 로그인 버튼 클릭 중...");
    const loginBtn = page.locator('.usEverytimeLoginTitle');
    await loginBtn.waitFor({ state: 'visible', timeout: 5000 });
    await loginBtn.click();
    
    // 에브리타임 SSO 페이지 로드 대기
    console.log("⏳ 에브리타임 인증 페이지 대기 중...");
    await page.waitForSelector('input[name="id"]', { timeout: 30000, state: 'visible' });

    console.log("✍️ 계정 정보 입력 중...");
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    
    console.log("🚀 로그인 제출 중...");
    await page.click('input[type="submit"]');
    
    // 리다이렉트 대기
    await page.waitForTimeout(5000);
    await page.waitForURL(url => url.href.includes('univstore.com'), { timeout: 60000 });
    console.log("🎉 자동 로그인 성공!");
  } catch (err) {
    console.error("❌ 자동 로그인 실패:", err.message);
    await page.screenshot({ path: 'login_error.png' });
    throw err;
  }
}

run().catch(err => {
  console.error("🔥 실행 중 치명적 에러:", err);
  process.exit(1);
});
