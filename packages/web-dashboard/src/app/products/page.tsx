import React from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  CreditCard, 
  Truck,
  Zap,
  LayoutGrid,
  List
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const { brand: brandFilter } = await searchParams;

  // 1. 실제 데이터베이스 쿼리
  const products = await prisma.product.findMany({
    where: brandFilter ? { brand: brandFilter } : {},
    include: {
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 14, // 최근 14회의 가격 이력 (Sparkline용)
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50, // 일단 최근 50개만 노출
  });

  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter">Explorer</h1>
            <p className="text-zinc-500 text-lg">
              {brandFilter ? `${brandFilter} 제품 분석 결과` : "실시간 학생 할인가 및 카드사 혜택 데이터 센터"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
             <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
               {products.length} Items Listed
             </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 bg-zinc-900/30 p-2 rounded-[28px] border border-white/5 backdrop-blur-md">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by brand, name, or product ID..." 
              className="w-full bg-transparent border-none rounded-2xl py-4 pl-14 pr-4 text-sm focus:outline-none placeholder:text-zinc-600 font-medium"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/products" className={cn(
              "px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10",
              !brandFilter ? "bg-white text-black" : "bg-zinc-900/80 text-zinc-500 hover:bg-zinc-800"
            )}>All</Link>
            <Link href="/products?brand=Apple" className={cn(
              "px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10",
              brandFilter === 'Apple' ? "bg-white text-black" : "bg-zinc-900/80 text-zinc-500 hover:bg-zinc-800"
            )}>Apple</Link>
            <Link href="/products?brand=Samsung" className={cn(
              "px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10",
              brandFilter === 'Samsung' ? "bg-white text-black" : "bg-zinc-900/80 text-zinc-500 hover:bg-zinc-800"
            )}>Samsung</Link>
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
                            item.stockStatus === "Low Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
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
                     데이터를 수집 중입니다...
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
