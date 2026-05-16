"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  ChevronLeft, 
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
}

export default function ProductDetailView({ product, history }: ProductDetailViewProps) {
  const currentPrice = history[0]?.price || 0;
  const originalPrice = product.originalPrice || currentPrice;
  const cardDiscount = product.bestBenefit?.match(/(\d+)만/)?.[1] ? parseInt(product.bestBenefit.match(/(\d+)만/)![1]) * 10000 : 0;
  const finalPrice = currentPrice - cardDiscount;

  // 통계 계산
  const prices = history.map(h => h.price);
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
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center mb-8">
        <Link href="/products" className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Back to Explorer</span>
        </Link>
        <div className="flex items-center space-x-4">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mt-0.5">TRACKING ACTIVE</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Product Visuals & Main Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass rounded-[40px] p-2 overflow-hidden aspect-[4/3] relative flex items-center justify-center border-white/[0.03]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-50" />
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain relative z-10" />
              ) : (
                <span className="text-zinc-800 font-black text-6xl tracking-tighter opacity-20 uppercase">{product.brand || 'Product'}</span>
              )}
            </div>

            <div className="glass p-10 rounded-[40px] space-y-8 border-white/[0.03]">
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="bg-zinc-900 text-zinc-400 text-[10px] font-black px-2 py-1 rounded border border-white/5 uppercase tracking-widest">{product.brand || 'Brand'}</span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest",
                      product.stockStatus === "Low Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>{product.stockStatus || 'In Stock'}</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                    {product.title}
                  </h1>
                </div>
                <div className="p-4 bg-zinc-900 rounded-3xl border border-white/5">
                  <TrendingDown className={cn(currentPrice < avgPrice ? "text-emerald-500" : "text-zinc-700")} size={32} />
                </div>
              </div>

              <div className="h-[300px] w-full pt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...history].reverse()}>
                    <defs>
                      <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="date" stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis hide domain={['dataMin - 10000', 'dataMax + 10000']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      formatter={(value: number) => [`₩${value.toLocaleString()}`, 'Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPriceDetail)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: Price Receipt & Deep Insights */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="glass p-8 rounded-[40px] border-zinc-100/10 bg-zinc-100/[0.02] space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] -mr-16 -mt-16" />
              
              <div className="space-y-1">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Live Pricing Analysis</h3>
                <p className="text-sm text-zinc-400">Product ID: {product.id}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-zinc-400 text-sm">
                  <span>정상 판매가</span>
                  <span className="line-through font-mono">₩{originalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">학생 할인가</span>
                    {originalPrice > currentPrice && (
                      <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-1.5 py-0.5 rounded border border-red-500/20">
                        -{(((originalPrice - currentPrice) / originalPrice) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black font-mono">₩{currentPrice.toLocaleString()}</span>
                </div>
                
                {product.bestBenefit && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <div className="flex items-center space-x-2">
                      <CreditCard size={16} />
                      <span className="font-bold text-sm">{product.bestBenefit}</span>
                    </div>
                    <span className="font-black font-mono">- ₩{cardDiscount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="pt-6 border-t border-white/5 space-y-2">
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-widest text-right">최종 실질 구매가</p>
                  <p className="text-6xl font-black text-white text-right tracking-tighter tabular-nums">
                    ₩{finalPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Link 
                  href={`https://www.univstore.com/item/${product.id}`}
                  target="_blank"
                  className="flex items-center justify-center space-x-2 bg-white text-black h-14 rounded-2xl font-black hover:bg-zinc-200 transition-all"
                >
                  <span>Buy Now</span>
                  <ExternalLink size={18} />
                </Link>
                <button className="flex items-center justify-center space-x-2 bg-zinc-900 border border-white/5 text-white h-14 rounded-2xl font-black hover:bg-zinc-800 transition-all">
                  <Zap size={18} />
                  <span>Track Price</span>
                </button>
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-6 rounded-[32px] border-white/[0.03]">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center">
                  <History className="mr-2" size={12} /> Volatility
                </p>
                <div className="h-24 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volatilityData}>
                      <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                        {volatilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 1 ? '#ef4444' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 mt-4 text-center text-nowrap italic leading-none">
                  {currentPrice <= minPrice ? "Lowest recorded hit! 🎯" : "Market average scan"}
                </p>
              </div>

              <div className="glass p-6 rounded-[32px] border-white/[0.03] flex flex-col justify-between">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Percent className="mr-2" size={12} /> Student Perk
                  </p>
                  <p className="text-2xl font-black text-white leading-none">Exclusive <br/> Benefit</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    본 상품은 학생 인증 회원 전용 특별 할인가가 적용되었습니다.
                  </p>
                </div>
                <div className="flex items-center text-blue-500 space-x-1 text-xs font-black uppercase tracking-tighter cursor-pointer hover:underline pt-2">
                  <span>View Policy</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-[32px] border-white/[0.03] space-y-4">
               <div className="flex items-center space-x-2 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                  <Info size={14} />
                  <span>Insight</span>
               </div>
               <p className="text-sm text-zinc-300 font-medium leading-relaxed">
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

function StatItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{label}</p>
      <p className={cn("text-lg font-black", color)}>{value}</p>
    </div>
  );
}
lor }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{label}</p>
      <p className={cn("text-lg font-black", color)}>{value}</p>
    </div>
  );
}
