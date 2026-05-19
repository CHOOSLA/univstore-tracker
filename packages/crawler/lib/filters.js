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
    const hasTodayPrice = ctx.productStatus && ctx.productStatus.priceHistory.length > 0;

    if (hasBasicInfo && hasTodayPrice) {
      ctx.shouldSkip = true;
      return;
    }
    
    if (!hasBasicInfo) {
      console.log(`🔍 [ID ${ctx.id}] 데이터 유실 발견 - 정밀 복구 모드 가동`);
      ctx.isRecoveryMode = true;
    } else {
      ctx.isRecoveryMode = false;
    }
  }
}

class NavigationFilter {
  async process(ctx) {
    const baseJitter = 1000;
    const randomWait = Math.floor(Math.random() * 3000); 
    await sleep(baseJitter + randomWait);

    const res = await ctx.page.goto(`https://www.univstore.com/item/${ctx.id}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    const status = res.status();
    if (status === 403 || status === 429 || status === 405) {
      throw new BlockDetectedError(`Bot detected (HTTP ${status})`, status);
    }
  }
}

class SessionCheckFilter {
  async process(ctx) {
    const isLoggedIn = await ctx.page.evaluate(() => {
      return !document.body.innerText.includes('학생인증 후 가격 확인');
    });

    if (!isLoggedIn) {
      throw new SessionExpiredError();
    }
  }
}

class ExtractionFilter {
  async process(ctx) {
    const html = await ctx.page.content();
    ctx.itemInfo = await ctx.page.evaluate(({ id, recovery }) => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const dataScript = scripts.find(s => s.innerText.includes('window.__INITIAL_STATE__'));
      let apiData = null;
      if (dataScript) {
        try {
          const match = dataScript.innerText.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/);
          if (match) apiData = JSON.parse(match[1])?.item?.item;
        } catch (e) {}
      }

      const price = apiData?.price || document.querySelector('.usItemCardInfoPriceCurrent')?.innerText?.replace(/[^0-9]/g, '') || '0';
      const originalPrice = apiData?.market_price || document.querySelector('.usItemCardInfoPriceOriginal')?.innerText?.replace(/[^0-9]/g, '') || price;
      const stockStatus = document.body.innerText.includes('일시품절') ? 'Out of Stock' : 'In Stock';
      const bestBenefit = document.querySelector('.usItemCardInfoBenefitItemText')?.innerText?.trim() || null;

      let brand = apiData?.brand_name || document.querySelector('.usItemCardInfoBrandName')?.innerText?.trim() || '', 
          name = apiData?.front_name || document.querySelector('.usItemCardInfoName')?.innerText?.trim() || '이름 없음', 
          imageUrl = apiData?.thumbnail_url || null;

      if (recovery && !imageUrl) {
        const img = document.querySelector('.usItemImageArea img') || document.querySelector('.usItemThumbnail img');
        if (img) imageUrl = img.src;
      }

      return { 
        brand, title: name, price, originalPrice, imageUrl, stockStatus, bestBenefit,
        category: apiData?.item_category_name || null
      };
    }, { id: ctx.id, recovery: ctx.isRecoveryMode });
  }
}

class ValidationFilter {
  async process(ctx) {
    const priceNum = parseInt(ctx.itemInfo.price);
    if (isNaN(priceNum) || priceNum <= 0) ctx.shouldSkip = true;
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
      timestamp: new Date().toISOString()
    };

    await redis.rpush('univstore:price_updates', JSON.stringify(ctx.payload));
  }
}

module.exports = {
  DBStateFilter,
  NavigationFilter,
  SessionCheckFilter,
  ExtractionFilter,
  ValidationFilter,
  StorageFilter
};
