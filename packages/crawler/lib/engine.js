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

// 신 사이트는 로그인이 에브리타임 SSO + 2FA라 자동 재로그인이 불가능하다.
// 따라서 checkLogin은 '검증'만 한다: 학생가(price2)가 응답에 포함되면 인증된 세션.
// 미인증이면 SessionExpiredError를 던져 상위(init/loop)에서 관리자 알림 → prime-session 유도.
const SESSION_PROBE_IDS = ['9991', '138557', '62345'];

async function checkLogin(page) {
  console.log("🔍 세션 상태 확인 중...");
  for (const id of SESSION_PROBE_IDS) {
    try {
      const res = await page.request.get(`https://web-api.univstore.com/api/v1/items/${id}`, {
        headers: { 'Referer': `https://www.univstore.com/item/${id}` },
        timeout: 15000,
      });
      if (res.status() !== 200) continue;
      const j = await res.json();
      const it = j?.result?.item;
      if (!it) continue;
      // 학생전용 상품에 price2(학생가)가 있으면 로그인된 세션
      if (it.isOnlyForUnivStudent && it.price2 != null) {
        console.log("✅ 로그인된 세션 확인 (학생가 응답 정상).");
        return;
      }
      // 학생전용인데 price2 없음 = 미인증
      if (it.isOnlyForUnivStudent && it.price2 == null) {
        break;
      }
    } catch (_) { /* 다음 probe id 시도 */ }
  }
  console.error("🔐 세션 미인증 감지 — prime-session 재실행 필요.");
  throw new SessionExpiredError();
}

// Redis 키 상수
const TASK_QUEUE_KEY = 'univstore:task_queue';
const RETRY_COUNT_KEY = 'univstore:retry_count';
const MAX_IMMEDIATE_RETRIES = 5;
const PENALTY_DELAY_MS = 60 * 60 * 1000; // 5회 연속 실패 시 1시간 뒤로 미룸

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
 * 작업을 완료 처리합니다.
 * getNextTasks의 zpopmin이 이미 큐에서 제거했으므로 다시 추가하지 않습니다.
 * → 한 cycle 안에서 모든 item이 1번씩만 처리되고 큐가 자연스럽게 비워집니다.
 * → 다음 cycle은 PM2 cron_restart가 진입 시 enqueueTasks(NX)로 다시 채웁니다.
 */
async function finishTask(id) {
  // 재시도 카운터 정리는 best-effort. Redis 일시 장애(MISCONF 등)로 실패해도
  // 크롤 루프를 죽이지 않도록 흡수한다.
  try {
    await redis.hdel(RETRY_COUNT_KEY, id);
  } catch (err) {
    console.error(`⚠️ finishTask Redis 오류 (ID ${id}), 무시: ${err.message}`);
  }
}

/**
 * 수집에 실패한 작업을 큐에 다시 넣습니다.
 * 임계값 초과 시 큐에 다시 넣지 않고 영구 제외 (다음 cycle에 사이트맵으로 재진입).
 */
async function failTask(id) {
  // 디스크 풀 등으로 Redis가 stop-writes-on-bgsave-error 상태에 빠지면
  // hincrby/zadd가 MISCONF로 throw한다. 과거 이 throw가 catch 블록 안에서
  // 다시 던져져 프로세스를 죽였다(autorestart:false라 12h cron까지 박제).
  // 재시도 기록은 best-effort이므로 실패를 흡수하고 루프를 계속 살린다.
  // 누락된 item은 다음 cycle 사이트맵 재진입으로 복구된다.
  try {
    const retries = await redis.hincrby(RETRY_COUNT_KEY, id, 1);

    if (retries >= MAX_IMMEDIATE_RETRIES) {
      // 임계값 초과: 큐에 다시 넣지 않고 영구 실패 처리 (다음 cycle에 재시도)
      await redis.hdel(RETRY_COUNT_KEY, id);
      console.warn(`⏳ [ID ${id}] ${retries}회 연속 실패, 이번 cycle에서 제외`);
    } else {
      // 정상 범위: score=0으로 큐 맨 앞에 다시 추가
      await redis.zadd(TASK_QUEUE_KEY, 0, id);
    }
  } catch (err) {
    console.error(`⚠️ failTask Redis 오류 (ID ${id}), 건너뜀: ${err.message}`);
  }
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

const { blockGuard, sendTelegramAlert } = require('./blockGuard');

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
  failTask,
  blockGuard,
  sendTelegramAlert,
};
