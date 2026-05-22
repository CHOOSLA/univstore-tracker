"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CreditCard, Zap, Loader2, LayoutGrid, List } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

type ViewMode = 'list' | 'card';

interface Product {
  id: string;
  title: string;
  brand: string | null;
  originalPrice: number | null;
  imageUrl: string | null;
  stockStatus: string | null;
  bestBenefit: string | null;
  menuCategory: string | null;
  menuSubCategory: string | null;
  menuCategories?: string[];
  menuSubCategories?: string[];
  thirdCategories?: string[];
  priceHistory: { price: number }[];
}

interface VirtualizedProductListProps {
  initialItems: Product[];
  initialCursor: string | null;
  searchParams: { q?: string; brand?: string; menuCategory?: string; menuSubCategory?: string; thirdCategory?: string; sort?: string };
}

export default function VirtualizedProductList({ initialItems, initialCursor, searchParams }: VirtualizedProductListProps) {
  const [items, setItems] = useState<Product[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ViewMode>('list');

  useEffect(() => {
    setMounted(true);
    // 모바일에서는 기본적으로 카드 뷰로 시작하는 것이 가독성이 좋을 수 있음
    if (window.innerWidth < 768) {
      setView('card');
    }
  }, []);

  const fetchMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.q) params.set('q', searchParams.q);
      if (searchParams.brand) params.set('brand', searchParams.brand);
      if (searchParams.menuCategory) params.set('menuCategory', searchParams.menuCategory);
      if (searchParams.menuSubCategory) params.set('menuSubCategory', searchParams.menuSubCategory);
      if (searchParams.thirdCategory) params.set('thirdCategory', searchParams.thirdCategory);
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

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setHasMore(!!initialCursor);
  }, [initialItems, initialCursor]);

  if (!mounted) return null;

  const Footer = () => (
    <>
      {isLoading && (
        <div className="py-10 flex justify-center">
          <Loader2 className="text-blue-500 animate-spin" size={32} />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <div className="py-10 text-center text-zinc-600 font-black uppercase text-[10px] tracking-[0.3em] border-t border-white/5">
          End of Market Data
        </div>
      )}
      {items.length === 0 && !isLoading && (
        <div className="py-20 text-center text-zinc-500 font-black uppercase text-xs tracking-widest">
          검색 결과가 없습니다.
        </div>
      )}
    </>
  );

  const ViewToggle = () => (
    <div className="flex items-center space-x-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
      <button
        onClick={() => setView('list')}
        className={cn(
          "p-2 rounded-lg transition-all",
          view === 'list' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        <List size={14} />
      </button>
      <button
        onClick={() => setView('card')}
        className={cn(
          "p-2 rounded-lg transition-all",
          view === 'card' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end px-2">
          <ViewToggle />
        </div>
        <div className="glass rounded-[32px] md:rounded-[40px] overflow-hidden border-white/[0.03]">
          <div className="grid grid-cols-12 bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 px-4 md:px-10 py-6">
            <div className="col-span-8 md:col-span-6 lg:col-span-5">Product</div>
            <div className="col-span-4 md:col-span-3 text-right">Price</div>
            <div className="hidden lg:block lg:col-span-2 text-center">Trend</div>
            <div className="hidden md:block md:col-span-3 lg:col-span-2 text-right">Status</div>
          </div>
          <div className="divide-y divide-white/5">
            {items.map((item) => {
              const currentPrice = item.priceHistory[0]?.price || 0;
              const oldPrice = item.originalPrice || currentPrice;
              const dropRate = oldPrice > 0 ? (((oldPrice - currentPrice) / oldPrice) * 100).toFixed(1) : "0";
              const historyData = item.priceHistory.map(h => h.price).reverse();
              return (
                <div key={item.id} className="group hover:bg-white/[0.02] transition-all relative grid grid-cols-12 items-center px-4 md:px-10 py-6 md:py-8">
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-10" />
                  <div className="col-span-8 md:col-span-6 lg:col-span-5 flex items-center space-x-3 md:space-x-6 relative z-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-900 rounded-xl md:rounded-2xl border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                      <img src={item.imageUrl!} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-0.5 md:space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest truncate">{item.brand || 'Brand'}</span>
                      </div>
                      <p className="text-sm md:text-base font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                      <span className="flex items-center space-x-1 text-emerald-400/80 text-[10px] md:text-[11px] font-bold truncate">
                        <CreditCard size={10} /><span className="truncate">{item.bestBenefit || '기본 혜택'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-3 text-right relative z-0">
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline space-x-1 md:space-x-2">
                        <span className="text-[10px] md:text-xs text-zinc-600 line-through tabular-nums font-medium">₩{oldPrice.toLocaleString()}</span>
                        <span className="text-red-500 font-black text-[10px] md:text-sm">-{dropRate}%</span>
                      </div>
                      <p className="text-lg md:text-2xl font-black text-white tracking-tighter tabular-nums leading-tight">₩{currentPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center space-y-2 relative z-0">
                    <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color={parseFloat(dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                  </div>
                  <div className="hidden md:block md:col-span-3 lg:col-span-2 text-right relative z-0">
                    <div className="flex items-center justify-end space-x-4">
                      <span className={cn(
                        "hidden xl:block text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest",
                        item.stockStatus === "Out of Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      )}>
                        {item.stockStatus === "Out of Stock" ? "Sold Out" : "In Stock"}
                      </span>
                      <div className="p-2 md:p-3 bg-zinc-900 rounded-xl md:rounded-2xl border border-white/5 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                        <Zap size={16} className="md:w-[18px] md:h-[18px]" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-2">
        <ViewToggle />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
        {items.map((item) => {
          const currentPrice = item.priceHistory[0]?.price || 0;
          const oldPrice = item.originalPrice || currentPrice;
          const discountRate = oldPrice > 0 && oldPrice > currentPrice
            ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
            : 0;
          const historyData = item.priceHistory.map(h => h.price).reverse();
          return (
            <Link key={item.id} href={`/product/${item.id}`} className="glass p-4 md:p-6 rounded-[32px] md:rounded-[40px] flex flex-col space-y-4 md:space-y-5 group glass-hover border-white/[0.03]">
              <div className="w-full aspect-square bg-zinc-950 rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                <img src={item.imageUrl!} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-2 md:space-y-3 flex-1">
                <div className="space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.brand || 'Brand'}</p>
                  <p className="text-xs md:text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors h-[2.5rem] md:h-[3rem]">
                    {item.title}
                  </p>
                </div>
                <div className="flex flex-col">
                  {discountRate > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-500 text-xs md:text-sm font-black">{discountRate}%</span>
                      <span className="text-[10px] md:text-xs text-zinc-600 line-through font-bold">₩{oldPrice.toLocaleString()}</span>
                    </div>
                  )}
                  <p className="text-base md:text-2xl font-black text-white leading-tight">
                    ₩{currentPrice > 0 ? currentPrice.toLocaleString() : '---'}
                  </p>
                </div>
              </div>
              <div className="pt-3 md:pt-4 border-t border-white/5 space-y-3 md:space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">7D Trend Feed</p>
                  {historyData.length > 1 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[7px] md:text-[8px] font-black text-emerald-500 uppercase">Live</span>
                    </div>
                  )}
                </div>
                <div className="h-10 md:h-12 w-full">
                  {historyData.length > 1 ? (
                    <Sparkline data={historyData} color="#3b82f6" height={40} fullWidth />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
                      <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Awaiting Data</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}
