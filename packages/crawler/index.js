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
 * 사이트맵을 분석하여 현재 사이트에 존재하는 모든 상품 ID를 추출합니다. (브라우저 기반 우회 + 재시도)
 */
async function discoverAllProductIds(page) {
  console.log("🔍 사이트맵(item.xml) 분석하여 전체 상품 ID 수집 중...");
  
  const sitemapUrl = 'https://www.univstore.com/sitemap/item.xml';
  let retries = 3;
  
  while (retries > 0) {
    try {
      // 1. 사이트맵 로딩 대기 강화
      await page.goto(sitemapUrl, { waitUntil: 'networkidle', timeout: 120000 });
      
      // XML 태그가 실제로 나타날 때까지 기다림
      await page.waitForFunction(() => {
        const content = document.body.innerText || document.documentElement.textContent;
        return content.includes('<urlset') && content.includes('</urlset>');
      }, { timeout: 30000 }).catch(() => {});

      const rawContent = await page.content();
      
      if (rawContent.includes('<urlset')) {
        const xmlMatch = rawContent.match(/<\?xml[\s\S]*<\/urlset>/i) || rawContent.match(/<urlset[\s\S]*<\/urlset>/i);
        const xmlData = xmlMatch ? xmlMatch[0] : rawContent;
        return parseXmlAndExtractIds(xmlData);
      }

      console.log(`⚠️ 사이트맵 데이터 확보 실패 (남은 시도: ${retries - 1})...`);
      const textData = await page.evaluate(() => document.documentElement.textContent);
      if (textData && textData.includes('<urlset')) {
        return parseXmlAndExtractIds(textData);
      }

    } catch (err) {
      console.error(`❌ 사이트맵 시도 실패 (${retries}):`, err.message);
    }
    
    retries--;
    if (retries > 0) {
      console.log("⏳ 10초 후 사이트맵 재수집 시도...");
      await sleep(10000);
    }
  }
  
  console.error("❌ 사이트맵 수집에 최종 실패했습니다.");
  return [];
}

function parseXmlAndExtractIds(xmlString) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      alwaysCreateTextNode: false
    });
    const jsonObj = parser.parse(xmlString);
    
    if (!jsonObj.urlset || !jsonObj.urlset.url) {
      return [];
    }

    const urlArray = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];

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

