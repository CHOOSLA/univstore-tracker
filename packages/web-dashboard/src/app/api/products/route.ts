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

  const where: any = {
    AND: [
      { imageUrl: { not: null } },
      brand ? { brand } : {},
      menuCategory ? { menuCategory } : {},
      menuSubCategory ? { menuSubCategory } : {},
      thirdCategory ? { thirdCategory } : {},
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
