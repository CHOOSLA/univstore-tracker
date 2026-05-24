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
      }
      // [DISABLED] specials_updates - 수집 데이터 품질 이슈로 비활성화
      // else if (queueName === 'univstore:specials_updates') {
      //   await handleSpecialsUpdate(payload.data);
      // }

    } catch (err) {
      console.error("❌ Worker 처리 도중 에러 발생:", err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function handlePriceUpdate(payload) {
  const { id, brand, title, price, originalPrice, imageUrl, stockStatus, bestBenefit, category, subCategory, timestamp } = payload;
  
  // 가격 유효성 검사 (0원 또는 NaN 방어)
  if (!price || isNaN(price) || price <= 0) {
    console.log(`\n[${new Date().toLocaleTimeString()}] ⚠️ 유효하지 않은 가격 데이터 무시: [ID ${id}] ${title} (Price: ${price})`);
    return;
  }

  console.log(`\n[${new Date().toLocaleTimeString()}] 📦 가격 데이터 수신: [${brand || 'Brand'}] ${title}`);

  try {
    const lastRecord = await prisma.priceHistory.findFirst({
      where: { productId: id },
      orderBy: { timestamp: 'desc' }
    });

    // 트랜잭션으로 상품 정보와 히스토리를 묶어서 처리
    await prisma.$transaction([
      prisma.product.upsert({
        where: { id: id },
        update: { brand, title, originalPrice, imageUrl, stockStatus, bestBenefit, category, subCategory },
        create: { id, brand, title, originalPrice, imageUrl, stockStatus, bestBenefit, category, subCategory }
      }),
      prisma.priceHistory.create({
        data: { productId: id, price, timestamp: new Date(timestamp) }
      })
    ]);

    // --- [목표 가격 알림 체크 로직 추가] ---
    // 1. 실질 구매가 계산 (대시보드와 동일한 룰 적용)
    const calculateFinalPrice = (price, benefit) => {
      if (!benefit) return price;
      const maxMatch = benefit.match(/(\d+)만/);
      const maxLimit = maxMatch ? parseInt(maxMatch[1]) * 10000 : 0;
      let rate = 0;
      if (benefit.includes('페이코머니')) rate = 0.03;
      else if (benefit.includes('토스페이')) rate = 0.10;
      else if (benefit.includes('최대')) rate = 0.03;
      const discount = Math.min(Math.floor(price * rate), maxLimit || Infinity);
      return price - discount;
    };

    const finalPrice = calculateFinalPrice(price, bestBenefit);

    // --- [시스템 설정 로드 및 적용] ---
    const configs = await prisma.systemConfig.findMany();
    const configMap = {};
    configs.forEach(c => configMap[c.key] = c.value);
    
    const telegramEnabled = configMap['TELEGRAM_ENABLED'] !== 'false';
    const minDropRate = parseInt(configMap['MIN_DROP_RATE'] || '10');

    // 2. 활성화된 알림 중 목표가에 도달한 항목 조회
    if (telegramEnabled) {
      const activeAlerts = await prisma.priceAlert.findMany({
        where: {
          productId: id,
          isActive: true,
          targetPrice: { gte: finalPrice }
        }
      });

      for (const alert of activeAlerts) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (alert.lastNotifiedAt && new Date(alert.lastNotifiedAt) >= today) continue;

        if (bot && chatId) {
          const message = `🎯 *목표 가격 도달 알림!*\n\n📦 *상품명*: ${title}\n🔥 *현재 실질 구매가*: ${finalPrice.toLocaleString()}원\n📍 *설정 목표가*: ${alert.targetPrice.toLocaleString()}원 이하\n🎁 *혜택*: ${bestBenefit || '기본'}\n🔗 [바로가기](https://www.univstore.com/item/${id})`;
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
          await prisma.priceAlert.update({ where: { id: alert.id }, data: { lastNotifiedAt: new Date() } });
        }
      }
    }

    // 3. 기존의 단순 가격 하락 알림 로직 (설정한 최소 하락율 이상일 때만 발송)
    if (lastRecord && price < lastRecord.price) {
      const dropPercent = (((lastRecord.price - price) / lastRecord.price) * 100);
      
      if (dropPercent >= minDropRate) {
        await prisma.systemLog.create({
          data: { type: 'ALERT', service: 'Worker', message: `가격 하락 감지: [${brand}] ${title} (-${dropPercent.toFixed(1)}%)` }
        });

        if (telegramEnabled && bot && chatId) {
          const message = `🚨 *가격 하락 알림 (${minDropRate}% 이상)!*\n\n📦 *상품명*: ${title}\n💰 *현재가*: ${price.toLocaleString()}원\n📉 *하락폭*: -${(lastRecord.price - price).toLocaleString()}원 (${dropPercent.toFixed(1)}%)\n🔗 [바로가기](https://www.univstore.com/item/${id})`;
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }
      }
    }
  } catch (err) {
    console.error(`❌ 상품 ${id} 처리 실패:`, err.message);
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
