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
 * 사이트맵을 분석하여 현재 사이트에 존재하는 모든 상품 ID를 추출합니다. (브라우저 기반 우회)
 */
async function discoverAllProductIds(page) {
  console.log("🔍 사이트맵(item.xml) 분석하여 전체 상품 ID 수집 중...");
  try {
    const sitemapUrl = 'https://www.univstore.com/sitemap/item.xml';
    // 타임아웃을 넉넉하게 잡고 networkidle까지 기다림
    await page.goto(sitemapUrl, { waitUntil: 'networkidle', timeout: 90000 });

    // page.content()는 브라우저가 해석한 태그(html/body 등)가 포함될 수 있음
    // 실제 XML 원본을 가져오기 위해 정규식으로 <urlset> 구간만 추출하거나 textContent를 활용
    const rawContent = await page.content();
    
    // <urlset> 태그가 포함되어 있는지 확인
    if (!rawContent.includes('<urlset')) {
      console.log("⚠️ raw content에 <urlset>이 없습니다. textContent 시도...");
      const textData = await page.evaluate(() => document.documentElement.textContent);
      return parseXmlAndExtractIds(textData);
    }

    // rawContent에서 XML 선언부부터 끝까지 추출
    const xmlMatch = rawContent.match(/<\?xml[\s\S]*<\/urlset>/i) || rawContent.match(/<urlset[\s\S]*<\/urlset>/i);
    const xmlData = xmlMatch ? xmlMatch[0] : rawContent;

    return parseXmlAndExtractIds(xmlData);
  } catch (err) {
    console.error("❌ 사이트맵 수집 실패:", err.message);
    await prisma.systemLog.create({
      data: {
        type: 'WARNING',
        service: 'Crawler',
        message: `사이트맵 수집 실패: ${err.message}`
      }
    }).catch(() => {});
    return [];
  }
}

function parseXmlAndExtractIds(xmlString) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      alwaysCreateTextNode: false
    });
    const jsonObj = parser.parse(xmlString);
    
    if (!jsonObj.urlset || !jsonObj.urlset.url) {
      console.log("⚠️ 사이트맵 파싱 결과 URL 데이터가 없습니다. (객체 구조 확인 필요)");
      // 디버깅을 위해 구조 일부 출력
      console.log("Structure keys:", Object.keys(jsonObj));
      return [];
    }

    const urlArray = Array.isArray(jsonObj.urlset.url) 
      ? jsonObj.urlset.url 
      : [jsonObj.urlset.url];

    const ids = urlArray
      .map(u => {
        const loc = typeof u.loc === 'string' ? u.loc : (u.loc?.['#text'] || '');
        return loc.match(/\/item\/(\d+)/)?.[1];
      })
      .filter(id => !!id);
      
    console.log(`✅ 총 ${ids.length}개의 상품 ID를 확보했습니다.`);
    return ids;
  } catch (err) {
    console.error("❌ XML 파싱 에러:", err.message);
    return [];
  }
}

/**
 * 메인 페이지에서 래플 및 타임 세일 정보를 추출합니다.
 */
