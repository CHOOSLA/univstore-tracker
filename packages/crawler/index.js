require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// --- [파이프라인 아키텍처 인프라] ---

class BlockDetectedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'BlockDetectedError';
    this.status = status;
  }
}

class CrawlerContext {
  constructor(id, index, total, page, browserContext, USER_DATA_DIR) {
    this.id = id;
    this.index = index;
    this.total = total;
    this.page = page;
    this.browserContext = browserContext;
    this.USER_DATA_DIR = USER_DATA_DIR;
    this.progress = `${index + 1}/${total}`;
    
    // 상태 관리 필드
    this.productStatus = null;
    this.shouldSkip = false;
    this.isRecoveryMode = false;
    this.itemInfo = null;
    this.payload = null;
  }
}

class Pipeline {
  constructor(filters) {
    this.filters = filters;
  }

  async execute(context) {
    for (const filter of this.filters) {
      if (context.shouldSkip) break;
      await filter.process(context);
    }
    return context;
  }
}

// --- [필터 체인 구현체] ---

class DBStateFilter {
  async process(ctx) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    
    ctx.productStatus = await withPrismaRetry(() => prisma.product.findUnique({
      where: { id: ctx.id },
      select: {
        title: true, imageUrl: true, category: true, brand: true,
        priceHistory: { where: { timestamp: { gte: today } }, take: 1, select: { price: true } }
      }
    }));

    const hasBasicInfo = ctx.productStatus && ctx.productStatus.title !== '이름 없음' && ctx.productStatus.imageUrl && ctx.productStatus.category;
    const hasTodayPrice = ctx.productStatus && ctx.productStatus.priceHistory.length > 0;

    if (hasBasicInfo && hasTodayPrice) {
      if (ctx.index % 100 === 0) console.log(`⏭️ [${ctx.progress}] 완벽한 데이터 (Skipped)`);
      ctx.shouldSkip = true;
      return;
    }

    ctx.isRecoveryMode = !hasBasicInfo;
    if (ctx.isRecoveryMode) {
      console.log(`\n🔍 [${ctx.progress}] 데이터 유실 발견 (ID: ${ctx.id}) - 정밀 복구 모드 가동`);
    }
  }
}

