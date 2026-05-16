require('dotenv').config();
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Redis Queue에서 메시지를 하나씩 꺼내어 DB에 저장하고 분석 로직을 태웁니다.
 */
async function processQueue() {
  console.log("👷 Worker가 시작되었습니다. 'univstore:price_updates' 대기열을 감시합니다...");

  while (true) {
    try {
      // Redis에서 데이터가 들어올 때까지 대기 (Blocking Pop)
      // 0은 무한 대기를 의미합니다.
      const data = await redis.blpop('univstore:price_updates', 0);
      if (!data) continue;

      const payload = JSON.parse(data[1]);
      const { id, title, price, timestamp } = payload;

      console.log(`\n[${new Date().toLocaleTimeString()}] 📦 새 데이터 수신: [${id}] ${title}`);

      // 1. 상품 정보 업데이트 (이미 있으면 제목 갱신, 없으면 생성)
      await prisma.product.upsert({
        where: { id: id },
        update: { title: title },
        create: { id: id, title: title }
      });

      // 2. 가격 이력 저장
      await prisma.priceHistory.create({
        data: {
          productId: id,
          price: price,
          timestamp: new Date(timestamp)
        }
      });

      console.log(`💾 DB 영구 저장 완료: ${price.toLocaleString()}원`);

      // TODO: [Phase 4] 텔레그램 알림 발송 로직 추가 지점
      // TODO: [Phase 5] Elasticsearch 색인 로직 추가 지점

    } catch (err) {
      console.error("❌ Worker 처리 도중 에러 발생:", err.message);
      // 에러 발생 시 잠시 쉬어줌 (서버 부하 방지)
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