async function discoverSpecials(page) {
  console.log("\n🎁 래플 및 특가 정보 탐색 중...");
  try {
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle', timeout: 60000 });
    
    // SPA 로딩을 위해 잠시 대기
    await page.waitForTimeout(3000);
    
    const specials = await page.evaluate(() => {
      const results = { raffles: [], flashSales: [] };
      
      // 1. 래플 탐색
      const raffleLinks = Array.from(document.querySelectorAll('a')).filter(a => 
        a.href.includes('/raffle') || (a.innerText.includes('래플') && a.innerText.length < 20)
      );
      
      raffleLinks.forEach(a => {
        results.raffles.push({
          title: a.innerText.trim() || '진행 중인 래플',
          brand: 'Event',
          entries: 0,
          endsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        });
      });

      // 2. 특가(Flash Sale) 탐색
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
        if (!uniqueDeals.has(title)) {
          uniqueDeals.set(title, {
            title: title,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 86400000).toISOString(),
            status: 'Ongoing'
          });
        }
      });

      results.flashSales = Array.from(uniqueDeals.values());
      return results;
    });

    console.log(`✅ ${specials.raffles.length}개의 래플, ${specials.flashSales.length}개의 특가 발견.`);
    
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

  // 2. 특가 및 래플 정보 수집
  await discoverSpecials(page);

  // 3. 전체 상품 ID 수집 (Sitemap 기반)
  const allItemIds = await discoverAllProductIds(page);
  const totalItems = allItemIds.length;

  if (totalItems === 0) {
    console.log("⚠️ 수집할 상품이 없습니다. 종료합니다.");
    await context.close();
    await prisma.$disconnect();
    await redis.quit();
    return;
  }

  // 4. 상품 정보 및 가격 수집 루프
  for (let i = 0; i < totalItems; i++) {
    const id = allItemIds[i];
    const progress = `${i + 1}/${totalItems}`;

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

    const jitter = Math.floor(Math.random() * 2000) + 1000;
    console.log(`\n[${progress}] ⏳ ${jitter/1000}초 대기 후 상품 ID ${id} 조회...`);
    await sleep(jitter);

    try {
      await page.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'networkidle', timeout: 30000 });
      
      // 상품명 엘리먼트가 나타날 때까지 최대 5초 대기
      const titleSelector = '.usItemCardInfoName';
      await page.waitForSelector(titleSelector, { timeout: 5000 }).catch(() => {});
      
      const itemInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        if (bodyText.includes('존재하지 않는 상품') || bodyText.includes('판매가 중단')) {
          return { error: 'Not available' };
        }

        const brand = document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || '';
        const name = document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음';
        
        // 로그인 체크 강화
        const isLoggedIn = !document.body.innerHTML.includes('학생인증 후 가격 확인') && !document.body.innerHTML.includes('로그인이 필요합니다');

        const originalPriceText = document.querySelector('.usItemCardInfoPrice1')?.innerText?.trim() || '0';
        const studentPriceText = document.querySelector('.usItemCardInfoPrice2')?.innerText?.trim() || 
                                document.querySelector('.usItemSumValue')?.innerText?.trim() || '0';
        
        // --- [이미지 추출 로직 고도화] ---
        let imageUrl = null;
        const allImages = Array.from(document.querySelectorAll('img'));
        
        // 1순위: 특정 상품 컨테이너 내의 이미지
        const productContainers = ['.usItemImageArea', '.usItemAreaTop', '.usItemThumbnail'];
        for (const sel of productContainers) {
          const container = document.querySelector(sel);
          if (container) {
            const img = container.querySelector('img');
            if (img && img.src.includes('http')) {
              imageUrl = img.src;
              break;
            }
          }
        }
        
        // 2순위: 1순위 실패 시, 페이지 내 가장 큰 정방향 이미지(상품 이미지일 확률 높음) 찾기
        if (!imageUrl) {
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
        
        // 3순위: 파일명 패턴 매칭
        if (!imageUrl) {
          const patternImg = allImages.find(img => {
            const src = img.src.toLowerCase();
            return (src.includes('thumbnail') || src.includes('goods') || src.includes('item')) && !src.includes('icon');
          });
          imageUrl = patternImg?.src || null;
        }

        // 재고 상태 추출
        let stockStatus = 'In Stock';
        const statusArea = document.querySelector('.usItemAreaTop')?.innerText || '';
        const buyArea = document.querySelector('.usItemSumArea')?.innerText || '';
        const combinedStatus = (statusArea + ' ' + buyArea).replace(/\s+/g, ' ');

        if (combinedStatus.includes('품절') || combinedStatus.includes('재고 없음') || combinedStatus.includes('판매중지')) {
          stockStatus = 'Out of Stock';
        } else if (combinedStatus.includes('남은 수량') || combinedStatus.includes('품절 임박')) {
          stockStatus = 'Low Stock';
        }

        return {
          brand,
          title: name,
          originalPrice: originalPriceText.replace(/[^0-9]/g, ''),
          price: studentPriceText.replace(/[^0-9]/g, ''),
          imageUrl,
          stockStatus,
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

      // --- 데이터 품질 체크 (Data Quality Monitoring) ---
      const issues = [];
      if (!itemInfo.brand || itemInfo.title === '이름 없음') {
        issues.push({ type: 'MISSING_TITLE', message: '브랜드 또는 상품명을 찾을 수 없음' });
      }
      if (!itemInfo.imageUrl) {
        issues.push({ type: 'MISSING_IMAGE', message: '상품 이미지를 찾을 수 없음' });
      }

      if (issues.length > 0) {
        console.log(`⚠️ [Data Issue] ID ${id}: ${issues.map(i => i.type).join(', ')}`);
        for (const issue of issues) {
          await prisma.dataIssue.upsert({
            where: {
              productId_type: {
                productId: id,
                type: issue.type
              }
            },
            update: {
              message: issue.message,
              details: JSON.stringify(itemInfo),
              timestamp: new Date()
            },
            create: {
              productId: id,
              type: issue.type,
              message: issue.message,
              details: JSON.stringify(itemInfo)
            }
          }).catch(err => console.error("❌ DataIssue 저장 실패:", err.message));
        }
      }

      console.log(`✅ [${itemInfo.brand}] ${itemInfo.title}`);
      console.log(`🖼️ 이미지 수집 성공: ${itemInfo.imageUrl ? 'Yes' : 'No'}`);
      const priceNum = parseInt(itemInfo.price);
      
      // 시스템 로그 기록 (안전하게)
      await prisma.systemLog.create({
        data: {
          type: 'INFO',
          service: 'Crawler',
          message: `상품 수집: [${itemInfo.brand}] ${itemInfo.title}`
        }
      }).catch(err => console.error("❌ SystemLog 저장 실패:", err.message));

      const payload = {
        id,
        brand: itemInfo.brand,
        title: itemInfo.title,
        price: priceNum,
        originalPrice: parseInt(itemInfo.originalPrice),
        imageUrl: itemInfo.imageUrl,
        stockStatus: itemInfo.stockStatus,
        bestBenefit: itemInfo.bestBenefit,
        timestamp: new Date().toISOString()
      };

      // Redis 적재 (안전하게)
      await redis.rpush('univstore:price_updates', JSON.stringify(payload))
        .then(() => console.log(`📦 Redis Queue에 적재 완료 (처리 대기 중)`))
        .catch(err => {
          console.error("❌ Redis 적재 실패:", err.message);
          fs.appendFileSync('failed_payloads.log', JSON.stringify(payload) + '\n');
        });

    } catch (err) {
      console.error(`❌ 상품 ${id} 수집 도중 에러 발생:`, err.message);
      await sleep(5000);
    }
  }

  console.log(`\n✨ 모든 상품에 대한 수집 및 큐 전송이 완료되었습니다.`);
  
  // --- 데이터 정리 작업 (Auto Cleanup) ---
  console.log("🧹 오래된 데이터 이슈 정리 중...");
  try {
    const issueCount = await prisma.dataIssue.count();
    if (issueCount > 1000) {
      const oldestToKeep = await prisma.dataIssue.findMany({
        orderBy: { timestamp: 'desc' },
        skip: 1000,
        take: 1,
      });
      if (oldestToKeep.length > 0) {
        await prisma.dataIssue.deleteMany({
          where: { timestamp: { lte: oldestToKeep[0].timestamp } }
        });
        console.log(`✅ 1,000건 이상의 오래된 이슈를 정리했습니다.`);
      }
    }
  } catch (err) {
    console.error("❌ 데이터 정리 실패:", err.message);
  }

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
    
    console.log("⏳ 에브리타임 인증 페이지 대기 중...");
    await page.waitForSelector('input[name="id"]', { timeout: 30000, state: 'visible' });

    console.log("✍️ 계정 정보 입력 중...");
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    
    console.log("🚀 로그인 제출 중...");
    await page.click('input[type="submit"]');
    
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
