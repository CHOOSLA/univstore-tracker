require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// --- [DB 재연결 헬퍼 함수] ---
async function withPrismaRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectionError = err.message.includes('closed') || err.message.includes('connection') || err.message.includes('Server has closed');
      if (isConnectionError && i < retries - 1) {
        console.log(`⚠️ DB 연결 유실 감지 (시도 ${i + 1}/${retries}). 5초 후 재시도...`);
        await prisma.$disconnect().catch(() => {});
        await sleep(5000);
        continue;
      }
      throw err;
    }
  }
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const USER_DATA_DIR = path.join(__dirname, 'user_data');

// 랜덤 지연 함수 (Jitter)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 사이트맵을 분석하여 현재 사이트에 존재하는 모든 상품 ID를 추출합니다.
 */
async function discoverAllProductIds(page) {
  console.log("🔍 사이트맵(item.xml) 분석하여 전체 상품 ID 수집 중...");
  try {
    const sitemapUrl = 'https://www.univstore.com/sitemap/item.xml';
    await page.goto(sitemapUrl, { waitUntil: 'networkidle', timeout: 90000 });

    const rawContent = await page.content();
    if (!rawContent.includes('<urlset')) {
      const textData = await page.evaluate(() => document.documentElement.textContent);
      return parseXmlAndExtractIds(textData);
    }
    const xmlMatch = rawContent.match(/<\?xml[\s\S]*<\/urlset>/i) || rawContent.match(/<urlset[\s\S]*<\/urlset>/i);
    const xmlData = xmlMatch ? xmlMatch[0] : rawContent;
    return parseXmlAndExtractIds(xmlData);
  } catch (err) {
    console.error("❌ 사이트맵 수집 실패:", err.message);
    return [];
  }
}

function parseXmlAndExtractIds(xmlString) {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, alwaysCreateTextNode: false });
    const jsonObj = parser.parse(xmlString);
    if (!jsonObj.urlset || !jsonObj.urlset.url) return [];
    const urlArray = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];
    const ids = urlArray.map(u => {
      const loc = typeof u.loc === 'string' ? u.loc : (u.loc?.['#text'] || '');
      return loc.match(/\/item\/(\d+)/)?.[1];
    }).filter(id => !!id);
    console.log(`✅ 총 ${ids.length}개의 상품 ID를 확보했습니다.`);
    return ids;
  } catch (err) {
    console.error("❌ XML 파싱 에러:", err.message);
    return [];
  }
}

async function discoverSpecials(page) {
  console.log("\n🎁 래플 및 특가 정보 탐색 중...");
  try {
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    const specials = await page.evaluate(() => {
      const results = { raffles: [], flashSales: [] };
      const raffleLinks = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/raffle') || (a.innerText.includes('래플') && a.innerText.length < 20));
      raffleLinks.forEach(a => {
        results.raffles.push({ title: a.innerText.trim() || '진행 중인 래플', brand: 'Event', entries: 0, endsAt: new Date(Date.now() + 86400000 * 2).toISOString() });
      });
      const ignoreKeywords = ['혜택/이벤트', '로그인', '더보기', '회원가입', '장바구니', '마이페이지', '일기', '로조', '확인하기', '구매하기', '공지사항', '쿠폰'];
      const dealLinks = Array.from(document.querySelectorAll('.usShortcut, .usMainBanner a, a')).filter(a => {
        const text = a.innerText.trim().replace(/\s+/g, ' ');
        const isSpecial = text.includes('특가') || text.includes('SALE') || text.includes('할인');
        const isIdealLength = text.length >= 2 && text.length <= 15;
        const isMenu = ignoreKeywords.some(k => text.includes(k));
        return isSpecial && isIdealLength && !isMenu;
      });
      const uniqueDeals = new Map();
      dealLinks.forEach(a => {
        const title = a.innerText.trim();
        if (!uniqueDeals.has(title)) uniqueDeals.set(title, { title: title, startTime: new Date().toISOString(), endTime: new Date(Date.now() + 86400000).toISOString(), status: 'Ongoing' });
      });
      results.flashSales = Array.from(uniqueDeals.values());
      return results;
    });
    if (specials.raffles.length > 0 || specials.flashSales.length > 0) {
      await redis.rpush('univstore:specials_updates', JSON.stringify({ type: 'SPECIALS', data: specials, timestamp: new Date().toISOString() }));
    }
  } catch (err) {}
}

