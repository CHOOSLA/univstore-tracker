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
import { Suspense } from 'react';
import { getSearchKeywords } from "@/lib/search-utils";

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; q?: string; category?: string }>;
}) {
  const { brand: brandFilter, q: searchQuery, category: categoryFilter } = await searchParams;

  // 지능형 검색 키워드 생성 (유사어 지원)
  const searchKeywords = searchQuery ? getSearchKeywords(searchQuery) : [];

  // 1. 실제 데이터베이스 쿼리
  const products = await prisma.product.findMany({
    where: {
      AND: [
        brandFilter ? { brand: brandFilter } : {},
        categoryFilter ? { category: categoryFilter } : {},
        searchQuery ? {
          OR: searchKeywords.flatMap(kw => [
            { title: { contains: kw, mode: 'insensitive' } },
            { brand: { contains: kw, mode: 'insensitive' } },
            { id: { contains: kw } },
          ])
        } : {}
      ]
    },
    include: {
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 14, // 최근 14회의 가격 이력 (Sparkline용)
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50, // 최근 50개만 노출
  });

  // 2. DB에 존재하는 실제 카테고리 목록 및 개수 가져오기
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

        {/* --- [Toolbar: Search & Filters] --- */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/30 p-3 rounded-[32px] border border-white/5 backdrop-blur-md">
            <Suspense fallback={<div className="flex-1 h-12 bg-zinc-900/50 animate-pulse rounded-2xl" />}>
              <SearchBar />
            </Suspense>
            <div className="flex items-center space-x-2 px-2">
              <Link href="/products" className={cn(
                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10",
                !brandFilter ? "bg-white text-black" : "bg-zinc-900/80 text-zinc-500 hover:bg-zinc-800"
              )}>All</Link>
              <Link href={searchQuery ? `/products?brand=Apple&q=${searchQuery}` : "/products?brand=Apple"} className={cn(
                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10",
                brandFilter === 'Apple' ? "bg-white text-black" : "bg-zinc-900/80 text-zinc-500 hover:bg-zinc-800"
              )}>Apple</Link>
              <Link href={searchQuery ? `/products?brand=Samsung&q=${searchQuery}` : "/products?brand=Samsung"} className={cn(
                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10",
                brandFilter === 'Samsung' ? "bg-white text-black" : "bg-zinc-900/80 text-zinc-500 hover:bg-zinc-800"
              )}>Samsung</Link>
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
                  query: { ... (searchQuery ? { q: searchQuery } : {}), ... (brandFilter ? { brand: brandFilter } : {}), category: ctg.name }
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
                  query: { ... (searchQuery ? { q: searchQuery } : {}), ... (brandFilter ? { brand: brandFilter } : {}) }
                }}
                className="text-zinc-600 hover:text-red-500 text-[10px] font-black uppercase tracking-widest pl-2 transition-colors flex items-center shrink-0"
              >
                <X size={12} className="mr-1" />
                Clear
              </Link>
            )}
          </div>
        </div>

        {/* High Density Table */}
        <div className="glass rounded-[40px] overflow-hidden border-white/[0.03]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <th className="pl-10 pr-6 py-6">Product Details</th>
                <th className="px-6 py-6 text-right">Price Matrix</th>
                <th className="px-6 py-6 text-center">Trend (14D)</th>
                <th className="pr-10 pl-6 py-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.length > 0 ? products.map((item) => {
                const currentPrice = item.priceHistory[0]?.price || 0;
                const oldPrice = item.originalPrice || currentPrice;
                const dropRate = oldPrice > 0 ? (((oldPrice - currentPrice) / oldPrice) * 100).toFixed(1) : "0";
                const historyData = item.priceHistory.map(h => h.price).reverse();

                return (
                  <tr key={item.id} className="group hover:bg-white/[0.02] transition-all relative">
                    <td className="pl-10 pr-6 py-8">
                      <Link href={`/product/${item.id}`} className="absolute inset-0 z-10" />
                      <div className="flex items-center space-x-6 relative z-0">
                        <div className="w-14 h-14 bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[8px] text-zinc-700 font-black uppercase tracking-tighter">IMAGE</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{item.brand || 'Brand'}</span>
                            {item.category && (
                              <span className="text-[8px] font-black bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">{item.category}</span>
                            )}
                          </div>
                          <p className="text-base font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                          <div className="flex items-center space-x-3 text-[11px] text-zinc-500 font-bold">
                             <span className="flex items-center space-x-1 text-emerald-400/80">
                               <CreditCard size={10} /> <span>{item.bestBenefit || '기본 혜택'}</span>
                             </span>
                             <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                             <span className="flex items-center space-x-1">
                               <Truck size={10} /> <span>무료 배송</span>
                             </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-8 text-right relative z-0">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline space-x-2">
                           <span className="text-xs text-zinc-600 line-through tabular-nums font-medium">₩{oldPrice.toLocaleString()}</span>
                           <span className="text-red-500 font-black text-sm">-{dropRate}%</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter tabular-nums">₩{currentPrice.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-8 relative z-0">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color={parseFloat(dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Trend Scan</span>
                      </div>
                    </td>
                    <td className="pr-10 pl-6 py-8 text-right relative z-0">
                      <div className="flex items-center justify-end space-x-4">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest",
                            item.stockStatus === "Out of Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                            {item.stockStatus || 'In Stock'}
                          </span>
                          <p className="text-[10px] font-bold text-zinc-600 mt-2 italic">Ref: {item.id}</p>
                        </div>
                        <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                          <Zap size={18} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                   <td colSpan={4} className="py-20 text-center text-zinc-500 font-black uppercase text-xs tracking-widest">
                     검색 결과가 없습니다. 다른 키워드로 시도해 보세요.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
