"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CreditCard, Truck, Zap, Loader2 } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  brand: string | null;
  originalPrice: number | null;
  imageUrl: string | null;
  stockStatus: string | null;
  bestBenefit: string | null;
  category: string | null;
  priceHistory: { price: number }[];
}

interface VirtualizedProductListProps {
  initialItems: Product[];
  initialCursor: string | null;
  searchParams: { q?: string; brand?: string; category?: string; sort?: string };
}

/**
 * 1차적으로 무한 스크롤(Infinite Scroll)만 구현하여 안정성을 확보합니다.
 * 가상화(Virtualization)는 안정적인 데이터 흐름 확인 후 2차로 적용합니다.
 */
export default function VirtualizedProductList({ initialItems, initialCursor, searchParams }: VirtualizedProductListProps) {
  const [items, setItems] = useState<Product[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 무한 스크롤 데이터 로딩
  const fetchMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.q) params.set('q', searchParams.q);
      if (searchParams.brand) params.set('brand', searchParams.brand);
      if (searchParams.category) params.set('category', searchParams.category);
      if (searchParams.sort) params.set('sort', searchParams.sort);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (data.items) {
        setItems(prev => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (err) {
      console.error("Failed to load more products:", err);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, hasMore, searchParams]);

  // 하단 도달 감지 (Scroll Listener)
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
        fetchMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchMore]);

  // 검색 조건 변경 시 초기화
  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setHasMore(!!initialCursor);
  }, [initialItems, initialCursor]);

  if (!mounted) return null;

  return (
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
          {items.map((item) => {
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
          })}
        </tbody>
      </table>

      {isLoading && (
        <div className="py-10 flex justify-center bg-zinc-900/50">
          <Loader2 className="text-blue-500 animate-spin" size={32} />
        </div>
      )}
      
      {!hasMore && items.length > 0 && (
        <div className="py-10 text-center text-zinc-600 font-black uppercase text-[10px] tracking-[0.3em] bg-zinc-900/50 border-t border-white/5">
          End of Market Data
        </div>
      )}

      {items.length === 0 && !isLoading && (
        <div className="py-20 text-center text-zinc-500 font-black uppercase text-xs tracking-widest">
          검색 결과가 없습니다. 다른 키워드로 시도해 보세요.
        </div>
      )}
    </div>
  );
}
