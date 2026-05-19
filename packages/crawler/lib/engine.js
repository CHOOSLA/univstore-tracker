const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const path = require('path');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class BlockDetectedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'BlockDetectedError';
    this.status = status;
  }
}

class SessionExpiredError extends Error {
  constructor(message = 'Session Expired') {
    super(message);
    this.name = 'SessionExpiredError';
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

async function withPrismaRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message.includes('closed') && i < retries - 1) {
        await prisma.$disconnect().catch(() => {});
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
}

async function checkLogin(page) {
  console.log("🔍 세션 상태 확인 중...");
  await page.goto('https://www.univstore.com/user/login', { waitUntil: 'networkidle', timeout: 60000 });
  
  const loginFormVisible = await page.waitForSelector('input[name="userid"]', { timeout: 5000 }).catch(() => null);
  
  if (loginFormVisible) {
    console.log("🔑 로그인 필요 감지. 세션 갱신을 시작합니다...");
    await page.click('.usEverytimeLoginTitle');
    await page.waitForSelector('input[name="id"]', { timeout: 10000 });
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    
    console.log("🖱️ 로그인 버튼 클릭...");
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.warn("⚠️ Navigation 대기 중 경고:", e.message))
    ]);

    // 로그인이 완료되었는지 URL 또는 특정 요소로 재검증
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      console.error("❌ 로그인 실패: 여전히 로그인 페이지에 머물러 있습니다.");
      throw new Error("Login failed (Redirect stuck)");
    }
    
    await page.waitForTimeout(2000);
    console.log("🎉 로그인 성공! (현재 URL:", currentUrl, ")");
  } else {
    console.log("✅ 이미 로그인된 세션입니다.");
  }
}

module.exports = {
  prisma,
  redis,
  CrawlerContext,
  Pipeline,
  BlockDetectedError,
  SessionExpiredError,
  withPrismaRetry,
  checkLogin,
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  USER_DATA_DIR: path.join(__dirname, '../user_data')
};
