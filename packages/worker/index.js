require('dotenv').config();
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const TelegramBot = require('node-telegram-bot-api');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Telegram 봇 초기화
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = token ? new TelegramBot(token) : null;

/**
 * Redis Queue에서 메시지를 하나씩 꺼내어 DB에 저장하고 분석 로직을 태웁니다.
 */
async function processQueue() {
  console.log("👷 Worker가 시작되었습니다. 대기열을 감시합니다...");

  if (!bot) {
    console.warn("⚠️ 텔레그램 설정이 완료되지 않았습니다. 알림 없이 수집만 진행합니다.");
  }

  // 여러 큐를 동시에 감시 (Blocking Pop from multiple lists)
  while (true) {
    try {
      const data = await redis.blpop('univstore:price_updates', 'univstore:specials_updates', 0);
      if (!data) continue;

      const queueName = data[0];
      const payload = JSON.parse(data[1]);

      if (queueName === 'univstore:price_updates') {
        await handlePriceUpdate(payload);
      } else if (queueName === 'univstore:specials_updates') {
        await handleSpecialsUpdate(payload.data);
      }

    } catch (err) {
      console.error("❌ Worker 처리 도중 에러 발생:", err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function handlePriceUpdate(payload) {
  const { id, brand, title, price, originalPrice, imageUrl, stockStatus, bestBenefit, timestamp } = payload;
  console.log(`\n[${new Date().toLocaleTimeString()}] 📦 가격 데이터 수신: [${brand || 'Brand'}] ${title}`);

  const lastRecord = await prisma.priceHistory.findFirst({
    where: { productId: id },
    orderBy: { timestamp: 'desc' }
  });

  await prisma.product.upsert({
    where: { id: id },
    update: { brand, title, originalPrice, imageUrl, stockStatus, bestBenefit },
    create: { id, brand, title, originalPrice, imageUrl, stockStatus, bestBenefit }
  });

  await prisma.priceHistory.create({
    data: { productId: id, price, timestamp: new Date(timestamp) }
  });

  if (lastRecord && price < lastRecord.price) {
    const dropPercent = (((lastRecord.price - price) / lastRecord.price) * 100).toFixed(1);
    await prisma.systemLog.create({
      data: { type: 'ALERT', service: 'Worker', message: `가격 하락 감지: [${brand}] ${title} (-${dropPercent}%)` }
    });

    if (bot && chatId) {
      const message = `🚨 *가격 하락 알림!*\n\n📦 *상품명*: ${title}\n💰 *현재가*: ${price.toLocaleString()}원\n📉 *하락폭*: -${(lastRecord.price - price).toLocaleString()}원 (${dropPercent}%)\n🔗 [바로가기](https://www.univstore.com/item/${id})`;
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  }
}

async function handleSpecialsUpdate(data) {
  const { raffles, flashSales } = data;
  console.log(`\n[${new Date().toLocaleTimeString()}] 🎁 특가 데이터 수신: Raffle(${raffles.length}), FlashSale(${flashSales.length})`);

  for (const raffle of raffles) {
    await prisma.raffle.create({
      data: {
        title: raffle.title,
        brand: raffle.brand,
        entries: raffle.entries,
        endsAt: new Date(raffle.endsAt),
        status: 'Ongoing'
      }
    });
  }

  for (const sale of flashSales) {
    // 중복 방지를 위해 제목 기반으로 체크 (간단화)
    await prisma.flashSale.upsert({
      where: { id: sale.title }, // 임시: ID가 없으므로 제목을 ID처럼 사용하거나 로직 보강 필요
      update: { status: sale.status },
      create: { 
        title: sale.title, 
        startTime: new Date(sale.startTime), 
        endTime: new Date(sale.endTime),
        status: sale.status 
      }
    }).catch(() => {}); // ID 중복 에러 무시
  }

  await prisma.systemLog.create({
    data: { type: 'SUCCESS', service: 'Worker', message: `특가/래플 정보 ${raffles.length + flashSales.length}건 처리 완료` }
  });
}


// 프로세스 종료 관리 변수
let isShuttingDown = false;

// 프로세스 종료 시 자원 해제
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n👋 [${signal}] Worker 종료 중... (안전하게 연결을 닫는 중)`);
  
  try {
    // 1. 강제 종료 타이머 (3초 후에도 안 꺼지면 강제 종료)
    const forceExitTimeout = setTimeout(() => {
      console.error("⚠️ 클린업 시간이 너무 깁니다. 강제 종료합니다.");
      process.exit(1);
    }, 3000);

    // 2. Redis 연결 강제 차단 (blpop 대기를 끊어줍니다)
    if (redis) {
      await redis.disconnect();
      console.log("🔌 Redis 연결 해제 완료");
    }

    // 3. Prisma 연결 종료
    if (prisma) {
      await prisma.$disconnect();
      console.log("🗄️ DB 연결 해제 완료");
    }

    clearTimeout(forceExitTimeout);
    console.log("✨ Worker가 성공적으로 종료되었습니다.");
    process.exit(0);
  } catch (err) {
    console.error("❌ 종료 도중 에러 발생:", err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

processQueue().catch(err => {
  console.error("🔥 워커 치명적 에러:", err);
  process.exit(1);
});
