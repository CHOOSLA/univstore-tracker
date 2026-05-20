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
      const isConnectionError = err.message.includes('closed') || 
                                err.message.includes('connection') || 
                                err.message.includes('Server has closed') ||
                                err.message.includes('Broken pipe');
                                
      if (isConnectionError && i < retries - 1) {
        console.log(`⚠️ DB 연결 유실 감지 (시도 ${i + 1}/${retries}). 5초 후 재시도...`);
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
  await page.goto('https://www.univstore.com/user/login');
  
  if (await page.isVisible('input[name="userid"]')) {
    console.log("🔑 로그인 필요 감지. 세션 갱신을 시작합니다...");
    await page.click('.usEverytimeLoginTitle');
    await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
    await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
    await page.click('input[type="submit"]');
    
    // 최소한의 성공 판별 (기존 로직)
    await page.waitForURL(url => url.href.includes('univstore.com') && !url.href.includes('login'), { timeout: 60000 });
    console.log("🎉 로그인 성공!");
  } else {
    console.log("✅ 이미 로그인된 세션입니다.");
  }
}

// Redis 키 상수
const TASK_QUEUE_KEY = 'univstore:task_queue';

/**
 * 작업을 큐에 추가합니다. (Sorted Set 기반)
 * @param {string[]} ids 상품 ID 배열
 * @param {boolean} isPriority 우선순위 여부 (true면 가장 먼저 처리됨)
 */
async function enqueueTasks(ids, isPriority = false) {
  if (!ids || ids.length === 0) return;
  
  // 우선순위 아이템은 Score를 0으로 설정하여 큐의 맨 앞으로 보냄
  // 일반 아이템은 현재 타임스탬프를 사용하여 '가장 오래된 것'부터 나오게 함
  const score = isPriority ? 0 : Date.now();
  
  const pipeline = redis.pipeline();
  for (const id of ids) {
    if (isPriority) {
      pipeline.zadd(TASK_QUEUE_KEY, score, id);
    } else {
      pipeline.zadd(TASK_QUEUE_KEY, 'NX', score, id);
    }
  }
  await pipeline.exec();
}

/**
 * 가장 우선순위가 높거나(Score 0) 수집한 지 오래된 작업을 가져옵니다.
 */
async function getNextTasks(count = 1) {
  // ZPOPMIN: 가장 작은 Score를 가진 원소를 꺼내고 큐에서 제거
  const results = await redis.zpopmin(TASK_QUEUE_KEY, count);
  const ids = [];
  for (let i = 0; i < results.length; i += 2) {
    ids.push(results[i]);
  }
  return ids;
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
  USER_DATA_DIR: path.join(__dirname, '../user_data'),
  TASK_QUEUE_KEY,
  enqueueTasks,
  getNextTasks
};
