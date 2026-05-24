"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PriceAlertControl from "./PriceAlertControl";
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
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceHistoryEntry {
  date: string;
  price: number;
}

interface BenefitRuleProp {
  pattern: string;
  rate: number;
  maxLimit: number;
  label: string;
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
  };
  history: PriceHistoryEntry[];
  benefitRules: BenefitRuleProp[];
  existingAlerts: { id: number, targetPrice: number }[];
}

export default function ProductDetailView({ product, history, benefitRules, existingAlerts }: ProductDetailViewProps) {
  const [mounted, setMounted] = useState(false);
  const [chartInterval, setChartInterval] = useState(2);
  
  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    
    // 클라이언트 사이드에서만 화면 너비 측정하여 차트 간격 조절
    const handleResize = () => {
      setChartInterval(window.innerWidth < 768 ? 5 : 2);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Loading Product Intel...</div>;
  }

  const currentPrice = history[0]?.price || 0;
  const originalPrice = product.originalPrice || currentPrice;
  
  const calculateDynamicDiscount = (price: number, benefit: string | null) => {
    if (!benefit || !benefitRules) return 0;
    const policy = benefitRules.find(p => new RegExp(p.pattern).test(benefit));
    if (!policy) return 0;
    let maxLimit = policy.maxLimit;
    if (maxLimit === 0) {
      const match = benefit.match(/(\d+)만/);
      maxLimit = match ? parseInt(match[1]) * 10000 : 0;
    }
    const calculated = Math.floor(price * policy.rate);
    return Math.min(calculated, maxLimit);
  };

  const cardDiscount = calculateDynamicDiscount(currentPrice, product.bestBenefit);
  const finalPrice = currentPrice - cardDiscount;

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
              <div className="flex justify-between items-start">
                <div className="space-y-3 md:space-y-4 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-zinc-900 text-zinc-400 text-[9px] md:text-[10px] font-black px-2 py-1 rounded border border-white/5 uppercase tracking-widest">{product.brand || 'Brand'}</span>
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest",
                      product.stockStatus === "Low Stock" || product.stockStatus === "Out of Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>{product.stockStatus || 'In Stock'}</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                    {product.title}
                  </h1>
                </div>
                <div className="p-3 md:p-4 bg-zinc-900 rounded-2xl md:rounded-3xl border border-white/5 shrink-0 ml-4">
                  <TrendingDown className={cn("w-6 h-6 md:w-8 md:h-8", currentPrice < avgPrice ? "text-emerald-500" : "text-zinc-700")} />
                </div>
              </div>

              <div className="h-[200px] md:h-[300px] w-full pt-4 md:pt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...history].reverse()} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#3f3f46" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={10} 
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis hide domain={['dataMin - 10000', 'dataMax + 10000']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: number) => [`₩${value.toLocaleString()}`, 'Price']}
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
                <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Live Pricing Analysis</h3>
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
                      <span className="bg-red-500/10 text-red-500 text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded border border-red-500/20">
                        -{(((originalPrice - currentPrice) / originalPrice) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-xl md:text-2xl font-black font-mono">₩{currentPrice.toLocaleString()}</span>
                </div>
                
                {product.bestBenefit && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <div className="flex items-center space-x-2 min-w-0">
                      <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                      <span className="font-bold text-xs md:text-sm truncate">{product.bestBenefit}</span>
                    </div>
                    <span className="font-black font-mono text-sm md:text-base shrink-0">- ₩{cardDiscount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="pt-4 md:pt-6 border-t border-white/5 space-y-1 md:space-y-2">
                  <p className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-widest text-right">최종 실질 구매가</p>
                  <p className="text-4xl md:text-6xl font-black text-white text-right tracking-tighter tabular-nums leading-none">
                    ₩{finalPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link 
                  href={`https://www.univstore.com/item/${product.id}`}
                  target="_blank"
                  className="flex items-center justify-center space-x-2 bg-white text-black h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base hover:bg-zinc-200 transition-all"
                >
                  <span>Buy Now</span>
                  <ExternalLink className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                </Link>
                <button className="flex items-center justify-center space-x-2 bg-zinc-900 border border-white/5 text-white h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base hover:bg-zinc-800 transition-all">
                  <Zap className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  <span>Track</span>
                </button>
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="glass p-5 md:p-6 rounded-[24px] md:rounded-[32px] border-white/[0.03]">
                <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center">
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
                <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 mt-3 md:mt-4 text-center italic leading-none truncate">
                  {currentPrice <= minPrice ? "Lowest recorded🎯" : "Market scan"}
                </p>
              </div>

              <div className="glass p-5 md:p-6 rounded-[24px] md:rounded-[32px] border-white/[0.03] flex flex-col justify-between">
                <div className="space-y-2 md:space-y-4">
                  <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Percent className="mr-1.5 w-2.5 h-2.5 md:w-3 md:h-3" /> Perk
                  </p>
                  <p className="text-xl md:text-2xl font-black text-white leading-none">Exclusive <br/> Benefit</p>
                </div>
                <div className="flex items-center text-blue-500 space-x-1 text-[10px] md:text-xs font-black uppercase tracking-tighter cursor-pointer hover:underline pt-2">
                  <span>Policy</span>
                  <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </div>
              </div>
            </div>

            {/* Price Alert Center */}
            <PriceAlertControl 
              productId={product.id} 
              currentPrice={finalPrice} 
              existingAlerts={existingAlerts} 
            />

            <div className="glass p-6 md:p-10 rounded-[32px] md:rounded-[40px] border-white/[0.03] space-y-4 md:space-y-6">
               <div className="flex items-center space-x-2 text-zinc-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">
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
      </main>
    </div>
  );
}
