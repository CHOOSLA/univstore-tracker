const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

async function test() {
  const payload = {
    id: '138746', 
    title: '[FINAL TEST] 가격 폭락 테스트',
    price: 1, // 1원! (아까 100원보다 낮음)
    timestamp: new Date().toISOString()
  };

  console.log("🚀 Redis로 1원 꿀매 메시지 전송 중...");
  await redis.rpush('univstore:price_updates', JSON.stringify(payload));
  console.log("✅ 전송 완료!");
  await redis.quit();
}
test();
