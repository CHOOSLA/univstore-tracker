"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import PriceAlertControl from "./PriceAlertControl";
import MnoCalculator from "./MnoCalculator";
import PriceScoreBadge from "../common/PriceScoreBadge";
import SimilarProducts, { SimilarItem } from "./SimilarProducts";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  ExternalLink, 
  Zap, 
  Info, 
  CreditCard, 
  History,
  TrendingDown,
  Percent,
  ChevronRight,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceHistoryEntry {
  date: string; // ISO string
  price: number;
}

interface ProductDetailViewProps {
  product: {
    id: string;
    title: string;
    brand: string | null;
    originalPrice: number | null;
    imageUrl: string | null;
    stockStatus: string | null;
    bestBenefit: string | null;
    priceScore?: number | null;
  };
  history: PriceHistoryEntry[];
  existingAlerts: { id: number, targetPrice: number }[];
  /** univstore의 통신사(mno) 카테고리 상품 여부. true면 Buy Now URL이 /mno/item/{id}로 분기 */
  isMnoItem?: boolean;
  /** 외부 store URL 직접 주입. 제공되면 isMnoItem과 무관하게 우선 사용. */
  externalUrl?: string;
  /** 통신사 상품 옵션/요금제. 있으면 MnoCalculator 렌더 */
  mnoOption?: import("./MnoCalculator").MnoOptionData | null;
  /** 유사 상품. 비어있으면 섹션 생략 */
  similar?: SimilarItem[];
}

type RangeType = '1M' | '3M' | '6M' | 'ALL';

