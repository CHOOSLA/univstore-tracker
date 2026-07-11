import { prisma } from "@/lib/prisma";

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
export async function getCategoryTreeWithCounts(): Promise<CatNode[]> {
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
}

/**
 * 카테고리 code(어느 depth든) → 그 하위의 모든 리프 category id 배열.
 * 상품 필터(categoryId in leafIds)에 사용.
 */
export async function getLeafIdsForCode(code: string): Promise<number[]> {
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
}

/**
 * 카테고리 code → 루트까지의 경로(브레드크럼용). [대분류, 중분류, 소분류]
 */
export async function getCategoryPath(code: string): Promise<{ code: string; name: string }[]> {
  const cats = await prisma.category.findMany({ select: { id: true, code: true, name: true, parentId: true } });
  const byId = new Map(cats.map((c) => [c.id, c]));
  let cur = cats.find((c) => c.code === code);
  const path: { code: string; name: string }[] = [];
  while (cur) {
    path.unshift({ code: cur.code, name: cur.name });
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return path;
}
