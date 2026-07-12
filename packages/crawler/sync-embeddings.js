const { prisma, sleep } = require('./lib/engine');
require('dotenv').config();

/**
 * 상품명 임베딩 배치 생성 → Product.embedding 저장 (시맨틱 검색용).
 * embed 서비스(/embed)로 title을 배치 임베딩. 아직 임베딩 없거나 title이 바뀐 것만 갱신.
 * pm2 cron(일 1회) 권장.
 */
const EMBED_URL = process.env.EMBED_URL || 'http://localhost:8000';
const BATCH = 128;

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
    select: { id: true, title: true },
  });
  console.log(`  대상 ${targets.length}개 (미임베딩)`);
  if (targets.length === 0) { await prisma.$disconnect(); process.exit(0); }

  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    let vecs;
    try {
      vecs = await embedTexts(chunk.map((c) => c.title));
    } catch (e) {
      console.error(`  배치 ${i} 임베딩 실패: ${e.message}`); await sleep(2000); continue;
    }
    const now = new Date();
    await prisma.$transaction(
      chunk.map((c, j) =>
        prisma.product.update({ where: { id: c.id }, data: { embedding: vecs[j], embeddedAt: now } })
      )
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
