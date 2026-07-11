const { prisma, redis, sleep } = require('./lib/engine');
require('dotenv').config();

/**
 * 카테고리 트리 동기화 + 상품 카테고리/리뷰 태깅.
 *
 * 1) web-api /categories 트리(3단) → Category 테이블 upsert
 * 2) 각 leaf(depth3) categories/{code}/items 순회 →
 *    Product.categoryId + reviewCount/reviewAvgGrade/isMnoItem 태깅
 *
 * 공개 API라 로그인/브라우저 불필요. pm2 cron(일 1회) 권장.
 */
const WEBAPI = 'https://web-api.univstore.com/api/v1';

async function fetchJson(path) {
  try {
    const res = await fetch(`${WEBAPI}${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.univstore.com/', 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) { return null; }
}

function flattenTree(cats) {
  const rows = [];
  for (const c1 of cats) {
    rows.push({ id: c1.id, code: c1.urlPath, name: c1.name, depth: 1, parentId: null });
    for (const c2 of (c1.depth2CategoryList || [])) {
      rows.push({ id: c2.id, code: c2.urlPath, name: c2.name, depth: 2, parentId: c1.id });
      for (const c3 of (c2.depth3CategoryList || [])) {
        rows.push({ id: c3.id, code: c3.urlPath, name: c3.name, depth: 3, parentId: c2.id });
      }
    }
  }
  return rows;
}

async function run() {
  console.log('🗂️ [Category] 트리 수집...');
  const catJson = await fetchJson('/categories');
  const cats = Array.isArray(catJson?.result) ? catJson.result : [];
  if (cats.length === 0) { console.error('❌ 카테고리 트리 응답 없음'); process.exit(1); }

  const rows = flattenTree(cats);
  let order = 0;
  for (const r of rows) {
    const data = { code: r.code, name: r.name, depth: r.depth, parentId: r.parentId, sortOrder: order++ };
    await prisma.category.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    }).catch((e) => console.warn(`  cat upsert 실패 ${r.id}: ${e.message}`));
  }
  console.log(`  카테고리 ${rows.length}개 upsert (depth3 leaf ${rows.filter(r => r.depth === 3).length}개).`);

  // leaf 별 상품 순회 태깅
  const leaves = rows.filter((r) => r.depth === 3);
  let tagged = 0, seen = 0;
  for (const leaf of leaves) {
    let cursor = null;
    for (let g = 0; g < 300; g++) {
      const q = `/categories/${leaf.code}/items?limit=500${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const j = await fetchJson(q);
      const r = j?.result;
      if (!r || !Array.isArray(r.data)) break;
      for (const it of r.data) {
        seen++;
        await prisma.product.update({
          where: { id: String(it.id) },
          data: {
            categoryId: leaf.id,
            reviewCount: Number.isFinite(it.reviewCount) ? it.reviewCount : null,
            reviewAvgGrade: Number.isFinite(it.reviewAvgGrade) ? it.reviewAvgGrade : null,
            isMnoItem: typeof it.isMnoItem === 'boolean' ? it.isMnoItem : null,
          },
        }).then(() => { tagged++; }).catch(() => { /* 미수집 상품 → skip (다음 sync에 반영) */ });
      }
      if (!r.hasNext || !r.nextCursor) break;
      cursor = r.nextCursor;
      await sleep(25);
    }
    await sleep(15);
  }
  console.log(`✅ [Category] 완료 — 조회 ${seen}건 중 ${tagged}건 태깅.`);
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

run().catch((e) => { console.error('🔥 [Category] 치명:', e.message); process.exit(1); });
