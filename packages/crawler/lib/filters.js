const { prisma, redis, withPrismaRetry, sleep, BlockDetectedError, SessionExpiredError } = require('./engine');

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

    const hasBasicInfo = ctx.productStatus && ctx.productStatus.title !== '이름 없음' && ctx.productStatus.title !== `수집 중... (${ctx.id})` && ctx.productStatus.imageUrl;
    const hasTodayPrice = ctx.productStatus && ctx.productStatus.priceHistory && ctx.productStatus.priceHistory.length > 0;

    if (hasBasicInfo && hasTodayPrice) {
      ctx.shouldSkip = true;
      return;
    }
    
    if (!hasBasicInfo) {
      console.log(`🔍 [ID ${ctx.id}] 정보 미비 - 정밀 복구 모드 (BasicInfo: ${!!hasBasicInfo}, TodayPrice: ${!!hasTodayPrice})`);
      ctx.isRecoveryMode = true;
    } else {
      ctx.isRecoveryMode = false;
      if (!hasTodayPrice) {
        console.log(`📡 [ID ${ctx.id}] 오늘 가격 데이터 없음 - 수집 시작`);
      }
    }
  }
}

class DirectApiFilter {
  async process(ctx) {
    // 복구 모드(이미지 DOM fallback 필요)이거나 feature flag가 꺼져 있으면 패스
    if (ctx.isRecoveryMode) return;
    if (process.env.USE_DIRECT_API !== 'true') return;

    // API endpoint는 페이지보다 감시 강도가 낮아 짧은 지터로도 충분
    const baseJitter = 400;
    const randomWait = Math.floor(Math.random() * 600);
    await sleep(baseJitter + randomWait);

    const url = `https://www.univstore.com/api/item/${ctx.id}`;
    const res = await ctx.browserContext.request.get(url, {
      headers: {
        'Referer': `https://www.univstore.com/item/${ctx.id}`,
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 15000,
    });

    const status = res.status();
    if (status === 403 || status === 429 || status === 405) {
      throw new BlockDetectedError(`Bot detected via API (HTTP ${status})`, status);
    }
    if (status === 401) {
      throw new SessionExpiredError();
    }
    if (status >= 400) {
      console.warn(`⚠️ [ID ${ctx.id}] API ${status} - 페이지 fallback으로 위임`);
      return; // apiHandled를 set하지 않고 빠져나가면 NavigationFilter가 이어받음
    }

    const apiData = await res.json();
    if (!apiData || !apiData.id) {
      console.warn(`⚠️ [ID ${ctx.id}] API 응답 형식 불일치 - 페이지 fallback으로 위임`);
      return;
    }

    const price = apiData.price2 ?? apiData.price1 ?? 0;
    const originalPrice = apiData.price1 ?? price;
    let stockStatus = 'In Stock';
    if (typeof apiData.has_stock !== 'undefined') {
      stockStatus = apiData.has_stock ? 'In Stock' : 'Out of Stock';
    }

    ctx.itemInfo = {
      brand: apiData.brand_name || '',
      title: apiData.front_name || apiData.name || '이름 없음',
      price: String(price),
      originalPrice: String(originalPrice),
      imageUrl: apiData.thumbnail_url || null,
      stockStatus,
      bestBenefit: apiData.benefit || null,
      category: apiData.item_category_name || null,
      subCategory: apiData.brand_item_category_name || null,
    };
    ctx.apiHandled = true;
  }
}

class NavigationFilter {
  async process(ctx) {
    if (ctx.apiHandled) return;

    // page는 lazy 생성: DirectApi 경로로 처리되는 경우 page 객체 자체가 만들어지지 않음
    if (!ctx.page) {
      ctx.page = await ctx.browserContext.newPage();
    }

    // 최소 2초 ~ 최대 6초 사이의 랜덤 딜레이 (더 인간적인 패턴)
    const baseJitter = 2000;
    const randomWait = Math.floor(Math.random() * 4000);
    await sleep(baseJitter + randomWait);

    const res = await ctx.page.goto(`https://www.univstore.com/item/${ctx.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const status = res.status();
    const pageTitle = await ctx.page.title();
    const bodyText = await ctx.page.evaluate(() => document.body.innerText);

    if (status === 403 || status === 429 || status === 405 || pageTitle.includes('Verification') || bodyText.includes('confirm you are human')) {
      throw new BlockDetectedError(`Bot detected (HTTP ${status})`, status);
    }
  }
}

class SessionCheckFilter {
  async process(ctx) {
    if (ctx.apiHandled) return;

    const isLoggedIn = await ctx.page.evaluate(() => {
      return !document.body.innerHTML.includes('학생인증 후 가격 확인');
    });
    if (!isLoggedIn) throw new SessionExpiredError();
  }
}

class ExtractionFilter {
  async process(ctx) {
    if (ctx.apiHandled) return;

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
      const price = (document.querySelector('.usItemCardInfoPriceCurrent')?.innerText || 
                     document.querySelector('.usItemCardInfoPrice2')?.innerText || 
                     document.querySelector('.usItemSumValue')?.innerText || '0').replace(/[^0-9]/g, '');
      const originalPrice = document.querySelector('.usItemCardInfoPriceOriginal')?.innerText?.replace(/[^0-9]/g, '') || 
                            document.querySelector('.usItemCardInfoPrice1')?.innerText?.replace(/[^0-9]/g, '') || price;
      const bestBenefit = document.querySelector('.usItemCardInfoBenefitItemText')?.innerText?.trim() || 
                          document.querySelector('.usPaymentDiscountSchemeInfo')?.innerText?.trim() || null;

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
        const img = document.querySelector('.usItemImageArea img') || document.querySelector('.usItemThumbnail img');
        if (img) imageUrl = img.src;
      }

      return {
        brand, title: name, price, originalPrice, imageUrl, stockStatus, bestBenefit,
        category: apiData?.item_category_name || null,
        subCategory: apiData?.brand_item_category_name || null,
      };
    }, { id: ctx.id, recovery: ctx.isRecoveryMode });
  }
}

class ValidationFilter {
  async process(ctx) {
    const priceNum = parseInt(ctx.itemInfo.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      console.warn(`⚠️ [ID ${ctx.id}] 유효하지 않은 가격(${ctx.itemInfo.price}) - 수집 건너뜀`);
      ctx.shouldSkip = true;
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
  }
}

module.exports = {
  DBStateFilter,
  DirectApiFilter,
  NavigationFilter,
  SessionCheckFilter,
  ExtractionFilter,
  ValidationFilter,
  StorageFilter
};