class NavigationFilter {
  async process(ctx) {
    // 병렬 처리 시에는 지터를 조금 더 여유 있게 (과거 블락 안 먹던 수치 기반)
    // 미세 최적화: 베이스 지터를 살짝 낮추고 범위를 조정하여 자연스러운 리듬 유지
    const baseJitter = ctx.isRecoveryMode ? 1800 : 800;
    const randomWait = Math.floor(Math.random() * (ctx.isRecoveryMode ? 2700 : 2200)); 
    await sleep(baseJitter + randomWait);

    const res = await ctx.page.goto(`https://www.univstore.com/item/${ctx.id}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    const status = res.status();
    const pageTitle = await ctx.page.title();
    const bodyText = await ctx.page.evaluate(() => document.body.innerText);

    if (status === 403 || status === 405 || status === 429 || pageTitle.includes('Verification') || bodyText.includes('confirm you are human')) {
      throw new BlockDetectedError(`서버 차단 감지 (Status: ${status})`, status);
    }

    if (ctx.isRecoveryMode) {
      await ctx.page.waitForSelector('.usItemImageArea img', { timeout: 5000 }).catch(() => {});
    }
  }
}

class ExtractionFilter {
  async process(ctx) {
    // 세션 쿠키 추출 (API 호출용)
    const cookies = await ctx.browserContext.cookies('https://www.univstore.com');
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    ctx.itemInfo = await ctx.page.evaluate(async ({ id, recovery }) => {
      const body = document.body.innerText;
      const html = document.body.innerHTML;
      if (body.includes('존재하지 않는 상품') || body.includes('판매가 중단')) return { error: 'Not available' };

      // 1. 내부 API를 통한 고품질 메타데이터 추출 시도
      let apiData = null;
      try {
        const res = await fetch(`https://www.univstore.com/api/item/${id}`);
        apiData = await res.json();
      } catch (e) {}

      // 2. 가격 및 혜택 (DOM)
      const price = (document.querySelector('.usItemCardInfoPrice2')?.innerText || 
                     document.querySelector('.usItemSumValue')?.innerText || '0').replace(/[^0-9]/g, '');
      const originalPrice = document.querySelector('.usItemCardInfoPrice1')?.innerText?.replace(/[^0-9]/g, '') || price;
      const bestBenefit = document.querySelector('.usPaymentDiscountSchemeInfo')?.innerText?.trim() || null;

      // 3. 재고 상태 판별 (API 우선)
      let stockStatus = 'In Stock';
      if (apiData && typeof apiData.has_stock !== 'undefined') {
        stockStatus = apiData.has_stock ? 'In Stock' : 'Out of Stock';
      } else {
        const infoArea = document.querySelector('.usItemAreaTop')?.innerText || '';
        const sumArea = document.querySelector('.usItemSumArea')?.innerText || '';
        const statusText = (infoArea + ' ' + sumArea).replace(/\s+/g, ' ');
        if (statusText.includes('[품절]') || statusText.includes('일시 품절') || statusText.includes('재고 없음')) {
          stockStatus = 'Out of Stock';
        }
      }
      if (body.includes('남은 수량') || body.includes('품절 임박')) stockStatus = 'Low Stock';

      // 4. 브랜드, 이름, 이미지 (복구 모드 정밀 추출)
      let brand = apiData?.brand_name || document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || '', 
          name = apiData?.front_name || document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음', 
          imageUrl = apiData?.thumbnail_url || null;

      if (recovery && !imageUrl) {
        // [이미지 추출 로직 1순위: 컨테이너]
        const productContainers = ['.usItemImageArea', '.usItemAreaTop', '.usItemThumbnail'];
        for (const sel of productContainers) {
          const container = document.querySelector(sel);
          if (container) {
            const img = container.querySelector('img');
            if (img && img.src.includes('http')) { imageUrl = img.src; break; }
          }
        }
        
        // [이미지 추출 로직 2순위: 가장 큰 이미지]
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

        // [이미지 추출 로직 3순위: 패턴 매칭]
        if (!imageUrl) {
          const patternImg = Array.from(document.querySelectorAll('img')).find(img => {
            const src = img.src.toLowerCase();
            return (src.includes('thumbnail') || src.includes('goods') || src.includes('item')) && !src.includes('icon');
          });
          imageUrl = patternImg?.src || null;
        }
      }

      return { 
        brand, title: name, price, originalPrice, imageUrl, stockStatus, bestBenefit,
        category: apiData?.item_category_name || null,
        subCategory: apiData?.brand_item_category_name || null,
        isLoggedIn: !html.includes('학생인증 후 가격 확인')
      };
    }, { id: ctx.id, recovery: ctx.isRecoveryMode });

    if (!ctx.itemInfo.isLoggedIn) {
      console.log("🔑 세션 만료. 재로그인 중...");
      await checkLogin(ctx.page);
      throw new Error("Session Expired - Retrying...");
    }
  }
}

class ValidationFilter {
  async process(ctx) {
    const { id, itemInfo, isRecoveryMode } = ctx;
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
      if (issues.some(i => i.type === 'INVALID_PRICE')) ctx.shouldSkip = true;
    }
  }
}

class StorageFilter {
  async process(ctx) {
    const { id, itemInfo, productStatus, isRecoveryMode } = ctx;
    const priceNum = parseInt(itemInfo.price);

    ctx.payload = {
      id,
      brand: isRecoveryMode ? itemInfo.brand : productStatus.brand,
      title: isRecoveryMode ? itemInfo.title : productStatus.title,
      price: priceNum,
      originalPrice: parseInt(itemInfo.originalPrice),
      imageUrl: isRecoveryMode ? itemInfo.imageUrl : productStatus.imageUrl,
      stockStatus: itemInfo.stockStatus,
      bestBenefit: itemInfo.bestBenefit || (productStatus ? productStatus.bestBenefit : null),
      category: itemInfo.category || (productStatus ? productStatus.category : null),
      subCategory: itemInfo.subCategory || (productStatus ? productStatus.subCategory : null),
      timestamp: new Date().toISOString()
    };

    await redis.rpush('univstore:price_updates', JSON.stringify(ctx.payload));
    
    if (isRecoveryMode) {
      console.log(`✅ [${ctx.progress}] 데이터 복구 완료: [${ctx.payload.brand}] ${ctx.payload.title}`);
    } else if (ctx.index % 100 === 0) {
      console.log(`✅ [${ctx.progress}] 가격 갱신: ₩${ctx.payload.price.toLocaleString()}`);
    }
  }
}