async function run() {
  // 초기 스캔용 임시 브라우저
  const initContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const initPage = await initContext.newPage();
  await checkLogin(initPage);
  await discoverSpecials(initPage);

  const allItemIds = await discoverAllProductIds(initPage);
  const totalItems = allItemIds.length;

  await initContext.close(); // 초기 스캔 종료 후 닫기

  if (totalItems === 0) {
    console.log("⚠️ 수집할 상품이 없습니다.");
    return;
  }

  // --- [진행 이력 로드 (Redis)] ---
  const PROGRESS_KEY = `univstore:progress:${new Date().toISOString().split('T')[0]}`;
  let startIndex = parseInt(await redis.get(PROGRESS_KEY) || '0');
  if (startIndex >= totalItems) startIndex = 0;

  console.log(`\n🕵️ 순차적 스텔스 모드 기동 (Index: ${startIndex}/${totalItems})`);

  let context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  let page = await context.newPage();
  await checkLogin(page);
  
  let processedCount = 0;

  for (let i = startIndex; i < totalItems; i++) {
    const id = allItemIds[i];
    const progress = `${i + 1}/${totalItems}`;

    // --- [브라우저 리소스 관리: 500개마다 세션 리프레시] ---
    if (processedCount > 0 && processedCount % 500 === 0) {
      console.log(`\n♻️  메모리 최적화를 위해 브라우저를 재시작합니다... (${processedCount}개 처리 완료)`);
      await context.close();
      await sleep(5000);
      context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
      page = await context.newPage();
      await checkLogin(page);
    }

    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      
      // 1. 현재 상품의 DB 상태 확인 (필요한 필드만 선택하여 최적화)
      const productStatus = await withPrismaRetry(() => prisma.product.findUnique({
        where: { id },
        select: {
          title: true,
          imageUrl: true,
          category: true,
          brand: true,
          priceHistory: { 
            where: { timestamp: { gte: today } }, 
            take: 1,
            select: { price: true }
          }
        }
      }));

      // 오늘 이미 가격 수집이 끝났고, 기본 정보(이름, 이미지, 카테고리)도 완벽하면 패스
      const hasBasicInfo = productStatus && 
                           productStatus.title !== '이름 없음' && 
                           productStatus.imageUrl && 
                           productStatus.category; // 카테고리(태그) 유무까지 완벽히 체크
      const hasTodayPrice = productStatus && productStatus.priceHistory.length > 0;

      if (hasBasicInfo && hasTodayPrice) {
        if (i % 100 === 0) console.log(`⏭️ [${progress}] 완벽한 데이터 (Skipped)`);
        await redis.set(PROGRESS_KEY, i + 1);
        continue;
      }

      // 복구 모드 여부 결정
      const isRecoveryMode = !hasBasicInfo;
      if (isRecoveryMode) {
        console.log(`\n🔍 [${progress}] 데이터 유실 발견 (ID: ${id}) - 정밀 복구 모드 가동`);
      }

      // --- [지터 및 대기 전략 타이트닝] ---
      const jitter = isRecoveryMode ? 2500 : 1200; 
      const randomWait = Math.floor(Math.random() * (isRecoveryMode ? 1500 : 800));
      await sleep(jitter + randomWait);

      const res = await page.goto(`https://www.univstore.com/item/${id}`, { 
        waitUntil: 'domcontentloaded', // 기본은 domcontentloaded로 통일 (속도 향상)
        timeout: 30000 
      });

      // 복구 모드일 때만 이미지가 뜰 때까지 '타겟 대기' (networkidle 대신 사용)
      if (isRecoveryMode) {
        await page.waitForSelector('.usItemImageArea img', { timeout: 5000 }).catch(() => {});
      }

      const bodyText = await page.evaluate(() => document.body.innerText);
      const pageTitle = await page.title();

      // 🚨 차단 감지 (403, 405, 429 등)
      const status = res.status();
      if (status === 403 || status === 405 || status === 429 || pageTitle.includes('Verification') || bodyText.includes('confirm you are human')) {
        const cooldownMins = 30;
        console.error(`\n🔥 [BLOCK DETECTED] 서버 차단 징후 감지 (Status: ${status}, ID: ${id})`);
        console.log(`⏳ ${cooldownMins}분 동안 수집을 일시 중지하고 대기합니다...`);
        
        await withPrismaRetry(() => prisma.systemLog.create({
          data: {
            type: 'WARNING',
            service: 'Crawler',
            message: `차단 감지(Status ${status}). ${cooldownMins}분 대기 모드 진입. (ID: ${id})`
          }
        })).catch(() => {});

        await sleep(cooldownMins * 60 * 1000); // 30분 대기
        
        // 대기 후 브라우저를 다시 껐다 켜서 깨끗한 상태로 시작
        processedCount = 500; // 다음 루프에서 재시작 트리거
        i--; continue; // 현재 아이템 재시도
      }

      const itemInfo = await page.evaluate(async ({ id, recovery }) => {
        const body = document.body.innerText;
        const html = document.body.innerHTML;
        if (body.includes('존재하지 않는 상품') || body.includes('판매가 중단')) return { error: 'Not available' };

        // --- [내부 API를 통한 고품질 메타데이터 추출 추가] ---
        let apiData = null;
        try {
          const res = await fetch(`https://www.univstore.com/api/item/${id}`);
          apiData = await res.json();
        } catch (e) {
          console.error("API Fetch 실패:", e.message);
        }

        const price = (document.querySelector('.usItemCardInfoPrice2')?.innerText || 
                       document.querySelector('.usItemSumValue')?.innerText || '0').replace(/[^0-9]/g, '');
        
        // --- [재고 상태 판별 로직 정교화] ---
        const infoArea = document.querySelector('.usItemAreaTop')?.innerText || '';
        const sumArea = document.querySelector('.usItemSumArea')?.innerText || '';
        const statusText = (infoArea + ' ' + sumArea).replace(/\s+/g, ' ');
        const isSoldOut = statusText.includes('품절') || statusText.includes('재고 없음') || statusText.includes('판매중지');

        const isLoggedIn = !html.includes('학생인증 후 가격 확인');
        const originalPrice = document.querySelector('.usItemCardInfoPrice1')?.innerText?.replace(/[^0-9]/g, '') || price;
        const bestBenefit = document.querySelector('.usPaymentDiscountSchemeInfo')?.innerText?.trim() || null;

        // 복구 모드일 때만 비싼 연산(DOM 탐색) 수행
        let brand = apiData?.brand_name || '', 
            name = apiData?.front_name || '이름 없음', 
            imageUrl = apiData?.thumbnail_url || null;

        if (recovery && !imageUrl) {
          // 1순위: 특정 상품 컨테이너
          const productContainers = ['.usItemImageArea', '.usItemAreaTop', '.usItemThumbnail'];
          for (const sel of productContainers) {
            const container = document.querySelector(sel);
            if (container) {
              const img = container.querySelector('img');
              if (img && img.src.includes('http')) { imageUrl = img.src; break; }
            }
          }
          
          // 2순위: 페이지 내 가장 큰 정방향 이미지 (정밀 복구)
          if (!imageUrl) {
            const allImages = Array.from(document.querySelectorAll('img'));
            const candidate = allImages
              .filter(img => {
                const src = img.src.toLowerCase();
                const isIcon = src.includes('icon') || src.includes('logo') || src.includes('arrow') || src.includes('btn_') || src.includes('banner');
                return src.includes('http') && !isIcon;
              })
              .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))[0];
            
            if (candidate && candidate.naturalWidth > 200) {
              imageUrl = candidate.src;
            }
          }
        }

        return { 
          brand, 
          title: name, 
          price, 
          originalPrice, 
          imageUrl, 
          isLoggedIn, 
          isSoldOut, 
          bestBenefit,
          category: apiData?.item_category_name || null,
          subCategory: apiData?.brand_item_category_name || null
        };
      }, { id, recovery: isRecoveryMode });

      if (!itemInfo.isLoggedIn) {
        console.log("🔑 세션 만료. 재로그인 중...");
        await checkLogin(page);
        i--; continue;
      }

      // --- [데이터 품질 체크 및 이슈 기록 복구] ---
      const priceNum = parseInt(itemInfo.price);
      const issues = [];
      if (isNaN(priceNum) || priceNum <= 0) issues.push({ type: 'INVALID_PRICE', message: `가격 오류: ${itemInfo.price}` });
      if (isRecoveryMode && (!itemInfo.brand || itemInfo.title === '이름 없음')) issues.push({ type: 'MISSING_TITLE', message: '제목/브랜드 누락' });
      if (isRecoveryMode && !itemInfo.imageUrl) issues.push({ type: 'MISSING_IMAGE', message: '이미지 누락' });

      if (issues.length > 0) {
        console.log(`⚠️ [ID ${id}] Issue: ${issues.map(it => it.type).join(', ')}`);
        for (const issue of issues) {
          await withPrismaRetry(() => prisma.dataIssue.upsert({
            where: { productId_type: { productId: id, type: issue.type } },
            update: { message: issue.message, details: JSON.stringify(itemInfo), timestamp: new Date() },
            create: { productId: id, type: issue.type, message: issue.message, details: JSON.stringify(itemInfo) }
          })).catch(() => {});
        }
        if (issues.some(i => i.type === 'INVALID_PRICE')) continue;
      }

      if (priceNum > 0) {
        const payload = {
          id, 
          brand: isRecoveryMode ? itemInfo.brand : productStatus.brand,
          title: isRecoveryMode ? itemInfo.title : productStatus.title,
          price: priceNum,
          originalPrice: parseInt(itemInfo.originalPrice),
          imageUrl: isRecoveryMode ? itemInfo.imageUrl : productStatus.imageUrl,
          stockStatus: itemInfo.isSoldOut ? 'Out of Stock' : 'In Stock',
          bestBenefit: itemInfo.bestBenefit || (productStatus ? productStatus.bestBenefit : null),
          category: itemInfo.category || (productStatus ? productStatus.category : null),
          subCategory: itemInfo.subCategory || (productStatus ? productStatus.subCategory : null),
          timestamp: new Date().toISOString()
        };
        
        await redis.rpush('univstore:price_updates', JSON.stringify(payload));
        
        if (isRecoveryMode) {
          console.log(`✅ [${progress}] 데이터 복구 완료: [${payload.brand}] ${payload.title}`);
        } else {
          console.log(`✅ [${progress}] 가격 갱신: ₩${payload.price.toLocaleString()}`);
        }
      }

      await redis.set(PROGRESS_KEY, i + 1);
      await redis.expire(PROGRESS_KEY, 86400);
      processedCount++;

    } catch (err) {
      console.error(`❌ [${progress}] ID ${id} 에러:`, err.message);
    }
  }

  console.log("\n✨ 오늘치 작업 완료.");
  await context.close();
  await prisma.$disconnect();
  await redis.quit();
}

async function checkLogin(page) {
  await page.goto('https://www.univstore.com/user/login');
  if (await page.isVisible('input[name="userid"]')) {
    const loginBtn = page.locator('.usEverytimeLoginTitle');
    await loginBtn.click();
    await page.waitForSelector('input[name="id"]', { timeout: 30000 });
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    await page.click('input[type="submit"]');
    await page.waitForURL(url => url.href.includes('univstore.com'), { timeout: 60000 });
    console.log("🎉 로그인 성공!");
  }
}

run().catch(err => {
  console.error("🔥 치명적 에러:", err);
  process.exit(1);
});
