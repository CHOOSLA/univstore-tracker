require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const USER_DATA_DIR = path.join(__dirname, 'user_data');

// 랜덤 지연 함수 (Jitter) - 사이트의 자동화 감지를 피하기 위함
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 탐색할 카테고리 리스트 (예: Apple, 삼성전자 등)
const CATEGORY_URLS = [
  'https://www.univstore.com/item/list?category=102000000000000000000000000000000000000', // Apple
  'https://www.univstore.com/item/list?category=103000000000000000000000000000000000000'  // 삼성전자
];

async function run() {
  // 브라우저 실행 설정 (우분투 서버 환경을 위해 headless: true가 기본)
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--lang=ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    ]
  });

  const page = await context.newPage();

  // 1. 세션 유효성 검사 및 로그인
  await checkLogin(page);

  // 2. 동적 상품 ID 수집 (Discovery Phase)
  console.log("\n🔎 카테고리별 신규 상품 탐색 시작...");
  const discoveredIds = new Set();
  
  for (const url of CATEGORY_URLS) {
    console.log(`🌐 카테고리 페이지 분석 중: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // 페이지 내의 모든 상품 링크(/item/숫자) 추출
    const ids = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      return links
        .map(a => a.href.match(/\/item\/(\d+)/)?.[1])
        .filter(id => !!id);
    });
    
    ids.forEach(id => discoveredIds.add(id));
    console.log(`✅ 현재 페이지에서 ${ids.length}개의 상품 발견 (누적: ${discoveredIds.size}개)`);
    
    // 카테고리 이동 시에도 잠깐의 휴식
    await sleep(2000);
  }

  const finalItemIds = Array.from(discoveredIds);
  const totalItems = finalItemIds.length;
  console.log(`\n🚀 총 ${totalItems}개의 상품에 대해 가격 수집을 시작합니다.`);

  // 3. 상품 정보 및 가격 수집
  for (let i = 0; i < totalItems; i++) {
    const id = finalItemIds[i];
    const progress = `${i + 1}/${totalItems}`;
    
    // 사람처럼 보이게 하기 위한 랜덤 지연 (2~5초)
    const jitter = Math.floor(Math.random() * 3000) + 2000;
    console.log(`\n[${progress}] ⏳ ${jitter/1000}초 대기 후 상품 ID ${id} 조회...`);
    await sleep(jitter);

    try {
      await page.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'networkidle' });
      
      const itemInfo = await page.evaluate(() => {
        const brand = document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || '';
        const name = document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음';
        const price = document.querySelector('.usItemCardInfoPrice2')?.innerText?.trim() || 
                      document.querySelector('.usItemSumValue')?.innerText?.trim() || '0';
        
        const isLoggedIn = !document.body.innerText.includes('학생인증 후 가격 확인');

        return {
          title: brand ? `[${brand}] ${name}` : name,
          price: price.replace(/[^0-9]/g, ''), // 숫자만 추출
          isLoggedIn
        };
      });

      if (!itemInfo.isLoggedIn) {
        console.log(`⚠️ 세션이 만료된 것 같습니다. 다시 로그인을 시도합니다.`);
        await loginWithEverytime(page);
        await page.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'networkidle' });
        // 재시도 후 다시 정보를 가져오는 로직 (생략)
      }

      console.log(`✅ 상품명: ${itemInfo.title}`);
      const priceNum = parseInt(itemInfo.price);
      console.log(`💰 가격: ${priceNum.toLocaleString()}원`);
      
      // 3. 데이터베이스 저장 (Prisma)
      await prisma.product.upsert({
        where: { id: id },
        update: { title: itemInfo.title },
        create: { id: id, title: itemInfo.title }
      });

      await prisma.priceHistory.create({
        data: {
          productId: id,
          price: priceNum
        }
      });
      console.log(`💾 DB 저장 완료`);

    } catch (err) {
      console.error(`❌ 상품 ${id} 수집 중 에러 발생:`, err.message);
    }
  }

  console.log(`\n✨ 모든 데이터 수집 및 DB 저장 완료`);
  await context.close();
  await prisma.$disconnect();
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
    try {
      // 입력 필드 대기 (이름이 'id'인 것을 확인했습니다)
      await page.waitForSelector('input[name="id"]', { timeout: 30000, state: 'visible' });
    } catch (e) {
      console.log("❌ 인증 페이지 요소를 찾지 못했습니다. 현재 URL:", page.url());
      await page.screenshot({ path: 'auth_page_error.png', fullPage: true });
      throw e;
    }

    console.log("✍️ 계정 정보 입력 중...");
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    
    // 로그인 제출
    console.log("🚀 로그인 제출 중...");
    await page.click('input[type="submit"]');
    
    // 리다이렉트 전 잠깐 대기하며 상태 확인
    await page.waitForTimeout(5000);
    console.log("📍 현재 URL:", page.url());
    await page.screenshot({ path: 'after_submit.png', fullPage: true });

    // 학생복지스토어로 리다이렉트 대기 (로그인 성공 시)
    console.log("🚀 리다이렉트 대기 중...");
    try {
      // 좀 더 유연한 URL 매칭과 충분한 시간 부여
      await page.waitForURL(url => url.href.includes('univstore.com'), { timeout: 60000 });
      console.log("🎉 자동 로그인 성공!");
    } catch (e) {
      console.log("❌ 리다이렉트 타임아웃. 현재 페이지 내용을 확인하세요.");
      throw e;
    }
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