class SimulationFilter {
  async process(ctx) {
    const { id, itemInfo, productStatus, isRecoveryMode } = ctx;
    const priceNum = parseInt(itemInfo.price);

    ctx.payload = {
      id,
      brand: isRecoveryMode ? itemInfo.brand : productStatus.brand,
      title: isRecoveryMode ? itemInfo.title : productStatus.title,
      price: priceNum,
      originalPrice: parseInt(itemInfo.originalPrice),
      imageUrl: isRecoveryMode ? itemInfo.imageUrl : productStatus.imageUrl,
      stockStatus: itemInfo.stockStatus,
      bestBenefit: itemInfo.bestBenefit || (productStatus ? productStatus.bestBenefit : null),
      category: itemInfo.category || (productStatus ? productStatus.category : null),
      subCategory: itemInfo.subCategory || (productStatus ? productStatus.subCategory : null),
      timestamp: new Date().toISOString()
    };

    console.log(`\n🧪 [SIMULATION] Payload for ID ${id}:`);
    console.dir(ctx.payload);
  }
}

// --- [기존 도우미 함수들] ---
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
  // 1. 초기 스캔 및 환경 준비
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

  await initContext.close();

  if (totalItems === 0) {
    console.log("⚠️ 수집할 상품이 없습니다.");
    return;
  }

  // 2. 파이프라인 구성
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) console.log("🧪 [DRY RUN] 시뮬레이션 모드로 작동합니다. DB에 저장하지 않습니다.");

  const pipeline = new Pipeline([
    new DBStateFilter(),
    new NavigationFilter(),
    new ExtractionFilter(),
    new ValidationFilter(),
    isDryRun ? new SimulationFilter() : new StorageFilter()
  ]);

  // 3. 메인 수집 루프 (배치 병렬 모드)
  const BATCH_SIZE = 3; 
  const PROGRESS_KEY = `univstore:progress:${new Date().toISOString().split('T')[0]}`;
  let startIndex = parseInt(await redis.get(PROGRESS_KEY) || '0');
  
  let browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  let processedCount = 0;
  console.log(`\n🚀 파이프라인 병렬 엔진 가동 (배치 크기: ${BATCH_SIZE}, Index: ${startIndex}/${totalItems})`);

  for (let i = startIndex; i < totalItems; i += BATCH_SIZE) {
    const batchIds = allItemIds.slice(i, i + BATCH_SIZE);
    
    // --- [브라우저 리소스 관리: 500개마다 세션 리프레시] ---
    if (processedCount > 0 && processedCount % 500 === 0) {
      console.log(`\n♻️  메모리 최적화를 위해 브라우저를 재시작합니다... (${processedCount}개 처리 완료)`);
      await browserContext.close();
      await sleep(5000);
      browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
    }

    try {
      await Promise.all(batchIds.map(async (id, idx) => {
        const globalIndex = i + idx;
        const batchPage = await browserContext.newPage();
        await checkLogin(batchPage); // 각 페이지별 세션 확인
        
        const ctx = new CrawlerContext(id, globalIndex, totalItems, batchPage, browserContext, USER_DATA_DIR);
        try {
          await pipeline.execute(ctx);
        } finally {
          await batchPage.close();
        }
      }));

      processedCount += batchIds.length;
      await redis.set(PROGRESS_KEY, i + batchIds.length);

    } catch (err) {
      if (err instanceof BlockDetectedError) {
        const cooldownMins = 30;
        console.error(`\n🔥 [CRITICAL] ${err.message}. ${cooldownMins}분 대기 모드 진입...`);
        
        await browserContext.close();
        await sleep(cooldownMins * 60 * 1000);
        
        browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
          headless: true,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          viewport: { width: 1280, height: 720 },
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });
        
        i -= BATCH_SIZE; // 현재 배치 재시도
        continue;
      }
      
      console.error(`❌ [Batch ${i + 1}] 파이프라인 에러:`, err.message);
      await sleep(5000);
    }
  }

  console.log("\n✨ 파이프라인 전 공정 완료.");
  await browserContext.close();
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

module.exports = {
  CrawlerContext,
  Pipeline,
  DBStateFilter,
  NavigationFilter,
  ExtractionFilter,
  ValidationFilter,
  StorageFilter,
  SimulationFilter,
  BlockDetectedError,
  withPrismaRetry,
  discoverAllProductIds,
  discoverSpecials,
  checkLogin
};