export default function ProductDetailView({ product, history, existingAlerts, isMnoItem = false, externalUrl, mnoOption, similar }: ProductDetailViewProps) {
  // externalUrl이 주입되면 그대로, 아니면 isMnoItem 분기로 fallback
  const buyNowUrl = externalUrl ?? (isMnoItem
    ? `https://www.univstore.com/mno/item/${product.id}`
    : `https://www.univstore.com/item/${product.id}`);

  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<RangeType>('1M');
  
  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  // 기간별 데이터 필터링 및 다운샘플링 로직
  const filteredHistory = useMemo(() => {
    if (!history.length) return [];

    const now = new Date();
    let cutoff = new Date();
    
    if (range === '1M') cutoff.setMonth(now.getMonth() - 1);
    else if (range === '3M') cutoff.setMonth(now.getMonth() - 3);
    else if (range === '6M') cutoff.setMonth(now.getMonth() - 6);
    else cutoff = new Date(0); // All

    // 1. 기간 필터링
    const inRange = history.filter(h => new Date(h.date) >= cutoff);
    
    // 2. 날짜별 단일화 (이미 DB에서 가져온 데이터가 여러번일 수 있으므로)
    const dailyMap = new Map<string, number>();
    inRange.forEach(h => {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, h.price);
      }
    });

    const dailyData = Array.from(dailyMap.entries()).map(([date, price]) => ({ date, price }));
    
    // 3. 기간이 길 경우 다운샘플링 (주 단위 또는 월 단위)
    // 3개월 이상일 경우 3일 간격, 6개월 이상일 경우 1주일 간격 등으로 조절 가능
    // 여기서는 가시성을 위해 정렬 후 반환
    return dailyData.sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      displayDate: d.date.split('-').slice(1).join('/') // MM/DD 형식
    }));
  }, [history, range]);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Loading Product Intel...</div>;
  }

  const currentPrice = history[0]?.price || 0;
  const originalPrice = product.originalPrice || currentPrice;
  
  // 카드/결제수단 할인은 univstore가 per-item 구조화 값으로 제공하지 않음.
  // (benefit은 결제수단 조건부 + "최대 N만" cap 마케팅 문구라 정확 계산 불가)
  // 따라서 finalPrice 계산을 제거하고 currentPrice를 그대로 구매가로 노출.
  // bestBenefit 텍스트는 조건 안내 라벨로만 표시.

  const prices = history.length > 0 ? history.map(h => h.price) : [0];
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  const volatilityData = [
    { name: 'Avg', price: avgPrice },
    { name: 'Min', price: minPrice },
    { name: 'Max', price: maxPrice },
  ];

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-12 space-y-6 md:space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* Left: Product Visuals & Main Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass rounded-[32px] md:rounded-[40px] p-2 overflow-hidden aspect-[4/3] relative flex items-center justify-center border-white/[0.03]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-50" />
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain relative z-10 p-4 md:p-8" />
              ) : (
                <span className="text-zinc-800 font-black text-4xl md:text-6xl tracking-tighter opacity-20 uppercase">{product.brand || 'Product'}</span>
              )}
            </div>

            <div className="glass p-6 md:p-10 rounded-[32px] md:rounded-[40px] space-y-6 md:space-y-8 border-white/[0.03]">
              <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 md:space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-zinc-900 text-zinc-400 text-[10px] md:text-[11px] font-black px-2 py-1 rounded border border-white/5 uppercase tracking-widest whitespace-nowrap">{product.brand || 'Brand'}</span>
                      <span className={cn(
                        "text-[10px] md:text-[11px] font-black px-2 py-1 rounded border uppercase tracking-widest whitespace-nowrap",
                        product.stockStatus === "Discontinued" ? "bg-zinc-700/20 text-zinc-400 border-zinc-600/30"
                          : product.stockStatus === "Low Stock" || product.stockStatus === "Out of Stock" ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      )}>{product.stockStatus === "Discontinued" ? "판매 종료" : (product.stockStatus || 'In Stock')}</span>
                      <PriceScoreBadge score={product.priceScore} />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter break-keep">
                      {product.title}
                    </h1>
                  </div>
                  <div className="p-3 md:p-4 bg-zinc-900 rounded-2xl md:rounded-3xl border border-white/5 shrink-0 ml-4">
                    <TrendingDown className={cn("w-6 h-6 md:w-8 md:h-8", currentPrice < avgPrice ? "text-emerald-500" : "text-zinc-700")} />
                  </div>
                </div>

                {/* Range Selector UI */}
                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                  <div className="flex items-center space-x-2 text-zinc-500">
                    <Calendar size={14} />
                    <span className="text-[11px] font-black uppercase tracking-widest">History Range</span>
                  </div>
                  <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    {(['1M', '3M', '6M', 'ALL'] as RangeType[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[11px] font-black transition-all",
                          range === r ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-[200px] md:h-[300px] w-full pt-4 md:pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredHistory} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#3f3f46" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={10} 
                      interval="preserveStartEnd"
                      minTickGap={30}
                    />
                    <YAxis hide domain={['dataMin - 10000', 'dataMax + 10000']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: any) => [`₩${Number(value).toLocaleString()}`, 'Price']}
                      labelStyle={{ color: '#71717a', marginBottom: '4px', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPriceDetail)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: Price Receipt & Deep Insights */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-zinc-100/10 bg-zinc-100/[0.02] space-y-6 md:space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] -mr-16 -mt-16" />
              
              <div className="space-y-1">
                <h3 className="text-[11px] md:text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Live Pricing Analysis</h3>
                <p className="text-xs md:text-sm text-zinc-400">Product ID: {product.id}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-zinc-400 text-xs md:text-sm">
                  <span>정상 판매가</span>
                  <span className="line-through font-mono">₩{originalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-base md:text-lg">학생 할인가</span>
                    {originalPrice > currentPrice && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] md:text-[11px] font-black px-1.5 py-0.5 rounded border border-red-500/20">
                        -{(((originalPrice - currentPrice) / originalPrice) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-xl md:text-2xl font-black font-mono">₩{currentPrice.toLocaleString()}</span>
                </div>
                
                {product.bestBenefit && (
                  <div className="flex items-start space-x-2 min-w-0 text-emerald-400">
                    <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5" />
                    <span className="font-bold text-xs md:text-sm">{product.bestBenefit}</span>
                  </div>
                )}

                <div className="pt-4 md:pt-6 border-t border-white/5 space-y-1 md:space-y-2">
                  <p className="text-[11px] md:text-xs font-black text-zinc-500 uppercase tracking-widest text-right">구매가</p>
                  <p className="text-4xl md:text-6xl font-black text-white text-right tracking-tighter tabular-nums leading-none">
                    ₩{currentPrice.toLocaleString()}
                  </p>
                  {product.bestBenefit && (
                    <p className="text-[11px] md:text-xs text-zinc-500 font-medium text-right">
                      결제수단/이벤트별 추가 할인은 univstore에서 확인
                    </p>
                  )}
                </div>
              </div>

              <div className="flex w-full">
                {/* 외부 도메인이라 next/link 대신 일반 anchor 사용
                    (next/link로 외부 URL을 쓰면 라우터가 가로채서 클릭이 무시되는 케이스가 있음) */}
                {product.stockStatus === "Discontinued" ? (
                  // 단종 상품: univstore가 홈으로 redirect하므로 외부 링크 비활성
                  <div className="flex w-full items-center justify-center space-x-2 bg-zinc-900 text-zinc-500 h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base border border-white/5 cursor-not-allowed select-none">
                    <span>판매 종료</span>
                  </div>
                ) : (
                  <a
                    href={buyNowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center space-x-2 bg-white text-black h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base hover:bg-zinc-200 transition-all"
                  >
                    <span>Buy Now</span>
                    <ExternalLink className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  </a>
                )}
                {/* Price Target Alert 기능 비활성화로 인한 Track 버튼 주석 처리
                <button className="flex items-center justify-center space-x-2 bg-zinc-900 border border-white/5 text-white h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base hover:bg-zinc-800 transition-all">
                  <Zap className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  <span>Track</span>
                </button>
                */}
              </div>

              {mnoOption && (
                <MnoCalculator devicePrice={currentPrice} option={mnoOption} />
              )}
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="glass p-5 md:p-6 rounded-[24px] md:rounded-[32px] border-white/[0.03] min-w-0">
                <p className="text-[10px] md:text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center">
                  <History className="mr-1.5 w-2.5 h-2.5 md:w-3 md:h-3" /> Volatility
                </p>
                <div className="h-20 md:h-24 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volatilityData}>
                      <Bar dataKey="price" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                        {volatilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 1 ? '#ef4444' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] md:text-[11px] font-bold text-zinc-400 mt-3 md:mt-4 text-center italic leading-none truncate">
                  {currentPrice <= minPrice ? "Lowest recorded🎯" : "Market scan"}
                </p>
              </div>

              <div className="glass p-5 md:p-6 rounded-[24px] md:rounded-[32px] border-white/[0.03] flex flex-col justify-between min-w-0">
                <div className="space-y-2 md:space-y-4">
                  <p className="text-[10px] md:text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Percent className="mr-1.5 w-2.5 h-2.5 md:w-3 md:h-3" /> Perk
                  </p>
                  <p className="text-xl md:text-2xl font-black text-white leading-none">Exclusive <br/> Benefit</p>
                </div>
                <div className="flex items-center text-blue-500 space-x-1 text-[11px] md:text-xs font-black uppercase tracking-tighter cursor-pointer hover:underline pt-2">
                  <span>Policy</span>
                  <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </div>
              </div>
            </div>

            {/* Price Alert Center - 비활성화로 인한 주석 처리
            <PriceAlertControl 
              productId={product.id} 
              currentPrice={currentPrice}
              existingAlerts={existingAlerts} 
            />
            */}

            <div className="glass p-6 md:p-10 rounded-[32px] md:rounded-[40px] border-white/[0.03] space-y-4 md:space-y-6">
               <div className="flex items-center space-x-2 text-zinc-400 font-bold text-[11px] md:text-xs uppercase tracking-widest">
                  <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>Insight</span>
               </div>
               <p className="text-xs md:text-sm text-zinc-300 font-medium leading-relaxed">
                  {currentPrice < avgPrice 
                    ? `현재 가격은 전체 평균 대비 ₩${(avgPrice - currentPrice).toLocaleString()} 저렴합니다. 구매하기 좋은 시점입니다.`
                    : `현재 가격은 시장 평균 수준입니다. 급하지 않다면 다음 할인 주기를 기다려보세요.`}
               </p>
            </div>

          </div>
        </div>

        {/* 유사 상품 (같은 카테고리, ±30% 가격대) */}
        {similar && similar.length > 0 && (
          <div className="mt-12 md:mt-16">
            <SimilarProducts items={similar} />
          </div>
        )}
      </main>
    </div>
  );
}
