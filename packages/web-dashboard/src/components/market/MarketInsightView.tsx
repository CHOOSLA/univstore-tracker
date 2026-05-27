"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine
} from 'recharts';
import { 
  TrendingDown, 
  Globe, 
  ShieldCheck, 
  Target,
  BarChart3,
  Activity,
  Flame,
  Zap,
  Coins,
  ChevronRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/Sparkline";
import ReportDownloader from "./ReportDownloader";

interface ProductInsight {
  id: string;
  title: string;
  brand: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number | null;
  avgPrice: number | null;
  gapAmount: number | null;
  gapPercent: number | null;
  prevPrice: number | null;
  dropAmount: number | null;
  dropPercent: number | null;
  targetPrice: number | null;
}

interface MarketInsightViewProps {
  totalSavings: number;
  brandDistribution: { name: string, value: number, color: string }[];
  categoryEfficiency: { category: string, discount: number }[];
  savingsHistory: { week: string, amount: number }[];
  totalDataPoints: number;
  totalBrands: number;
  goldenLows: ProductInsight[];
  trueDeals: ProductInsight[];
  flashDrops: ProductInsight[];
  nearTargets: ProductInsight[];
}

export default function MarketInsightView({
  totalSavings,
  brandDistribution,
  categoryEfficiency,
  savingsHistory,
  totalDataPoints,
  totalBrands,
  goldenLows,
  trueDeals,
  flashDrops,
  nearTargets
}: MarketInsightViewProps) {
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Insight Engine...</div>;
  }

  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        
        {/* --- [Header] --- */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3 text-blue-500">
            <Globe size={24} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">Market Intelligence</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">Brand Pulse.</h1>
          <p className="text-zinc-500 text-xl max-w-3xl">
            수집된 {totalDataPoints.toLocaleString()}개의 데이터를 분석하여 최적의 구매 시점을 제안합니다.
          </p>
        </section>

        {/* --- [Hero Metrics] --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 glass p-10 rounded-[40px] border-blue-500/20 bg-blue-500/[0.02] flex flex-col justify-between min-h-[320px] relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <TrendingDown size={160} strokeWidth={1} className="text-blue-500" />
             </div>
             <div className="flex justify-between items-start z-10">
               <div className="space-y-1">
                 <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Savings Index</h3>
                 <p className="text-5xl font-black text-white tracking-tighter">₩{totalSavings.toLocaleString()}+</p>
                 <p className="text-sm text-zinc-500 font-medium">UnivWatch 사용자들이 정가 대비 절약한 총 누적 금액</p>
               </div>
               <TrendingDown className="text-blue-500" size={32} />
             </div>
             <div className="h-[140px] w-full mt-6 -mx-4 z-10">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={savingsHistory}>
                   <defs>
                     <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#heroGradient)" isAnimationActive={false} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>
          
          <div className="glass p-10 rounded-[40px] flex flex-col justify-between group hover:border-emerald-500/20 transition-all">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Market Status</h3>
              <p className="text-4xl font-black text-white">{totalSavings > 0 ? "Active" : "Scanning"}</p>
              <div className="flex items-center space-x-2 mt-4 text-xs font-bold text-zinc-500 italic">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>실시간 데이터 수집 및 무결성 검증 중</span>
              </div>
            </div>
            <div className="pt-10 flex flex-col space-y-4">
               <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest border-b border-white/5 pb-2">
                  <span>Data Points</span>
                  <span className="text-white">{totalDataPoints.toLocaleString()}</span>
               </div>
               <div className="flex items-center space-x-2 text-blue-500 font-black text-sm pt-2">
                  <Activity size={18} />
                  <span className="tracking-tighter uppercase">Feed Verified</span>
               </div>
            </div>
          </div>
        </div>

        {/* --- [Bento Grid 2.0 Core Row] --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Card 1: Golden Low Tracker (역대 최저가) */}
          <div className="lg:col-span-6 glass p-8 md:p-10 rounded-[40px] space-y-6 border-white/[0.03] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-amber-500">
                  <Flame size={16} className="fill-amber-500/20" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Golden Low Tracker</h3>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">역대 최저가 경신 매물</p>
              </div>
              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-amber-500/20 uppercase tracking-widest shrink-0">
                {goldenLows.length} Items Found
              </span>
            </div>

            <div className="divide-y divide-white/5 flex-1 mt-4">
              {goldenLows.length > 0 ? goldenLows.map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="flex items-center justify-between py-3.5 group relative z-10 transition-colors">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-11 h-11 bg-zinc-900 rounded-xl border border-white/5 overflow-hidden shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{item.brand}</span>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate pr-4">{item.title}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {item.originalPrice && item.originalPrice > item.currentPrice && (
                      <span className="text-[9px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded mr-2">
                        -{Math.round(((item.originalPrice - item.currentPrice) / item.originalPrice) * 100)}%
                      </span>
                    )}
                    <span className="font-black text-white text-sm font-mono">₩{item.currentPrice.toLocaleString()}</span>
                  </div>
                </Link>
              )) : (
                <div className="h-full flex items-center justify-center py-20 text-zinc-600 font-bold uppercase text-[10px] tracking-widest italic">Awaiting New Records...</div>
              )}
            </div>
          </div>

          {/* Card 2: True Deal Index (30일 평균가 대비 가격 격차) */}
          <div className="lg:col-span-6 glass p-8 md:p-10 rounded-[40px] space-y-6 border-white/[0.03] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-blue-500">
                  <Coins size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest">True Deal Index</h3>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">30일 평균가 대비 최대 하락</p>
              </div>
              <span className="bg-blue-500/10 text-blue-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-widest shrink-0">
                True Price Gap
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1 mt-4">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trueDeals.slice(0, 3)} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="brand" stroke="#3f3f46" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={false}
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#71717a', fontSize: '9px', marginBottom: '4px' }}
                    />
                    <Bar dataKey="gapPercent" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {trueDeals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#1d4ed8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3.5">
                {trueDeals.slice(0, 3).map((item, idx) => (
                  <Link key={item.id} href={`/product/${item.id}`} className="block bg-zinc-950/50 hover:bg-zinc-900/50 transition-all p-3 rounded-2xl border border-white/5 group">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-zinc-500 uppercase">Rank 0{idx + 1}</span>
                      <span className="text-xs font-black text-red-500">-{item.gapPercent}%</span>
                    </div>
                    <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mt-1">{item.title}</p>
                    <div className="flex justify-between items-center mt-2 text-[10px]">
                      <span className="text-zinc-600">평균 ₩{item.avgPrice?.toLocaleString()}</span>
                      <span className="font-bold text-white font-mono">₩{item.currentPrice.toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- [Bento Grid 2.0 Sub Row] --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Card 3: Flash Drops Feed (단기 급락 스트림) */}
          <div className="lg:col-span-12 glass p-8 md:p-10 rounded-[40px] space-y-6 border-white/[0.03]">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-red-500">
                  <Zap size={16} className="fill-red-500/10" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Flash Drops</h3>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">48시간 단기 급락 피드</p>
              </div>
              <Link href="/products?sort=discount" className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest flex items-center transition-colors">
                Explore <ChevronRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {flashDrops.length > 0 ? flashDrops.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="bg-zinc-950/40 hover:bg-zinc-950/80 transition-all p-6 rounded-[32px] border border-white/5 flex flex-col justify-between group min-w-0 w-full min-h-[220px] relative overflow-hidden">
                  <div className="absolute -top-3 -right-3 p-6 opacity-[0.03] group-hover:scale-110 group-hover:opacity-5 transition-all duration-500 shrink-0">
                    <ArrowDownRight size={120} className="text-red-500" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{item.brand}</span>
                      <span className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded shrink-0">
                        -{item.dropPercent}%
                      </span>
                    </div>

                    <div className="flex items-start space-x-4 min-w-0">
                      <div className="w-14 h-14 bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-relaxed pr-4">{item.title}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                    <div className="w-20">
                      <Sparkline data={[item.prevPrice || 0, item.currentPrice]} color="#ef4444" height={20} />
                    </div>
                    <div className="text-right">
                      {item.prevPrice && (
                        <p className="text-[10px] text-zinc-600 line-through">₩{item.prevPrice.toLocaleString()}</p>
                      )}
                      <p className="font-black text-white text-base font-mono leading-none mt-1">₩{item.currentPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="col-span-3 py-12 text-center text-zinc-700 font-black uppercase text-[10px] tracking-widest italic">Scanning Flash Sales...</div>
              )}
            </div>
          </div>

          {/* Card 4: Near Target Watchlist (목표가 임박 온점) - 알림 기능 비활성화로 인한 주석 처리
          <div className="lg:col-span-5 glass p-8 md:p-10 rounded-[40px] space-y-6 border-white/[0.03] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-emerald-500">
                  <Target size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Near Target Watchlist</h3>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">목표 가격 임박 상품</p>
              </div>
              <Link href="/alerts" className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-widest flex items-center transition-colors">
                Alerts <ChevronRight size={12} />
              </Link>
            </div>

            <div className="divide-y divide-white/5 flex-1 mt-4">
              {nearTargets.length > 0 ? nearTargets.map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="flex items-center justify-between py-3 group">
                  <div className="min-w-0 pr-4">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{item.brand}</span>
                    <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">{item.title}</p>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">목표 ₩{item.targetPrice?.toLocaleString()}</p>
                      <p className="text-sm font-black text-white font-mono mt-0.5">₩{item.currentPrice.toLocaleString()}</p>
                    </div>
                    <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-red-500/20 tracking-tighter shrink-0">
                      +{item.gapPercent}%
                    </span>
                  </div>
                </Link>
              )) : (
                <div className="h-full flex items-center justify-center py-16 text-zinc-700 font-bold uppercase text-[10px] tracking-widest italic text-center">No Targets in Danger Zone</div>
              )}
            </div>
          </div>
          */}
        </div>

        {/* --- [Verify Banner] --- */}
        <div className="glass p-10 rounded-[50px] border-emerald-500/20 bg-emerald-500/[0.01] flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center space-x-8">
              <div className="p-5 bg-zinc-950 rounded-3xl border border-white/5 shadow-2xl">
                <ShieldCheck className="text-emerald-500" size={40} />
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-white text-2xl tracking-tight">Infrastructure Integrity Verified</h4>
                <p className="text-sm text-zinc-500 font-medium max-w-xl leading-relaxed">
                   본 분석 결과는 전국의 대학생 전용 폐쇄몰 데이터를 실시간으로 파싱하여 <br /> 
                   자체 알고리즘으로 검증한 {totalDataPoints.toLocaleString()}개의 스냅샷을 기반으로 생성되었습니다.
                </p>
              </div>
           </div>
           <ReportDownloader />
        </div>
      </main>
    </div>
  );
}

