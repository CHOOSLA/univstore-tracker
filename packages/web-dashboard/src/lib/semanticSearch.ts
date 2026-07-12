import { prisma } from "@/lib/prisma";

/**
 * 인메모리 시맨틱 검색 (+ 카테고리 스코핑).
 * 순수 임베딩만 쓰면 "가벼운 노트북"에 노트북 스탠드/파우치가 섞임(범용 모델 한계).
 * → 질의에 카테고리명이 있으면 그 카테고리 상품으로 범위를 좁혀 정확도↑.
 * 3만 규모라 pgvector 없이 브루트포스(정규화 임베딩 내적=코사인). 30분 캐시.
 */

type VecIndex = { ids: string[]; cats: Int32Array; mat: Float32Array; dim: number; loadedAt: number };
type CatInfo = { id: number; name: string; depth: number; parentId: number | null };

const TTL_MS = 30 * 60 * 1000;
const g = globalThis as any;

async function getIndex(): Promise<VecIndex | null> {
  const cached: VecIndex | undefined = g.__vecIndex;
  if (cached && Date.now() - cached.loadedAt < TTL_MS) return cached;

  // Prisma $queryRaw는 대량 Float[]를 한 번에 napi 변환 시 실패 → 배치로 나눠 로드.
  const BATCH = 4000;
  const rows: { id: string; category_id: number | null; embedding: number[] }[] = [];
  for (let offset = 0; ; offset += BATCH) {
    const chunk = await prisma.$queryRaw<{ id: string; category_id: number | null; embedding: number[] }[]>`
      SELECT id, "categoryId" as category_id, embedding FROM "Product"
      WHERE "embeddedAt" IS NOT NULL AND array_length(embedding, 1) > 0
      ORDER BY id LIMIT ${BATCH} OFFSET ${offset}
    `;
    rows.push(...chunk);
    if (chunk.length < BATCH) break;
  }
  if (rows.length === 0) return null;

  const dim = rows[0].embedding.length;
  const mat = new Float32Array(rows.length * dim);
  const ids = new Array<string>(rows.length);
  const cats = new Int32Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    ids[i] = rows[i].id;
    cats[i] = rows[i].category_id ?? -1;
    const e = rows[i].embedding;
    for (let j = 0; j < dim; j++) mat[i * dim + j] = e[j];
  }
  const idx: VecIndex = { ids, cats, mat, dim, loadedAt: Date.now() };
  g.__vecIndex = idx;
  return idx;
}

async function getCats(): Promise<CatInfo[]> {
  const cached: { at: number; data: CatInfo[] } | undefined = g.__catsCache;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  const data = await prisma.category.findMany({ select: { id: true, name: true, depth: true, parentId: true } });
  g.__catsCache = { at: Date.now(), data };
  return data;
}

/** 질의에 등장하는 카테고리명(가장 깊은/긴 것) → 그 하위 리프 category id 집합. 없으면 null. */
async function categoryScope(query: string): Promise<Set<number> | null> {
  const cats = await getCats();
  const q = query.toLowerCase();
  const hits = cats.filter((c) => c.name.length >= 2 && q.includes(c.name.toLowerCase()));
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.depth - a.depth || b.name.length - a.name.length);
  const target = hits[0];

  const childrenOf = new Map<number, number[]>();
  for (const c of cats) if (c.parentId != null) {
    const a = childrenOf.get(c.parentId) || []; a.push(c.id); childrenOf.set(c.parentId, a);
  }
  const leaves = new Set<number>();
  const stack = [target.id];
  while (stack.length) {
    const id = stack.pop()!;
    const ch = childrenOf.get(id);
    if (!ch || ch.length === 0) leaves.add(id);
    else stack.push(...ch);
  }
  return leaves;
}

async function embedQuery(query: string): Promise<Float32Array | null> {
  const url = process.env.EMBED_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url}/embed`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [query] }), signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const v = (await res.json()).vectors?.[0];
    return v ? Float32Array.from(v) : null;
  } catch { return null; }
}

/** 질의 → 상위 k개 {id, score}. 질의에 카테고리명이 있으면 그 범위로 스코프. */
export async function semanticSearch(query: string, k = 150): Promise<{ id: string; score: number }[]> {
  const [idx, qv, scope] = await Promise.all([getIndex(), embedQuery(query), categoryScope(query)]);
  if (!idx || !qv || qv.length !== idx.dim) return [];

  const { ids, cats, mat, dim } = idx;
  const n = ids.length;
  const hits: { i: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (scope && !scope.has(cats[i])) continue;
    let s = 0; const off = i * dim;
    for (let j = 0; j < dim; j++) s += mat[off + j] * qv[j];
    hits.push({ i, s });
  }
  hits.sort((a, b) => b.s - a.s);
  return hits.slice(0, k).map((h) => ({ id: ids[h.i], score: h.s }));
}
