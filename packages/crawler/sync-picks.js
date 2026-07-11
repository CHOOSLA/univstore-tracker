const { prisma, redis, enqueueTasks } = require('./lib/engine');
require('dotenv').config();

/**
 * EVERYUNIV 추천 PICK 수집.
 *
 * 신 사이트는 홈이 SPA라 DOM 스크랩으로는 앵커 몇 개만 잡혔다.
 * 대신 홈이 사용하는 공개 API(web-api storefront/home)의 recommendItemList를
 * 직접 읽어 추천 상품 ID를 확보한다. 로그인/브라우저 불필요.
 */
async function scoutDailyPicks() {
  console.log('🕵️ [Scout] 추천 PICK 수집 (web-api storefront/home)...');
  try {
    const res = await fetch('https://web-api.univstore.com/api/v1/storefront/home', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.univstore.com/',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`storefront/home HTTP ${res.status}`);
    const json = await res.json();
    const list = json?.result?.recommendItemList || [];
    const pickIds = [...new Set(list.map((x) => String(x.id)).filter(Boolean))];

    if (pickIds.length === 0) {
      console.warn('⚠️ [Scout] 추천 상품을 발견하지 못했습니다.');
      return;
    }
    console.log(`✅ [Scout] ${pickIds.length}개의 추천 상품 확보. 우선순위 큐로 전송 중...`);

    // 1. DailyPick 갱신 (UI용). 아직 Product에 없는 신규 추천은 FK 실패 → skip(크롤 후 반영).
    await prisma.dailyPick.deleteMany({});
    for (const id of pickIds) {
      await prisma.dailyPick.create({ data: { productId: id } }).catch(() => {});
    }

    // 2. Redis 우선순위 큐(ZSET score=0)에 새치기 등록 → 크롤러가 먼저 수집
    await enqueueTasks(pickIds, true);

    console.log('🏁 [Scout] 탐색 공정 완료. (ID 큐 전송 완료)');
  } catch (err) {
    console.error('❌ [Scout] 치명적 에러:', err.message);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

scoutDailyPicks();
