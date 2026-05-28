import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getSearchKeywords } from "@/lib/search-utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const brand = searchParams.get('brand');
  const menuCategory = searchParams.get('menuCategory');
  const menuSubCategory = searchParams.get('menuSubCategory');
  const thirdCategory = searchParams.get('thirdCategory');
  const sort = searchParams.get('sort') || 'latest';
  const cursor = searchParams.get('cursor');
  const limit = 20;

  const searchKeywords = q ? getSearchKeywords(q) : [];
  const activeFilter = searchParams.get('filter');

  // 특수 핫딜 필터링을 위한 상품 ID 추출
  let filteredIds: string[] | undefined = undefined;

  if (activeFilter) {
    let idsRow: { id: string }[] = [];
    if (activeFilter === 'flash') {
      idsRow = await prisma.$queryRaw<{ id: string }[]>`
        WITH price_48h_ago AS (
          SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
          FROM "PriceHistory" ph
          WHERE ph.timestamp >= NOW() - INTERVAL '48 hours' AND ph.timestamp < NOW() - INTERVAL '24 hours'
          ORDER BY ph."productId", ph.timestamp ASC
        )
        SELECT p.id
        FROM "Product" p
        JOIN price_48h_ago old ON p.id = old."productId"
        WHERE p."currentPrice" < old.price
          AND p."currentPrice" >= 10000
          AND ((old.price - p."currentPrice")::numeric / old.price::numeric) < 0.7
          AND p."imageUrl" IS NOT NULL
      `;
    } else if (activeFilter === 'true') {
      idsRow = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "Product"
        WHERE "currentPrice" < "medianPrice30d"
          AND "currentPrice" >= 10000
          AND "medianPrice30d" > 0
          AND (("medianPrice30d" - "currentPrice")::numeric / "medianPrice30d"::numeric) < 0.6
          AND "imageUrl" IS NOT NULL
      `;
    } else if (activeFilter === 'golden') {
      idsRow = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "Product"
        WHERE "currentPrice" <= "lowestPrice"
          AND "originalPrice" > "lowestPrice"
          AND "imageUrl" IS NOT NULL
      `;
    } else if (activeFilter === 'target') {
      idsRow = await prisma.$queryRaw<{ id: string }[]>`
        WITH alert_counts AS (
          SELECT "productId", COUNT(*)::int as alerts_count
          FROM "PriceAlert"
          WHERE "isActive" = true
          GROUP BY "productId"
        )
        SELECT p.id
        FROM "Product" p
        JOIN alert_counts ac ON p.id = ac."productId"
        WHERE p."imageUrl" IS NOT NULL
      `;
    } else if (activeFilter === 'defense') {
      idsRow = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "Product"
        WHERE brand IN ('Apple', 'Apple(애플)', 'Samsung', 'Samsung(삼성)', '삼성전자', '삼성', 'LG', 'LG전자', 'Sony', '소니', 'Dell', '델', 'HP', 'Lenovo', '레노버', 'Asus', '에이수스', 'Logitech', '로지텍', 'Intel', 'AMD', 'Nvidia')
          AND "currentPrice" < "medianPrice30d" * 0.92
          AND "medianPrice30d" > 0
          AND "imageUrl" IS NOT NULL
      `;
    }
    filteredIds = idsRow.map(r => r.id);
  }

  const where: any = {
    AND: [
      { imageUrl: { not: null } },
      brand ? { brand } : {},
      menuCategory ? { menuCategories: { has: menuCategory } } : {},
      menuSubCategory ? { menuSubCategories: { has: menuSubCategory } } : {},
      thirdCategory ? { thirdCategories: { has: thirdCategory } } : {},
      filteredIds ? { id: { in: filteredIds } } : activeFilter ? { id: { in: [] } } : {}, // activeFilter가 있지만 매칭되는 ID가 없는 경우를 위한 빈 리스트 가드
      q ? {
        OR: searchKeywords.flatMap(kw => [
          { title: { contains: kw, mode: 'insensitive' } },
          { brand: { contains: kw, mode: 'insensitive' } },
          { id: { contains: kw } },
          { menuCategory: { contains: kw, mode: 'insensitive' } },
          { menuSubCategory: { contains: kw, mode: 'insensitive' } },
        ])
      } : {}
    ]
  };

  try {
    const productsRaw = await prisma.product.findMany({
      where,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 14,
        },
      },
      orderBy: sort === 'latest' ? { updatedAt: 'desc' } : undefined,
    });

    // 메모리 정렬이 필요한 경우 (할인율 등)
    let products = [...productsRaw];
    if (sort === 'discount') {
      // 주의: 무한 스크롤에서의 전체 정렬은 복잡하므로 
      // 현재는 최신순 기반 커서 페이징만 완벽 지원하고, 
      // 정렬 모드에서는 일단 가져온 데이터 내에서 정렬함.
      // (정식 구현은 DB 필드에 할인율을 인덱싱해야 함)
      products.sort((a, b) => {
        const aCurr = a.priceHistory[0]?.price || 0;
        const aOld = a.originalPrice || aCurr;
        const aRate = aOld > 0 ? (aOld - aCurr) / aOld : 0;
        const bCurr = b.priceHistory[0]?.price || 0;
        const bOld = b.originalPrice || bCurr;
        const bRate = bOld > 0 ? (bOld - bCurr) / bOld : 0;
        return bRate - aRate;
      });
    } else if (sort === 'price-asc') {
      products.sort((a, b) => (a.priceHistory[0]?.price || 0) - (b.priceHistory[0]?.price || 0));
    }

    const nextCursor = products.length === limit ? products[products.length - 1].id : null;

    return NextResponse.json({
      items: products,
      nextCursor
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
