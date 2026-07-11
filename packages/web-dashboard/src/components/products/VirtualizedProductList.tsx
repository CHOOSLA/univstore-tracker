"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, LayoutGrid, List, Star } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import WatchlistButton from "@/components/product/WatchlistButton";
import ProductCard from "@/components/common/ProductCard";

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
  reviewCount?: number | null;
  reviewAvgGrade?: number | null;
  priceHistory: { price: number }[];
}

interface VirtualizedProductListProps {
  initialItems: Product[];
  initialCursor: string | null;
  searchParams: { q?: string; brand?: string; category?: string; sort?: string; filter?: string };
  /** 로그인 사용자의 관심상품 productId 목록 */
  watchedIds?: string[];
}

export default function VirtualizedProductList({ initialItems, initialCursor, searchParams, watchedIds = [] }: VirtualizedProductListProps) {
  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds]);
  const [items, setItems] = useState<Product[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [mounted, setMounted] = useState(false);
  // 기본 카드뷰. 마운트 시 localStorage에 저장된 사용자 선택으로 복원.
  const [view, setViewState] = useState<ViewMode>('card');

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    try { localStorage.setItem('explorer-view', v); } catch {}
  }, []);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 저장된 뷰 선택 복원 (없으면 기본 card 유지)
    try {
      const saved = localStorage.getItem('explorer-view');
      if (saved === 'list' || saved === 'card') setViewState(saved);
    } catch {}

    // 뒤로가기 시 스크롤 위치 및 데이터 상태 복원
    const storageKey = `univwatch_list_cache_${JSON.stringify(searchParams)}`;
    const cached = sessionStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setItems(parsed.items);
        setCursor(parsed.cursor);
        setHasMore(parsed.hasMore);
        setIsRestored(true);
        
        setTimeout(() => {
          window.scrollTo({ top: parsed.scrollY, behavior: 'instant' as any });
        }, 100);
        
        sessionStorage.removeItem(storageKey);
      } catch (e) {
        console.error("Failed to restore list cache:", e);
      }
    } else {
      // 캐시가 없는 신규 진입의 경우, 브라우저 네이티브 복원에 의해 스크롤이 중간에 걸리는 것을 막기 위해 최상단으로 강제 초기화
      window.scrollTo(0, 0);
    }
  }, [searchParams]);

  const saveScrollState = useCallback(() => {
    const storageKey = `univwatch_list_cache_${JSON.stringify(searchParams)}`;
    const cacheData = {
      items,
      cursor,
      hasMore,
      scrollY: window.scrollY
    };
    sessionStorage.setItem(storageKey, JSON.stringify(cacheData));
  }, [items, cursor, hasMore, searchParams]);

  const fetchMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.q) params.set('q', searchParams.q);
      if (searchParams.brand) params.set('brand', searchParams.brand);
      if (searchParams.category) params.set('category', searchParams.category);
      if (searchParams.sort) params.set('sort', searchParams.sort);
      if (searchParams.filter) params.set('filter', searchParams.filter);
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
    if (isRestored) {
      setIsRestored(false);
      return;
    }
    setItems(initialItems);
    setCursor(initialCursor);
    setHasMore(!!initialCursor);
  }, [initialItems, initialCursor, isRestored]);

  if (!mounted) return null;

  const Footer = () => (
    <>
      {isLoading && (
        <div className="py-10 flex justify-center">
          <Loader2 className="text-blue-500 animate-spin" size={32} />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <div className="py-10 text-center text-zinc-600 font-black uppercase text-[11px] tracking-[0.3em] border-t border-white/5">
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
          <div className="grid grid-cols-12 bg-white/[0.02] text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 px-4 md:px-10 py-6">
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
                  <Link href={`/product/${item.id}`} className="absolute inset-0 z-10" onClick={saveScrollState} />
                  <div className="col-span-8 md:col-span-6 lg:col-span-5 flex items-center space-x-3 md:space-x-6 relative z-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-900 rounded-xl md:rounded-2xl border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                      <img src={item.imageUrl!} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-0.5 md:space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] md:text-[11px] font-black text-blue-500 uppercase tracking-widest truncate">{item.brand || 'Brand'}</span>
                      </div>
                      <p className="text-sm md:text-base font-black text-white group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                      <span className="flex items-center space-x-1 text-emerald-400/80 text-[11px] md:text-[12px] font-bold truncate">
                        <CreditCard size={10} /><span className="truncate">{item.bestBenefit || '기본 혜택'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-3 text-right relative z-0">
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline space-x-1 md:space-x-2">
                        <span className="text-[11px] md:text-xs text-zinc-600 line-through tabular-nums font-medium">₩{oldPrice.toLocaleString()}</span>
                        <span className="text-red-500 font-black text-[11px] md:text-sm">-{dropRate}%</span>
                      </div>
                      <p className="text-lg md:text-2xl font-black text-white tracking-tighter tabular-nums leading-tight">₩{currentPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center space-y-2 relative z-0 px-4">
                    <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color={parseFloat(dropRate) > 10 ? "#ef4444" : "#3b82f6"} fullWidth height={36} />
                  </div>
                  <div className="hidden md:block md:col-span-3 lg:col-span-2 text-right relative">
                    <div className="flex items-center justify-end space-x-4">
                      <span className={cn(
                        "hidden lg:block text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest",
                        item.stockStatus === "Out of Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      )}>
                        {item.stockStatus === "Out of Stock" ? "Sold Out" : "In Stock"}
                      </span>
                      <div className="relative z-20">
                        <WatchlistButton productId={item.id} initialWatched={watchedSet.has(item.id)} variant="icon" />
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
            <ProductCard
              key={item.id}
              id={item.id}
              title={item.title}
              brand={item.brand}
              imageUrl={item.imageUrl}
              currentPrice={currentPrice}
              originalPrice={item.originalPrice}
              reviewCount={item.reviewCount}
              reviewAvgGrade={item.reviewAvgGrade}
              history={historyData}
              showRating
              showSparkline
              showScore={false}
              soldOut={item.stockStatus === 'Out of Stock'}
              onClick={saveScrollState}
              overlay={<WatchlistButton productId={item.id} initialWatched={watchedSet.has(item.id)} variant="icon" />}
            />
          );
        })}
      </div>
      <Footer />
    </div>
  );
}
