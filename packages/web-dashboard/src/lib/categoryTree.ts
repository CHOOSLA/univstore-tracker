import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// 카테고리/집계는 sync-categories(일 1회)로만 바뀜 → 데이터 캐시(15분)로 DB 부하 제거.
const CACHE_TTL = 900;

export type CatNode = {
  id: number;
  code: string;
  name: string;
  depth: number;
  count: number;
  children: CatNode[];
};

const VISIBLE = { imageUrl: { not: null }, stockStatus: { not: "Discontinued" } } as const;

/**
 * Category 테이블 → 카운트 포함 3단 트리.
 * 리프 카운트(현재 노출 상품 수)를 상위로 롤업한다.
 */
export const getCategoryTreeWithCounts = unstable_cache(async (): Promise<CatNode[]> => {
  const [cats, grouped] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { categoryId: { not: null }, ...VISIBLE },
      _count: { id: true },
    }),
  ]);

  const leafCount = new Map<number, number>();
  for (const g of grouped) if (g.categoryId != null) leafCount.set(g.categoryId, g._count.id);

  const byId = new Map<number, CatNode>();
  for (const c of cats) byId.set(c.id, { id: c.id, code: c.code, name: c.name, depth: c.depth, count: 0, children: [] });

  const roots: CatNode[] = [];
  for (const c of cats) {
    const node = byId.get(c.id)!;
    if (c.parentId != null && byId.has(c.parentId)) byId.get(c.parentId)!.children.push(node);
    else if (c.depth === 1) roots.push(node);
  }

  const rollup = (n: CatNode): number => {
    n.count = n.children.length === 0
      ? (leafCount.get(n.id) || 0)
      : n.children.reduce((s, ch) => s + rollup(ch), 0);
    return n.count;
  };
  roots.forEach(rollup);
  return roots;
}, ["category-tree-counts"], { revalidate: CACHE_TTL });

/**
 * 카테고리 code(어느 depth든) → 그 하위의 모든 리프 category id 배열.
 * 상품 필터(categoryId in leafIds)에 사용.
 */
export const getLeafIdsForCode = unstable_cache(async (code: string): Promise<number[]> => {
  const cats = await prisma.category.findMany({ select: { id: true, code: true, parentId: true } });
  const start = cats.find((c) => c.code === code);
  if (!start) return [];

  const childrenOf = new Map<number, number[]>();
  for (const c of cats) {
    if (c.parentId != null) {
      const arr = childrenOf.get(c.parentId) || [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
  }

  const leaves: number[] = [];
  const stack = [start.id];
  while (stack.length) {
    const id = stack.pop()!;
    const ch = childrenOf.get(id);
    if (!ch || ch.length === 0) leaves.push(id);
    else stack.push(...ch);
  }
  return leaves;
}, ["leaf-ids-for-code"], { revalidate: CACHE_TTL });

export type CategoryYield = {
  category: string;
  dealCount: number;
  avgDiscount: number; // % (정가 대비 학생가 할인율 평균)
  score: number;
};

/**
 * 대분류(depth1)별 학생 할인 효율.
 * 리프 categoryId별 집계를 트리 루트(대분류)로 롤업.
 * avgDiscount = 평균 (originalPrice-currentPrice)/originalPrice, score = 딜수 × 할인율.
 */
export const getCategoryDiscountYield = unstable_cache(async (): Promise<CategoryYield[]> => {
  const cats = await prisma.category.findMany({ select: { id: true, name: true, depth: true, parentId: true } });
  const byId = new Map(cats.map((c) => [c.id, c]));
  const rootOf = (id: number): { id: number; name: string } | null => {
    let c = byId.get(id);
    while (c && c.depth > 1 && c.parentId != null) c = byId.get(c.parentId);
    return c ? { id: c.id, name: c.name } : null;
  };

  const rows = await prisma.$queryRaw<{ categoryId: number; deals: bigint; avgdisc: number }[]>`
    SELECT "categoryId",
           COUNT(*)::bigint AS deals,
           AVG(("originalPrice" - "currentPrice")::numeric / "originalPrice")::float AS avgdisc
    FROM "Product"
    WHERE "categoryId" IS NOT NULL AND "originalPrice" > 0 AND "currentPrice" < "originalPrice"
      AND "imageUrl" IS NOT NULL AND "stockStatus" != 'Discontinued'
    GROUP BY "categoryId"
  `;

  const agg = new Map<number, { name: string; deals: number; weightedSum: number }>();
  for (const r of rows) {
    const root = rootOf(r.categoryId);
    if (!root) continue;
    const deals = Number(r.deals);
    const a = agg.get(root.id) || { name: root.name, deals: 0, weightedSum: 0 };
    a.deals += deals;
    a.weightedSum += r.avgdisc * deals;
    agg.set(root.id, a);
  }

  return [...agg.values()].map((a) => {
    const avgDiscount = a.deals > 0 ? (a.weightedSum / a.deals) * 100 : 0;
    return { category: a.name, dealCount: a.deals, avgDiscount, score: (a.deals * avgDiscount) / 100 };
  });
}, ["category-discount-yield"], { revalidate: CACHE_TTL });

/**
 * 카테고리 code → 루트까지의 경로(브레드크럼용). [대분류, 중분류, 소분류]
 */
export const getCategoryPath = unstable_cache(async (code: string): Promise<{ code: string; name: string }[]> => {
  const cats = await prisma.category.findMany({ select: { id: true, code: true, name: true, parentId: true } });
  const byId = new Map(cats.map((c) => [c.id, c]));
  let cur = cats.find((c) => c.code === code);
  const path: { code: string; name: string }[] = [];
  while (cur) {
    path.unshift({ code: cur.code, name: cur.name });
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return path;
}, ["category-path"], { revalidate: CACHE_TTL });