async function discoverSpecials(page) {
  console.log("\n🎁 래플 및 특가 정보 탐색 중...");
  try {
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const specials = await page.evaluate(() => {
      const results = { raffles: [], flashSales: [] };
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
  await checkLogin(page);
  await discoverSpecials(page);

  const allItemIds = await discoverAllProductIds(page);
  const totalItems = allItemIds.length;

  if (totalItems === 0) {
    console.log("⚠️ 수집할 상품이 없습니다. 종료합니다.");
    await context.close();
    await prisma.$disconnect();
    await redis.quit();
    return;
  }

  // --- [병렬 수집 엔진 가동 - 안전 모드] ---
  const BATCH_SIZE = 3; 
  console.log(`\n🚀 병렬 수집 시작 (배치 크기: ${BATCH_SIZE})`);

  for (let i = 0; i < totalItems; i += BATCH_SIZE) {
    const batchIds = allItemIds.slice(i, i + BATCH_SIZE);
    const progress = `${i + 1}-${Math.min(i + BATCH_SIZE, totalItems)}/${totalItems}`;

    console.log(`\n[${progress}] ⏳ 배치 수집 중...`);

    try {
      await Promise.all(batchIds.map(async (id) => {
        // 브라우저 컨텍스트가 닫혔는지 체크
        const batchPage = await context.newPage().catch(err => {
          if (err.message.includes('closed')) {
            throw new Error("BROWSER_CONTEXT_CLOSED");
          }
          throw err;
        });

        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const existingHistory = await withPrismaRetry(() => prisma.priceHistory.findFirst({
            where: { productId: id, timestamp: { gte: today } }
          }));

          if (existingHistory) return;

          const jitter = Math.floor(Math.random() * 3000) + 1000;
          await sleep(jitter);

          await batchPage.goto(`https://www.univstore.com/item/${id}`, { waitUntil: 'networkidle', timeout: 30000 });
          
          const titleSelector = '.usItemCardInfoName';
          await batchPage.waitForSelector(titleSelector, { timeout: 5000 }).catch(() => {});
          
          const itemInfo = await batchPage.evaluate(() => {
            const bodyText = document.body.innerText;
            if (bodyText.includes('존재하지 않는 상품') || bodyText.includes('판매가 중단')) {
              return { error: 'Not available' };
            }

            const brand = document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || '';
            const name = document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음';
            const isLoggedIn = !document.body.innerHTML.includes('학생인증 후 가격 확인') && !document.body.innerHTML.includes('로그인이 필요합니다');
            const originalPriceText = document.querySelector('.usItemCardInfoPrice1')?.innerText?.trim() || '0';
            const studentPriceText = document.querySelector('.usItemCardInfoPrice2')?.innerText?.trim() || 
                                    document.querySelector('.usItemSumValue')?.innerText?.trim() || '0';
            
            let imageUrl = null;
            const productContainers = ['.usItemImageArea', '.usItemAreaTop', '.usItemThumbnail'];
            for (const sel of productContainers) {
              const container = document.querySelector(sel);
              if (container) {
                const img = container.querySelector('img');
                if (img && img.src.includes('http')) { imageUrl = img.src; break; }
              }
            }
            
            if (!imageUrl) {
              const allImages = Array.from(document.querySelectorAll('img'));
              const candidate = allImages
                .filter(img => {
                  const src = img.src.toLowerCase();
                  const isIcon = src.includes('icon') || src.includes('logo') || src.includes('arrow') || src.includes('btn_') || src.includes('banner');
                  return src.includes('http') && !isIcon;
                })
                .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))[0];
              if (candidate && candidate.naturalWidth > 200) imageUrl = candidate.src;
            }

            let stockStatus = 'In Stock';
            const statusArea = document.querySelector('.usItemAreaTop')?.innerText || '';
            const buyArea = document.querySelector('.usItemSumArea')?.innerText || '';
            const combinedStatus = (statusArea + ' ' + buyArea).replace(/\s+/g, ' ');

            if (combinedStatus.includes('품절') || combinedStatus.includes('재고 없음') || combinedStatus.includes('판매중지')) {
              stockStatus = 'Out of Stock';
            }

            const benefitElement = document.querySelector('.usPaymentDiscountSchemeInfo');
            const bestBenefit = benefitElement?.innerText?.trim() || null;

            return {
              brand, title: name,
              originalPrice: originalPriceText.replace(/[^0-9]/g, ''),
              price: studentPriceText.replace(/[^0-9]/g, ''),
              imageUrl, stockStatus, isLoggedIn, bestBenefit
            };
          });

          if (itemInfo.error) return;

          if (!itemInfo.isLoggedIn) {
            console.log(`⚠️ [ID ${id}] 세션 만료!`);
            return;
          }

          const priceNum = parseInt(itemInfo.price);
          const issues = [];
          if (isNaN(priceNum) || priceNum <= 0) issues.push({ type: 'INVALID_PRICE', message: `가격 오류: ${itemInfo.price}` });
          if (!itemInfo.brand || itemInfo.title === '이름 없음') issues.push({ type: 'MISSING_TITLE', message: '제목/브랜드 누락' });
          if (!itemInfo.imageUrl) issues.push({ type: 'MISSING_IMAGE', message: '이미지 누락' });

          if (issues.length > 0) {
            for (const issue of issues) {
              await withPrismaRetry(() => prisma.dataIssue.upsert({
                where: { productId_type: { productId: id, type: issue.type } },
                update: { message: issue.message, details: JSON.stringify(itemInfo), timestamp: new Date() },
                create: { productId: id, type: issue.type, message: issue.message, details: JSON.stringify(itemInfo) }
              })).catch(() => {});
            }
            if (issues.some(i => i.type === 'INVALID_PRICE')) return;
          }

          console.log(`✅ [${itemInfo.brand}] ${itemInfo.title} 수집 완료`);

          const payload = {
            id, brand: itemInfo.brand, title: itemInfo.title,
            price: priceNum, originalPrice: parseInt(itemInfo.originalPrice),
            imageUrl: itemInfo.imageUrl, stockStatus: itemInfo.stockStatus,
            bestBenefit: itemInfo.bestBenefit, timestamp: new Date().toISOString()
          };

          await redis.rpush('univstore:price_updates', JSON.stringify(payload)).catch(() => {});
        } catch (err) {
          if (err.message !== 'BROWSER_CONTEXT_CLOSED') {
            console.error(`❌ 상품 ${id} 에러:`, err.message);
          } else {
            throw err; // 상위 catch로 전달
          }
        } finally {
          await batchPage.close().catch(() => {});
        }
      }));
    } catch (err) {
      if (err.message === 'BROWSER_CONTEXT_CLOSED') {
        console.error("🔥 브라우저 컨텍스트가 외부 요인에 의해 종료되었습니다. 프로세스를 중단합니다.");
        break; 
      }
      console.error("❌ 배치 처리 중 예외 발생:", err.message);
    }
  }

  console.log(`\n✨ 모든 상품 수집 완료.`);
  
  // 오래된 이슈 정리
  try {
    const issueCount = await prisma.dataIssue.count();
    if (issueCount > 1000) {
      const oldestToKeep = await prisma.dataIssue.findMany({ orderBy: { timestamp: 'desc' }, skip: 1000, take: 1 });
      if (oldestToKeep.length > 0) {
        await prisma.dataIssue.deleteMany({ where: { timestamp: { lte: oldestToKeep[0].timestamp } } });
      }
    }
  } catch (err) {}

  await context.close().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  await redis.quit().catch(() => {});
}

async function checkLogin(page) {
  await page.goto('https://www.univstore.com/user/login');
  const isLoginPage = await page.isVisible('input[name="userid"]');
  if (isLoginPage) await loginWithEverytime(page);
}

async function loginWithEverytime(page) {
  console.log("🔐 자동 로그인 시도...");
  try {
    await page.goto('https://www.univstore.com/user/login', { waitUntil: 'networkidle' });
    const loginBtn = page.locator('.usEverytimeLoginTitle');
    await loginBtn.waitFor({ state: 'visible', timeout: 5000 });
    await loginBtn.click();
    await page.waitForSelector('input[name="id"]', { timeout: 30000, state: 'visible' });
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(5000);
    await page.waitForURL(url => url.href.includes('univstore.com'), { timeout: 60000 });
    console.log("🎉 로그인 성공!");
  } catch (err) {
    console.error("❌ 로그인 실패:", err.message);
    throw err;
  }
}

run().catch(err => {
  console.error("🔥 치명적 에러:", err);
  process.exit(1);
});
