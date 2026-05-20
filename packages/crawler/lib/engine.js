const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');

// 스텔스 플러그인 적용
chromium.use(stealth);

/**
 * 정식 Google Chrome 실행 경로를 하이브리드 방식으로 탐색합니다.
 * 1. 환경 변수 CHROME_PATH 확인
 * 2. 운영체제별 표준 경로 확인
 * 3. 찾지 못한 경우 undefined 반환 (내장 Chromium 사용)
 */
function getExecutablePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const standardPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows (x86)
    '/usr/bin/google-chrome', // Linux (Ubuntu/Debian)
    '/usr/bin/google-chrome-stable', // Linux Stable
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // macOS
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) return p;
  }

  return undefined;
}

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
      // 우선순위는 기존 점수를 덮어쓰고 맨 앞으로 보냄
      pipeline.zadd(TASK_QUEUE_KEY, score, id);
    } else {
      // 일반 등록은 기존에 없을 때만 추가 (NX)
      pipeline.zadd(TASK_QUEUE_KEY, 'NX', score, id);
    }
  }
  await pipeline.exec();
}

/**
 * 작업을 완료 처리하고 수집 시간을 업데이트합니다. (큐의 맨 뒤로 보냄)
 */
async function finishTask(id) {
  // 현재 시간으로 점수를 업데이트하여 가장 나중에 다시 수집되도록 함
  await redis.zadd(TASK_QUEUE_KEY, Date.now(), id);
}

/**
 * 수집에 실패하거나 나중에 다시 시도해야 할 작업을 다시 큐에 넣습니다. (맨 앞으로 보냄)
 */
async function failTask(id) {
  // 점수를 0으로 하여 다음에 바로 다시 시도되도록 함
  await redis.zadd(TASK_QUEUE_KEY, 0, id);
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

function getLaunchOptions(executablePath) {
  return {
    headless: true,
    executablePath,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--use-gl=desktop',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    ]
  };
}

module.exports = {
  prisma,
  redis,
  chromium, // 스텔스 기능이 적용된 전용 브라우저 엔진
  CrawlerContext,
  Pipeline,
  BlockDetectedError,
  SessionExpiredError,
  withPrismaRetry,
  checkLogin,
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  USER_DATA_DIR: path.join(__dirname, '../user_data'),
  getExecutablePath,
  getLaunchOptions,
  TASK_QUEUE_KEY,
  enqueueTasks,
  getNextTasks,
  finishTask,
  failTask
};
