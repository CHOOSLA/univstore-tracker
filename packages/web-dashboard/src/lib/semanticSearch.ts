import { prisma } from "@/lib/prisma";

/**
 * pgvector 시맨틱 검색 (+ 카테고리 스코핑).
 *
 * 과거: 35k×768 임베딩을 전부 Node로 끌어와 Float32Array 브루트포스.
 * 콜드 로드에 21초가 걸렸고(30분 TTL 만료·재배포마다 첫 검색자가 전부 부담),
 * 107MB가 프로세스에 상주했다. → HNSW 인덱스로 DB에서 top-k만 받는다(콜드 59ms/warm 3ms).
 *
 * 임베딩은 정규화(norm=1)돼 있어 내적 = 코사인. 연산자 <#>는 음수 내적을 주므로
 * score = -(a <#> b) 로 뒤집으면 기존 브루트포스 점수와 동일한 값이 된다.
 *
 * 카테고리 스코핑: 순수 임베딩만 쓰면 "가벼운 노트북"에 노트북 스탠드/파우치가 섞인다
 * (범용 모델 한계). 질의에 카테고리명이 있으면 그 하위 리프로 범위를 좁힌다.
 * 필터가 붙으면 HNSW가 후보 부족을 겪을 수 있어 DB에 hnsw.iterative_scan=relaxed_order,
 * hnsw.ef_search=100을 걸어뒀다(ALTER DATABASE).
 */

type CatInfo = { id: number; name: string; depth: number; parentId: number | null };

const TTL_MS = 30 * 60 * 1000;
const g = globalThis as any;

async function getCats(): Promise<CatInfo[]> {
  const cached: { at: number; data: CatInfo[] } | undefined = g.__catsCache;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  const data = await prisma.category.findMany({ select: { id: true, name: true, depth: true, parentId: true } });
  g.__catsCache = { at: Date.now(), data };
  return data;
}

/** 질의에 등장하는 카테고리명(가장 깊은/긴 것) → 그 하위 리프 category id 집합. 없으면 null. */
async function categoryScope(query: string): Promise<number[] | null> {
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
  const leaves: number[] = [];
  const stack = [target.id];
  while (stack.length) {
    const id = stack.pop()!;
    const ch = childrenOf.get(id);
    if (!ch || ch.length === 0) leaves.push(id);
    else stack.push(...ch);
  }
  return leaves;
}

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

/** 질의 → 상위 k개 {id, score}. 질의에 카테고리명이 있으면 그 범위로 스코프. */
export async function semanticSearch(query: string, k = 150): Promise<{ id: string; score: number }[]> {
  const [qv, scope] = await Promise.all([embedQuery(query), categoryScope(query)]);
  if (!qv || qv.length === 0) return [];

  // pgvector 리터럴: '[0.1,0.2,...]'
  const lit = `[${qv.join(",")}]`;

  try {
    const rows = scope && scope.length > 0
      ? await prisma.$queryRaw<{ id: string; score: number }[]>`
          SELECT id, -("embeddingVec" <#> ${lit}::vector) AS score
          FROM "Product"
          WHERE "embeddingVec" IS NOT NULL AND "categoryId" = ANY(${scope})
          ORDER BY "embeddingVec" <#> ${lit}::vector
          LIMIT ${k}
        `
      : await prisma.$queryRaw<{ id: string; score: number }[]>`
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
