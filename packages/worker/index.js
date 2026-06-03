require('dotenv').config();
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const TelegramBot = require('node-telegram-bot-api');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Telegram 봇 초기화 (실시간 메시지 수신용 polling 활성화)
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = token ? new TelegramBot(token, { polling: true }) : null;

// 비회원 1:1 알림 토큰(/start UW-XXXXXX) 매핑 처리 리스너
if (bot) {
  bot.onText(/\/start (UW-[A-Z0-9]+)/, async (msg, match) => {
    const subscriberChatId = msg.chat.id.toString();
    const subToken = match[1];
    console.log(`🤖 Telegram subscriber connection requested: token=${subToken}, chatId=${subscriberChatId}`);

    try {
      await prisma.telegramSubscriber.upsert({
        where: { token: subToken },
        update: { chatId: subscriberChatId },
        create: { token: subToken, chatId: subscriberChatId }
      });
      await bot.sendMessage(subscriberChatId, "✅ *UnivWatch 알림 연동 성공*\n\n이제 UnivWatch의 모든 실시간 가격 하락 알림을 본 채팅방에서 받아보실 수 있습니다.", { parse_mode: 'Markdown' });
      console.log(`✅ Connection succeeded: token=${subToken} -> chatId=${subscriberChatId}`);
    } catch (err) {
      console.error("❌ Connection failed:", err.message);
      await bot.sendMessage(subscriberChatId, "❌ 연동 처리 도중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  });
}


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
    // 상품의 기존 가격 이력들을 조회하여 실시간 최저가, 최고가 및 30일 중간값 산출
    const allHistory = await prisma.priceHistory.findMany({
      where: { productId: id },
      select: { price: true, timestamp: true }
    });

    const priceList = [price, ...allHistory.map(h => h.price)];
    const lowestPrice = Math.min(...priceList);
    const highestPrice = Math.max(...priceList);

    // 가격 등급 0~100 (100=역대최저, 0=역대최고)
    const priceScore = highestPrice === lowestPrice
      ? 50
      : Math.max(0, Math.min(100, Math.round((highestPrice - price) * 100 / (highestPrice - lowestPrice))));

    // 직전 기록(가장 최근 timestamp) — 가격 하락 알림 비교 기준
    const lastRecord = allHistory.length > 0
      ? allHistory.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b)
      : null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPrices = [
      price,
      ...allHistory.filter(h => new Date(h.timestamp) >= thirtyDaysAgo).map(h => h.price)
    ];
    const medianPrice30d = getMedian(recentPrices);

    // 트랜잭션으로 상품 정보와 히스토리를 묶어서 처리
    await prisma.$transaction([
      prisma.product.upsert({
        where: { id: id },
        update: { 
          brand, 
          title, 
          originalPrice, 
          imageUrl, 
          stockStatus, 
          bestBenefit, 
          category, 
          subCategory,
          currentPrice: price,
          lowestPrice,
          highestPrice,
          medianPrice30d,
          priceScore
        },
        create: { 
          id, 
          brand, 
          title, 
          originalPrice, 
          imageUrl, 
          stockStatus, 
          bestBenefit, 
          category, 
          subCategory,
          currentPrice: price,
          lowestPrice,
          highestPrice,
          medianPrice30d,
          priceScore
        }
      }),
      prisma.priceHistory.create({
        data: { productId: id, price, timestamp: new Date(timestamp) }
      })
    ]);

    // 카드/결제수단 할인은 univstore가 per-item 구조화 값을 주지 않아 정확 계산 불가.
    // finalPrice(실질가) 계산 제거 — 가격 비교는 raw price 기준.
    // (목표가 알림 기능은 아래 주석 블록으로 이미 비활성)

    // --- [시스템 설정 로드 및 적용] ---
    const configs = await prisma.systemConfig.findMany();
    const configMap = {};
    configs.forEach(c => configMap[c.key] = c.value);
    
    const telegramEnabled = configMap['TELEGRAM_ENABLED'] !== 'false';
    const minDropRate = parseInt(configMap['MIN_DROP_RATE'] || '10');

    // 2. 계정 귀속 목표가 알림: 현재가가 목표가 이하로 떨어진 활성 알림 처리
    //    (raw price 기준. 텔레그램 연동된 계정에만 푸시, 인앱 표시는 항상 동작)
    if (telegramEnabled && bot) {
      const activeAlerts = await prisma.priceAlert.findMany({
        where: {
          productId: id,
          isActive: true,
          userId: { not: null },
          targetPrice: { gte: price },
        },
      });

      for (const alert of activeAlerts) {
        // 일 1회 중복 발송 방지
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (alert.lastNotifiedAt && new Date(alert.lastNotifiedAt) >= today) continue;

        // 사용자 계정에 연동된 텔레그램 chatId 조회 (미연동 시 푸시 스킵)
        const sub = await prisma.telegramSubscriber.findFirst({
          where: { userId: alert.userId, NOT: { chatId: '' } },
        });
        if (!sub || !sub.chatId) continue;

        const message = `🎯 *목표가 도달 알림!*\n\n📦 *상품명*: ${title}\n💰 *현재가*: ${price.toLocaleString()}원\n📍 *목표가*: ${alert.targetPrice.toLocaleString()}원 이하\n🎁 *혜택*: ${bestBenefit || '기본'}\n🔗 [바로가기](https://www.univstore.com/item/${id})`;

        await new Promise(r => setTimeout(r, 40));
        try {
          await bot.sendMessage(sub.chatId, message, { parse_mode: 'Markdown' });
          await prisma.priceAlert.update({ where: { id: alert.id }, data: { lastNotifiedAt: new Date() } });
        } catch (err) {
          console.error(`❌ 목표가 알림 발송 실패 (alert ${alert.id}, chatId ${sub.chatId}): ${err.message}`);
        }
      }
    }

    // 3. 기존의 단순 가격 하락 알림 로직 (설정한 최소 하락율 이상일 때만 발송) -> 모든 구독자 대상 브로드캐스트로 확장
    if (lastRecord && price < lastRecord.price) {
      const dropPercent = (((lastRecord.price - price) / lastRecord.price) * 100);
      
      if (dropPercent >= minDropRate) {
        await prisma.systemLog.create({
          data: { type: 'ALERT', service: 'Worker', message: `가격 하락 감지: [${brand}] ${title} (-${dropPercent.toFixed(1)}%)` }
        });

        if (telegramEnabled && bot) {
          const message = `🚨 *가격 하락 알림 (${minDropRate}% 이상)!*\n\n📦 *상품명*: ${title}\n💰 *현재가*: ${price.toLocaleString()}원\n📉 *하락폭*: -${(lastRecord.price - price).toLocaleString()}원 (${dropPercent.toFixed(1)}%)\n🔗 [바로가기](https://www.univstore.com/item/${id})`;
          
          /* 기존 관리자 단일 알림 전송 (주석 처리 보존)
          if (chatId) {
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
          }
          */

          // 1. 관리자에게 우선 발송
          if (chatId) {
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(err => console.error(`❌ Admin alert failed: ${err.message}`));
          }

          // 2. 모든 등록 사용자에게 브로드캐스트 발송 (40ms Throttling spacing 적용)
          const subscribers = await prisma.telegramSubscriber.findMany();

          for (const sub of subscribers) {
            if (sub.chatId) {
              await new Promise(r => setTimeout(r, 40));
              await bot.sendMessage(sub.chatId, message, { parse_mode: 'Markdown' })
                .catch(err => console.error(`❌ Broadcast alert failed for chatId ${sub.chatId}: ${err.message}`));
            }
          }
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

function getMedian(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[half];
  }
  return Math.round((sorted[half - 1] + sorted[half]) / 2);
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
