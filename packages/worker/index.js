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
      const { id, title, price, timestamp } = payload;

      console.log(`\n[${new Date().toLocaleTimeString()}] 📦 새 데이터 수신: [${id}] ${title}`);

      // 1. 이전 최신 가격 조회 (비교용)
      const lastRecord = await prisma.priceHistory.findFirst({
        where: { productId: id },
        orderBy: { timestamp: 'desc' }
      });

      // 2. 상품 정보 업데이트 (Upsert)
      await prisma.product.upsert({
        where: { id: id },
        update: { title: title },
        create: { id: id, title: title }
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

// 프로세스 종료 시 자원 해제
process.on('SIGINT', async () => {
  console.log("\n👋 Worker 종료 중...");
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

processQueue().catch(err => {
  console.error("🔥 워커 치명적 에러:", err);
  process.exit(1);
});
