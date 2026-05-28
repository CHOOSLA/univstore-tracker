import React from 'react';
import Link from 'next/link';
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import SearchBar from "@/components/products/SearchBar";
import VirtualizedProductList from "@/components/products/VirtualizedProductList";
import CategoryMenu, { CategoryCounts } from "@/components/products/CategoryMenu";
import { Suspense } from 'react';
import { getSearchKeywords } from "@/lib/search-utils";

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; q?: string; menuCategory?: string; menuSubCategory?: string; thirdCategory?: string; sort?: string; filter?: string }>;
}) {
  const { brand: brandFilter, q: searchQuery, menuCategory, menuSubCategory, thirdCategory, sort: sortOption = 'latest', filter: activeFilter } = await searchParams;

  // 지능형 검색 키워드 생성 (유사어 지원)
  const searchKeywords = searchQuery ? getSearchKeywords(searchQuery) : [];

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

  // 1. 기본 필터 정의 (array 컬럼은 has 연산자로 N:M 필터링)
  const whereClause = {
    AND: [
      { imageUrl: { not: null } },
      brandFilter ? { brand: brandFilter } : {},
      menuCategory ? { menuCategories: { has: menuCategory } } : {},
      menuSubCategory ? { menuSubCategories: { has: menuSubCategory } } : {},
      thirdCategory ? { thirdCategories: { has: thirdCategory } } : {},
      filteredIds ? { id: { in: filteredIds } } : activeFilter ? { id: { in: [] } } : {}, // activeFilter가 있지만 매칭되는 ID가 없는 경우를 위한 빈 리스트 가드
      searchQuery ? {
        OR: searchKeywords.flatMap(kw => [
          { title: { contains: kw, mode: 'insensitive' } },
          { brand: { contains: kw, mode: 'insensitive' } },
          { id: { contains: kw } },
        ])
      } : {}
    ]
  };

  // 2. 데이터베이스 쿼리 실행
  const [productsRaw, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: whereClause as any,
      include: {
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 14,
        },
      },
      orderBy: sortOption === 'latest' ? { updatedAt: 'desc' } : undefined,
      take: 100, // 정렬을 위해 넉넉하게 가져옴
    }),
    prisma.product.count({ where: whereClause as any })
  ]);

  // 3. 메모리 상에서의 고급 정렬 (할인율, 가격 등)
  let productsSorted = [...productsRaw];
  if (sortOption === 'discount') {
    productsSorted.sort((a, b) => {
      const aCurr = a.priceHistory[0]?.price || 0;
      const aOld = a.originalPrice || aCurr;
      const aRate = aOld > 0 ? (aOld - aCurr) / aOld : 0;
      
      const bCurr = b.priceHistory[0]?.price || 0;
      const bOld = b.originalPrice || bCurr;
      const bRate = bOld > 0 ? (bOld - bCurr) / bOld : 0;
      
      return bRate - aRate;
    });
  } else if (sortOption === 'price-asc') {
    productsSorted.sort((a, b) => (a.priceHistory[0]?.price || 0) - (b.priceHistory[0]?.price || 0));
  }

  // 4. 메뉴 분류별 상품 수 (array는 CROSS JOIN LATERAL UNNEST로 별도 펼침)
  // 멀티 unnest를 SELECT 절에 같이 쓰면 row-wise 매칭이라 길이 불일치 시 NULL pad 발생
  // COUNT(DISTINCT id)로 한 상품이 여러 sub/third에 속해도 각 조합당 1번씩만 카운트
  const [mainCounts, subCounts, thirdCounts] = await Promise.all([
    prisma.$queryRaw<{ name: string; cnt: bigint }[]>`
      SELECT m AS name, COUNT(DISTINCT p.id) AS cnt
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."menuCategories") AS m
      WHERE p."imageUrl" IS NOT NULL
      GROUP BY m
    `,
    prisma.$queryRaw<{ main: string; sub: string; cnt: bigint }[]>`
      SELECT m AS main, s AS sub, COUNT(DISTINCT p.id) AS cnt
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."menuCategories") AS m
      CROSS JOIN LATERAL UNNEST(p."menuSubCategories") AS s
      WHERE p."imageUrl" IS NOT NULL
      GROUP BY m, s
    `,
    prisma.$queryRaw<{ main: string; sub: string; third: string; cnt: bigint }[]>`
      SELECT m AS main, s AS sub, t AS third, COUNT(DISTINCT p.id) AS cnt
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."menuCategories") AS m
      CROSS JOIN LATERAL UNNEST(p."menuSubCategories") AS s
      CROSS JOIN LATERAL UNNEST(p."thirdCategories") AS t
      WHERE p."imageUrl" IS NOT NULL
      GROUP BY m, s, t
    `,
  ]);

  const categoryCounts: CategoryCounts = {
    byMain: Object.fromEntries(mainCounts.map(c => [c.name, Number(c.cnt)])),
    bySub: Object.fromEntries(subCounts.map(c => [`${c.main}|${c.sub}`, Number(c.cnt)])),
    byThird: Object.fromEntries(thirdCounts.map(c => [`${c.main}|${c.sub}|${c.third}`, Number(c.cnt)])),
  };

  const initialCursor = productsSorted.length === 100 ? productsSorted[productsSorted.length - 1].id : null;

  // JSON 직렬화 안전성 보장 (Date 객체 등 처리)
  const safeInitialItems = JSON.parse(JSON.stringify(productsSorted));

  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 space-y-8 md:space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-blue-500 mb-1">
              <Layers size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Market Intelligence</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Explorer.</h1>
            <p className="text-zinc-500 text-base md:text-lg max-w-2xl leading-snug">
              {searchQuery
                ? `"${searchQuery}" 검색 결과`
                : thirdCategory
                ? `${menuCategory} > ${menuSubCategory} > ${thirdCategory} 분석 센터`
                : menuSubCategory
                ? `${menuCategory} > ${menuSubCategory} 카테고리 분석 센터`
                : menuCategory
                ? `${menuCategory} 카테고리 분석 센터`
                : "전국 대학생 복지 스토어 실시간 가격 및 혜택 추적 시스템"}
            </p>
          </div>
          <div className="flex items-center">
             <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-4 py-2 rounded-full border border-emerald-500/20 uppercase tracking-widest">
               {totalCount.toLocaleString()} Intel Points Found
             </div>
          </div>
        </header>
        
        {activeFilter && (
          <div className="flex flex-wrap items-center gap-2 px-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Special Filter</span>
            <div className="flex items-center space-x-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl shadow-[0_0_12px_rgba(59,130,246,0.08)]">
              <span>
                {activeFilter === 'flash' && '⚡ 반짝 가격 하락 (Flash Drops)'}
                {activeFilter === 'true' && '🔥 평균 대비 저렴 (True Deals)'}
                {activeFilter === 'golden' && '🏆 역대 최저가 달성'}
                {activeFilter === 'target' && '🎯 인기 알림 저격 (Most Hunted)'}
                {activeFilter === 'defense' && '🚨 브랜드 가격 방어선 붕괴'}
              </span>
              <Link
                href={{
                  pathname: '/products',
                  query: {
                    ...(searchQuery ? { q: searchQuery } : {}),
                    ...(brandFilter ? { brand: brandFilter } : {}),
                    ...(menuCategory ? { menuCategory } : {}),
                    ...(menuSubCategory ? { menuSubCategory } : {}),
                    ...(thirdCategory ? { thirdCategory } : {}),
                    ...(sortOption !== 'latest' ? { sort: sortOption } : {}),
                  }
                }}
                className="hover:text-white hover:bg-white/10 rounded-md p-0.5 transition-all ml-1 font-black text-xs inline-flex items-center justify-center w-4 h-4"
              >
                ✕
              </Link>
            </div>
          </div>
        )}

        {/* --- [Toolbar: Search, Sort & Brands] --- */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col lg:flex-row gap-3 md:gap-4 bg-zinc-900/30 p-2 md:p-3 rounded-2xl md:rounded-[32px] border border-white/5 backdrop-blur-md">
            <Suspense fallback={<div className="flex-1 h-12 bg-zinc-900/50 animate-pulse rounded-2xl" />}>
              <div className="flex-1">
                <SearchBar />
              </div>
            </Suspense>
            
            <div className="flex items-center space-x-2 px-2 md:px-4 lg:border-l border-white/5 overflow-x-auto no-scrollbar py-1 md:py-0">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 hidden xl:block shrink-0">Sort</span>
              {[
                { id: 'latest', label: 'Latest' },
                { id: 'discount', label: '% Off' },
                { id: 'price-asc', label: 'Low Price' }
              ].map((opt) => (
                <Link
                  key={opt.id}
                  href={{
                    pathname: '/products',
                    query: { ...(searchQuery ? { q: searchQuery } : {}), ...(brandFilter ? { brand: brandFilter } : {}), ...(menuCategory ? { menuCategory } : {}), ...(menuSubCategory ? { menuSubCategory } : {}), ...(thirdCategory ? { thirdCategory } : {}), ...(activeFilter ? { filter: activeFilter } : {}), sort: opt.id }
                  }}
                  className={cn(
                    "px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                    sortOption === opt.id ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10"
                  )}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-2 px-2 md:px-4 lg:border-l border-white/5 overflow-x-auto no-scrollbar py-1 md:py-0">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 hidden xl:block shrink-0">Brand</span>
              <Link href={{
                pathname: '/products',
                query: { ...(searchQuery ? { q: searchQuery } : {}), ...(menuCategory ? { menuCategory } : {}), ...(menuSubCategory ? { menuSubCategory } : {}), ...(thirdCategory ? { thirdCategory } : {}), ...(sortOption !== 'latest' ? { sort: sortOption } : {}), ...(activeFilter ? { filter: activeFilter } : {}) }
              }} className={cn(
                "px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                !brandFilter ? "bg-zinc-100 text-black border-white" : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10"
              )}>All</Link>
              {['Apple', '삼성'].map(b => (
                <Link
                  key={b}
                  href={{
                    pathname: '/products',
                    query: { brand: b, ...(searchQuery ? { q: searchQuery } : {}), ...(menuCategory ? { menuCategory } : {}), ...(menuSubCategory ? { menuSubCategory } : {}), ...(thirdCategory ? { thirdCategory } : {}), ...(sortOption !== 'latest' ? { sort: sortOption } : {}), ...(activeFilter ? { filter: activeFilter } : {}) }
                  }}
                  className={cn(
                    "px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                    brandFilter === b ? "bg-zinc-100 text-black border-white" : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10"
                  )}
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>

          {/* 공식 메뉴 분류 기반 메가메뉴 (univstore 8 × 65 × 444 트리) */}
          <Suspense fallback={<div className="h-14 bg-zinc-900/30 rounded-2xl animate-pulse" />}>
            <CategoryMenu counts={categoryCounts} />
          </Suspense>
        </div>

        {/* Virtualized Infinite List */}
        <VirtualizedProductList
          initialItems={safeInitialItems}
          initialCursor={initialCursor}
          searchParams={{ q: searchQuery, brand: brandFilter, menuCategory, menuSubCategory, thirdCategory, sort: sortOption, filter: activeFilter }}
        />
      </main>
    </div>
  );
}
