const { prisma, sleep } = require('./lib/engine');
require('dotenv').config();

/**
 * 상품 임베딩 배치 생성 → Product.embedding(Float[], 호환용) + embeddingVec(pgvector, 실검색 경로).
 *
 * 임베딩 입력은 title 단독이 아니라 `brand + title + 카테고리명 + 별칭`으로 구성한다.
 * title만 쓰면 영문 상품("AirPods 4")이 한글 질의("에어팟")와 멀어져 액세서리에 밀린다.
 * 실측: "에어팟" vs "AirPods 4" 0.530(경쟁 한글상품 0.587에 짐) →
 *       "+무선 이어폰(카테고리)" 0.705 → "+에어팟(별칭)" 0.832로 갭 소멸.
 * pm2 cron(일 1회). 전량 재생성이 필요하면 embeddedAt을 NULL로 리셋 후 실행.
 */
const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8000';
const BATCH = 128;

// 한↔영 별칭 (doc-side). title에 좌측 표기가 있으면 우측 표기를 임베딩 텍스트에 덧붙인다.
// 질의가 한글이든 영문이든 같은 벡터 근방에 오게 하는 목적. web-dashboard SYNONYM_MAP과 짝.
const ALIAS_PAIRS = [
  [/airpods/i, '에어팟'], [/에어팟/, 'airpods'],
  [/iphone/i, '아이폰'], [/아이폰/, 'iphone'],
  [/ipad/i, '아이패드'], [/아이패드/, 'ipad'],
  [/macbook/i, '맥북'], [/맥북/, 'macbook'],
  [/apple\s*watch/i, '애플워치'], [/애플워치/, 'apple watch'],
  [/galaxy/i, '갤럭시'], [/갤럭시/, 'galaxy'],
  [/\bbuds\b/i, '버즈'], [/버즈/, 'buds'],
  [/homepod/i, '홈팟'],
  [/notebook|laptop/i, '노트북'],
  [/keyboard/i, '키보드'], [/\bmouse\b/i, '마우스'],
  [/headphone/i, '헤드폰'], [/earphone|earbuds/i, '이어폰'],
  [/monitor/i, '모니터'], [/speaker/i, '스피커'],
];

/** brand + title + 카테고리명 + 별칭 → 임베딩 입력 텍스트 */
function buildEmbedText(p) {
  const parts = [];
  if (p.brand) parts.push(p.brand);
  parts.push(p.title);
  if (p.categoryNode?.name) parts.push(p.categoryNode.name);
  const base = parts.join(' ');
  const aliases = [];
  for (const [re, alias] of ALIAS_PAIRS) {
    if (re.test(base) && !base.includes(alias)) aliases.push(alias);
  }
  return aliases.length ? `${base} ${aliases.join(' ')}` : base;
}

async function embedTexts(texts) {
  const res = await fetch(`${EMBED_URL}/embed`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  return (await res.json()).vectors;
}

async function run() {
  console.log('🧬 [Embed] 임베딩 대상 조회...');
  // 노출 대상(단종 제외) 중 임베딩 없는 것 우선. 전량 재생성이 필요하면 embeddedAt 조건 조정.
  const targets = await prisma.product.findMany({
    where: { stockStatus: { not: 'Discontinued' }, embeddedAt: null },
    select: { id: true, title: true, brand: true, categoryNode: { select: { name: true } } },
  });
  console.log(`  대상 ${targets.length}개 (미임베딩)`);
  if (targets.length === 0) { await prisma.$disconnect(); process.exit(0); }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    let vecs;
    try {
      vecs = await embedTexts(chunk.map(buildEmbedText));
    } catch (e) {
      console.error(`  배치 ${i} 임베딩 실패: ${e.message}`); await sleep(2000); continue;
    }
    const now = new Date();
    // embedding(Float[])은 호환용으로 유지, embeddingVec(pgvector)이 실제 검색 경로.
    // vector 타입은 Prisma가 모르므로 $executeRaw로 함께 채운다. 누락되면 HNSW 검색에서 빠짐.
    await prisma.$transaction(
      chunk.flatMap((c, j) => [
        prisma.product.update({ where: { id: c.id }, data: { embedding: vecs[j], embeddedAt: now } }),
        prisma.$executeRaw`UPDATE "Product" SET "embeddingVec" = ${`[${vecs[j].join(',')}]`}::vector WHERE id = ${c.id}`,
      ])
    ).catch((e) => console.warn(`  배치 저장 실패 ${i}: ${e.message}`));
    done += chunk.length;
    if (done % 1024 === 0 || done === targets.length) console.log(`  ${done}/${targets.length}`);
    await sleep(20);
  }

  console.log(`✅ [Embed] 완료 — ${done}개 임베딩 저장.`);
  await prisma.$disconnect();
  process.exit(0);
}

run().catch((e) => { console.error('🔥 [Embed] 치명:', e.message); process.exit(1); });
