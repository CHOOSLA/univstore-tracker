/**
 * originalPrice가 PriceHistory 중앙값보다 비현실적으로 낮은 경우(< 50%) median으로 보정.
 *
 * 배경:
 *   페이지 모드 시절 cross-contamination으로 다른 상품(주로 949,000원짜리)의 정가가
 *   명품 가방·고가 노트북 등의 originalPrice에 잘못 픽업되어 박혔다.
 *   예: 셀린느 토트백(122490)의 정가가 949,000원으로 저장됨 (실제는 약 2,033,000원)
 *   /market의 True Deals 계산이 이 originalPrice를 신뢰해서 -83% 같은 가짜 deal 노출.
 *
 * 일회성 마이그레이션. 적용 후 미래 방지는 ValidationFilter의 sanity check에 의존.
 *
 * 사용: node fix-original-price-outliers.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const prisma = new PrismaClient();
  console.log(`🔧 originalPrice outlier 정정 시작 (dry-run=${DRY_RUN})`);

  const candidates = await prisma.$queryRaw`
    WITH med AS (
      SELECT "productId",
             PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY price) AS m,
             COUNT(*) AS n
      FROM "PriceHistory" GROUP BY "productId"
    )
    SELECT p.id, p.title, p."originalPrice" AS bad_orig, med.m::int AS suggested_orig, med.n AS samples
    FROM "Product" p
    JOIN med ON med."productId" = p.id
    WHERE p."originalPrice" > 0 AND p."originalPrice" < med.m * 0.5 AND med.n >= 2
    ORDER BY p."originalPrice"
  `;

  console.log(`📋 대상 ${candidates.length}건`);
  for (const c of candidates.slice(0, 10)) {
    console.log(`  ${c.id} (${c.title.slice(0, 30)}): ${c.bad_orig.toLocaleString()} → ${c.suggested_orig.toLocaleString()} (samples=${c.samples})`);
  }
  if (candidates.length > 10) console.log(`  ... 외 ${candidates.length - 10}건`);

  if (DRY_RUN) {
    console.log('\n💤 dry-run 모드라 DB 변경 없음. 적용하려면 --dry-run 제거.');
  } else {
    const updated = await prisma.$executeRaw`
      WITH med AS (
        SELECT "productId",
               PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY price) AS m,
               COUNT(*) AS n
        FROM "PriceHistory" GROUP BY "productId"
      )
      UPDATE "Product" p
      SET "originalPrice" = med.m::int
      FROM med
      WHERE med."productId" = p.id
        AND p."originalPrice" > 0
        AND p."originalPrice" < med.m * 0.5
        AND med.n >= 2
    `;
    console.log(`\n✅ ${updated}건 갱신 완료`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
