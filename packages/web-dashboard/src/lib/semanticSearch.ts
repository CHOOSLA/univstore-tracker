import { prisma } from "@/lib/prisma";

/**
 * pgvector 시맨틱 검색.
 *
 * 과거: 35k×768 임베딩을 전부 Node로 끌어와 Float32Array 브루트포스.
 * 콜드 로드에 21초가 걸렸고(30분 TTL 만료·재배포마다 첫 검색자가 전부 부담),
 * 107MB가 프로세스에 상주했다. → HNSW 인덱스로 DB에서 top-k만 받는다(콜드 59ms/warm 3ms).
 *
 * 임베딩은 정규화(norm=1)돼 있어 내적 = 코사인. 연산자 <#>는 음수 내적을 주므로
 * score = -(a <#> b) 로 뒤집으면 기존 브루트포스 점수와 동일한 값이 된다.
 *
 * 카테고리 스코핑은 제거함. 질의 substring이 카테고리명과 겹치면("에어팟 케이스"의
 * "케이스") 얕은 범용 카테고리로 하드 필터돼 오답(애플워치 케이스)을 냈다.
 * 원래 목적(액세서리 섞임 방지)은 이제 임베딩 입력에 카테고리명이 포함되고
 * (sync-embeddings의 brand+title+category+별칭), relevance 단계의 액세서리
 * 디부스트가 담당한다. 검색 로직 변경 시 scripts/search-eval.js로 회귀 검증할 것.
 */

async function embedQuery(query: string): Promise<number[] | null> {
  const url = process.env.EMBED_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url}/embed`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [query] }), signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const v = (await res.json()).vectors?.[0];
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}

/** 질의 → 상위 k개 {id, score}. */
export async function semanticSearch(query: string, k = 150): Promise<{ id: string; score: number }[]> {
  const qv = await embedQuery(query);
  if (!qv || qv.length === 0) return [];

  // pgvector 리터럴: '[0.1,0.2,...]'
  const lit = `[${qv.join(",")}]`;

  try {
    const rows = await prisma.$queryRaw<{ id: string; score: number }[]>`
      SELECT id, -("embeddingVec" <#> ${lit}::vector) AS score
      FROM "Product"
      WHERE "embeddingVec" IS NOT NULL
      ORDER BY "embeddingVec" <#> ${lit}::vector
      LIMIT ${k}
    `;
    return rows.map((r) => ({ id: r.id, score: Number(r.score) }));
  } catch {
    return [];
  }
}
