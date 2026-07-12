import { prisma } from "@/lib/prisma";

/**
 * 인메모리 시맨틱 검색.
 * 전 상품 임베딩을 한 번 로드해 Float32Array 행렬로 캐시(30분 TTL) → 질의 임베딩과 코사인 브루트포스.
 * 3만 규모라 pgvector 없이도 질의당 수 ms. (임베딩은 정규화돼 있어 내적 = 코사인)
 */

type VecIndex = { ids: string[]; mat: Float32Array; dim: number; loadedAt: number };

const TTL_MS = 30 * 60 * 1000;
const g = globalThis as any;

async function getIndex(): Promise<VecIndex | null> {
  const cached: VecIndex | undefined = g.__vecIndex;
  if (cached && Date.now() - cached.loadedAt < TTL_MS) return cached;

  // 임베딩 있는 상품만 로드 (단종 제외는 검색 단계에서 필터)
  const rows = await prisma.$queryRaw<{ id: string; embedding: number[] }[]>`
    SELECT id, embedding FROM "Product"
    WHERE "embeddedAt" IS NOT NULL AND array_length(embedding, 1) > 0
  `;
  if (rows.length === 0) return null;

  const dim = rows[0].embedding.length;
  const mat = new Float32Array(rows.length * dim);
  const ids = new Array<string>(rows.length);
  for (let i = 0; i < rows.length; i++) {
    ids[i] = rows[i].id;
    const e = rows[i].embedding;
    for (let j = 0; j < dim; j++) mat[i * dim + j] = e[j];
  }
  const idx: VecIndex = { ids, mat, dim, loadedAt: Date.now() };
  g.__vecIndex = idx;
  return idx;
}

async function embedQuery(query: string): Promise<Float32Array | null> {
  const url = process.env.EMBED_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url}/embed`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [query] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const v = (await res.json()).vectors?.[0];
    return v ? Float32Array.from(v) : null;
  } catch { return null; }
}

/** 질의 → 상위 k개 {id, score(코사인 0~1)} */
export async function semanticSearch(query: string, k = 150): Promise<{ id: string; score: number }[]> {
  const [idx, qv] = await Promise.all([getIndex(), embedQuery(query)]);
  if (!idx || !qv || qv.length !== idx.dim) return [];

  const { ids, mat, dim } = idx;
  const n = ids.length;
  // 내적(정규화 벡터 → 코사인). 부분 선택 정렬로 top-k.
  const scores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const off = i * dim;
    for (let j = 0; j < dim; j++) s += mat[off + j] * qv[j];
    scores[i] = s;
  }
  const order = Array.from({ length: n }, (_, i) => i)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, k);
  return order.map((i) => ({ id: ids[i], score: scores[i] }));
}
