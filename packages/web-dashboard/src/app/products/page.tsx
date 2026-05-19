import React from 'react';
import Link from 'next/link';
import { 
  Filter, 
  CreditCard, 
  Truck,
  Zap,
  Layers,
  X
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import SearchBar from "@/components/products/SearchBar";
import VirtualizedProductList from "@/components/products/VirtualizedProductList";
import { Suspense } from 'react';
import { getSearchKeywords } from "@/lib/search-utils";

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; q?: string; category?: string; sort?: string }>;
}) {
  const { brand: brandFilter, q: searchQuery, category: categoryFilter, sort: sortOption = 'latest' } = await searchParams;

  // 지능형 검색 키워드 생성 (유사어 지원)
  const searchKeywords = searchQuery ? getSearchKeywords(searchQuery) : [];

  // 1. 기본 필터 정의
  const whereClause = {
    AND: [
      brandFilter ? { brand: brandFilter } : {},
      categoryFilter ? { category: categoryFilter } : {},
      searchQuery ? {
        OR: searchKeywords.flatMap(kw => [
          { title: { contains: kw, mode: 'insensitive' } },
          { brand: { contains: kw, mode: 'insensitive' } },
          { id: { contains: kw } },
          { category: { contains: kw, mode: 'insensitive' } },
        ])
      } : {}
    ]
  };

  // 2. 데이터베이스 쿼리 실행
  const productsRaw = await prisma.product.findMany({
    where: whereClause as any,
    include: {
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 14,
      },
    },
    orderBy: sortOption === 'latest' ? { updatedAt: 'desc' } : undefined,
    take: 100, // 정렬을 위해 넉넉하게 가져옴
  });

  // 3. 메모리 상에서의 고급 정렬 (할인율, 가격 등)
  let products = [...productsRaw];
  if (sortOption === 'discount') {
    products.sort((a, b) => {
      const aCurr = a.priceHistory[0]?.price || 0;
      const aOld = a.originalPrice || aCurr;
      const aRate = aOld > 0 ? (aOld - aCurr) / aOld : 0;
      
      const bCurr = b.priceHistory[0]?.price || 0;
      const bOld = b.originalPrice || bCurr;
      const bRate = bOld > 0 ? (bOld - bCurr) / bOld : 0;
      
      return bRate - aRate;
    });
  } else if (sortOption === 'price-asc') {
    products.sort((a, b) => (a.priceHistory[0]?.price || 0) - (b.priceHistory[0]?.price || 0));
  }

  // 4. DB에 존재하는 실제 카테고리 목록 및 개수 가져오기
  const dbCategories = await prisma.product.groupBy({
    by: ['category'],
    where: { category: { not: null } },
    _count: { id: true },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });

  const displayCategories = dbCategories.map(c => ({
    name: c.category!,
    count: c._count.id
  }));

  const initialCursor = products.length === 100 ? products[products.length - 1].id : null;

  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-blue-500 mb-2">
              <Layers size={18} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Market Intelligence</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter">Explorer.</h1>
            <p className="text-zinc-500 text-lg max-w-2xl">
              {searchQuery ? `"${searchQuery}" 검색 결과` : (categoryFilter ? `${categoryFilter} 카테고리 분석 센터` : "전국 대학생 복지 스토어 실시간 가격 및 혜택 추적 시스템")}
            </p>
          </div>
          <div className="flex items-center space-x-3">
             <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-4 py-2 rounded-full border border-emerald-500/20 uppercase tracking-widest">
               {products.length} Intel Points Found
             </div>
          </div>
        </header>

        {/* --- [Toolbar: Search, Sort & Brands] --- */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 bg-zinc-900/30 p-3 rounded-[32px] border border-white/5 backdrop-blur-md">
            <Suspense fallback={<div className="flex-1 h-12 bg-zinc-900/50 animate-pulse rounded-2xl" />}>
              <div className="flex-1">
                <SearchBar />
              </div>
            </Suspense>
            
            <div className="flex items-center space-x-2 px-4 border-l border-white/5">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 hidden xl:block">Sort</span>
              {[
                { id: 'latest', label: 'Latest' },
                { id: 'discount', label: '% Off' },
                { id: 'price-asc', label: 'Low Price' }
              ].map((opt) => (
                <Link 
                  key={opt.id}
                  href={{
                    pathname: '/products',
                    query: { ... (searchQuery ? { q: searchQuery } : {}), ... (brandFilter ? { brand: brandFilter } : {}), ... (categoryFilter ? { category: categoryFilter } : {}), sort: opt.id }
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    sortOption === opt.id ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10"
                  )}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-2 px-4 border-l border-white/5">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 hidden xl:block">Brand</span>
              <Link href={{
                pathname: '/products',
                query: { ... (searchQuery ? { q: searchQuery } : {}), ... (categoryFilter ? { category: categoryFilter } : {}), ... (sortOption !== 'latest' ? { sort: sortOption } : {}) }
              }} className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                !brandFilter ? "bg-zinc-100 text-black border-white" : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10"
              )}>All</Link>
              {['Apple', 'Samsung'].map(b => (
                <Link 
                  key={b}
                  href={{
                    pathname: '/products',
                    query: { brand: b, ... (searchQuery ? { q: searchQuery } : {}), ... (categoryFilter ? { category: categoryFilter } : {}), ... (sortOption !== 'latest' ? { sort: sortOption } : {}) }
                  }} 
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    brandFilter === b ? "bg-zinc-100 text-black border-white" : "bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10"
                  )}
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>

          {/* Dynamic Categories */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center space-x-2 text-zinc-600 mr-2 shrink-0">
              <Filter size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Categories</span>
            </div>
            {displayCategories.map((ctg) => (
              <Link 
                key={ctg.name}
                href={{
                  pathname: '/products',
                  query: { 
                    ... (searchQuery ? { q: searchQuery } : {}), 
                    ... (brandFilter ? { brand: brandFilter } : {}), 
                    ... (sortOption !== 'latest' ? { sort: sortOption } : {}),
                    category: ctg.name 
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center space-x-2",
                  categoryFilter === ctg.name 
                    ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20" 
                    : "bg-zinc-950 text-zinc-500 border-white/5 hover:border-white/20 hover:text-white"
                )}
              >
                <span>{ctg.name}</span>
                <span className={cn("opacity-40 font-mono", categoryFilter === ctg.name ? "text-white" : "text-zinc-600")}>{ctg.count}</span>
              </Link>
            ))}
            {categoryFilter && (
              <Link 
                href={{
                  pathname: '/products',
                  query: { ... (searchQuery ? { q: searchQuery } : {}), ... (brandFilter ? { brand: brandFilter } : {}), ... (sortOption !== 'latest' ? { sort: sortOption } : {}) }
                }}
                className="text-zinc-600 hover:text-red-500 text-[10px] font-black uppercase tracking-widest pl-2 transition-colors flex items-center shrink-0"
              >
                <X size={12} className="mr-1" />
                Clear
              </Link>
            )}
          </div>
        </div>

        {/* Virtualized Infinite List */}
        <VirtualizedProductList 
          initialItems={products as any} 
          initialCursor={initialCursor}
          searchParams={{ q: searchQuery, brand: brandFilter, category: categoryFilter, sort: sortOption }}
        />
      </main>
    </div>
  );
}
