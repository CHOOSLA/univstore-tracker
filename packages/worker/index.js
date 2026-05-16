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
  console.log("👷 Worker가 시작되었습니다. 'univstore:price_updates' 대기열을 감시합니다...");

  if (!bot) {
    console.warn("⚠️ 텔레그램 설정이 완료되지 않았습니다. 알림 없이 수집만 진행합니다.");
  }

  while (true) {
    try {
      const data = await redis.blpop('univstore:price_updates', 0);
      if (!data) continue;

      const payload = JSON.parse(data[1]);
      const { id, title, price, imageUrl, timestamp } = payload;

      console.log(`\n[${new Date().toLocaleTimeString()}] 📦 새 데이터 수신: [${id}] ${title}`);

      // 1. 이전 최신 가격 조회 (비교용)
      const lastRecord = await prisma.priceHistory.findFirst({
        where: { productId: id },
        orderBy: { timestamp: 'desc' }
      });

      if (lastRecord) {
        console.log(`📊 이전 가격: ${lastRecord.price.toLocaleString()}원 | 현재 가격: ${price.toLocaleString()}원`);
      } else {
        console.log(`ℹ️ 이 상품의 첫 번째 수집 기록입니다. (비교 대상 없음)`);
      }

      // 2. 상품 정보 업데이트 (이미지 URL 추가)
      await prisma.product.upsert({
        where: { id: id },
        update: { 
          title: title,
          imageUrl: imageUrl 
        },
        create: { 
          id: id, 
          title: title,
          imageUrl: imageUrl
        }
      });

      // 3. 가격 이력 저장
      await prisma.priceHistory.create({
        data: {
          productId: id,
          price: price,
          timestamp: new Date(timestamp)
        }
      });

      console.log(`💾 DB 영구 저장 완료: ${price.toLocaleString()}원`);

      // 4. 가격 하락 감지 및 텔레그램 알림
      if (lastRecord && price < lastRecord.price) {
        const dropAmount = lastRecord.price - price;
        const dropPercent = ((dropAmount / lastRecord.price) * 100).toFixed(1);

        console.log(`🔔 가격 하락 감지! (${lastRecord.price.toLocaleString()}원 -> ${price.toLocaleString()}원)`);

        if (bot && chatId) {
          const message = `🚨 *가격 하락 알림!*\n\n` +
                          `📦 *상품명*: ${title}\n` +
                          `💰 *현재가*: ${price.toLocaleString()}원\n` +
                          `📉 *하락폭*: -${dropAmount.toLocaleString()}원 (${dropPercent}%)\n` +
                          `🔗 [상품 바로가기](https://www.univstore.com/item/${id})`;

          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
          console.log(`✉️ 텔레그램 알림 전송 완료`);
        }
      }

    } catch (err) {
      console.error("❌ Worker 처리 도중 에러 발생:", err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
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
