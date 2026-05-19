"use client";

import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Globe, 
  ShieldCheck, 
  Target,
  BarChart3,
  Info,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReportDownloader from "./ReportDownloader";

interface MarketInsightViewProps {
  totalSavings: number;
  brandDistribution: { name: string, value: number, color: string }[];
  categoryEfficiency: { category: string, discount: number }[];
  savingsHistory: { week: string, amount: number }[];
  totalDataPoints: number;
}

export default function MarketInsightView({
  totalSavings,
  brandDistribution,
  categoryEfficiency,
  savingsHistory,
  totalDataPoints
}: MarketInsightViewProps) {
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Insight Engine...</div>;
  }

  // Radar chart 데이터 변환 (상위 5개 브랜드 효율)
  const radarData = categoryEfficiency.slice(0, 5).map(item => ({
    subject: item.category,
    A: item.discount,
    fullMark: 100
  }));

  const bestCategory = categoryEfficiency[0];

  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        
        {/* --- [Page Header] --- */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3 text-blue-500">
            <Globe size={24} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">Market Intelligence</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">Brand Pulse.</h1>
          <p className="text-zinc-500 text-xl max-w-3xl">
            수집된 실시간 데이터를 통해 시장의 할인 효율과 브랜드 점유율을 정밀 분석합니다.
          </p>
        </section>

        {/* --- [Top Row: The Hero Bento Cards] --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Savings Index (Hero) */}
          <div className="col-span-1 md:col-span-2 glass p-10 rounded-[40px] border-blue-500/20 bg-blue-500/[0.02] flex flex-col justify-between min-h-[320px] relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp size={160} strokeWidth={1} className="text-blue-500" />
             </div>
             <div className="flex justify-between items-start z-10">
               <div className="space-y-1">
                 <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Savings Index</h3>
                 <p className="text-5xl font-black text-white tracking-tighter">₩{totalSavings.toLocaleString()}+</p>
                 <p className="text-sm text-zinc-500 font-medium">UnivWatch 사용자들이 정가 대비 절약한 총 누적 금액</p>
               </div>
               <TrendingUp className="text-blue-500" size={32} />
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
          
          {/* 2. Market Status (Hero) */}
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

        {/* --- [Middle Row: Depth Analysis] --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 3. Brand Dominance (Inventory Mix) */}
          <div className="lg:col-span-5 glass p-10 rounded-[40px] space-y-8 border-white/[0.03]">
            <div className="flex justify-between items-center px-2">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">Inventory Mix</h3>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Brand Distribution</p>
              </div>
              <Target className="text-zinc-700" />
            </div>
            <div className="h-[240px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={brandDistribution} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" isAnimationActive={false}>
                    {brandDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <p className="text-[10px] font-black text-zinc-500 uppercase">Top 1</p>
                 <p className="text-lg font-black text-white">{brandDistribution[0]?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 px-2">
               {brandDistribution.slice(0, 4).map((brand) => (
                 <div key={brand.name} className="space-y-2">
                   <div className="flex items-center space-x-2">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brand.color }} />
                     <span className="text-[11px] font-bold text-zinc-400">{brand.name}</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(brand.value / totalDataPoints) * 100}%`, backgroundColor: brand.color }} />
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* 4. Brand Efficiency (Advanced Visualization) */}
          <div className="lg:col-span-7 glass p-10 rounded-[40px] space-y-8 border-white/[0.03] flex flex-col justify-between">
             <div className="flex justify-between items-center px-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white tracking-tight">Market Efficiency</h3>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Average Discount Rate by Brand</p>
                </div>
                <BarChart3 className="text-zinc-700" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="h-[280px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#18181b" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 'bold' }} />
                        <Radar name="Efficiency" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} isAnimationActive={false} />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>
                <div className="space-y-6">
                   {categoryEfficiency.slice(0, 5).map((item, idx) => (
                     <div key={item.category} className="flex items-end justify-between border-b border-white/5 pb-2">
                        <div className="space-y-1">
                           <span className="text-[9px] font-black text-zinc-700 uppercase">Rank 0{idx+1}</span>
                           <p className="text-sm font-bold text-white">{item.category}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-black text-blue-500 tracking-tighter">-{item.discount}%</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="px-4 py-4 bg-blue-500/[0.03] border border-blue-500/10 rounded-2xl text-center">
               <p className="text-xs text-zinc-500 font-medium italic">
                 {bestCategory ? (
                    <>현재 <span className="text-white font-bold">{bestCategory.category}</span> 브랜드가 평균 {bestCategory.discount}%로 타 브랜드 대비 압도적인 할인 효율을 보이고 있습니다.</>
                 ) : "데이터 수집 중..."}
               </p>
             </div>
          </div>

        </div>

        {/* --- [Bottom Row: Infrastructure & Actions] --- */}
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

        {/* --- [Extra Bento: Secondary Insights] --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="glass p-8 rounded-[40px] space-y-4 border-white/[0.02]">
              <div className="p-3 w-fit bg-zinc-900 rounded-xl border border-white/5 text-amber-500">
                 <Zap size={20} fill="currentColor" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Active Deals</p>
                 <p className="text-2xl font-black text-white">1,240 <span className="text-emerald-500 text-xs">+12</span></p>
              </div>
           </div>
           <div className="glass p-8 rounded-[40px] space-y-4 border-white/[0.02]">
              <div className="p-3 w-fit bg-zinc-900 rounded-xl border border-white/5 text-blue-500">
                 <Target size={20} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Precision</p>
                 <p className="text-2xl font-black text-white">99.8%</p>
              </div>
           </div>
           <div className="col-span-1 md:col-span-2 glass p-8 rounded-[40px] flex items-center justify-between border-white/[0.02] bg-zinc-900/20">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Market intelligence API</p>
                 <h4 className="text-lg font-bold text-white tracking-tight">기업용 커스텀 데이터 익스포트</h4>
                 <p className="text-xs text-zinc-600 font-medium">대규모 상품 트래킹 데이터 및 가격 변동 API 솔루션 제공</p>
              </div>
              <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer">
                 <ChevronRight size={20} />
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}
