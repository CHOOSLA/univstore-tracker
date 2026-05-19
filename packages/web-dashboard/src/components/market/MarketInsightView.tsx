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
  Radar
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
  Sparkles
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

  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-8">
        
        {/* Page Header (Compact & Sharp) */}
        <section className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-blue-500">
              <Sparkles size={18} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Intelligence Hub</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">Market Pulse.</h1>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Global Integrity</p>
             <p className="text-xl font-black text-white">99.9% <span className="text-emerald-500 text-xs font-bold">Verified</span></p>
          </div>
        </section>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[200px]">
          
          {/* Main Hero Bento: Savings Trend (4x3) */}
          <div className="md:col-span-8 md:row-span-2 glass p-10 rounded-[40px] border-blue-500/10 bg-gradient-to-br from-blue-500/[0.03] to-transparent flex flex-col justify-between overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp size={120} strokeWidth={1} className="text-blue-500" />
             </div>
             <div className="z-10">
               <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Savings Index Trend</h3>
               <p className="text-5xl font-black text-white tracking-tighter">₩{totalSavings.toLocaleString()}</p>
               <p className="text-xs text-zinc-500 mt-2 font-medium flex items-center">
                 <ArrowUpRight size={14} className="mr-1 text-emerald-500" /> 
                 <span className="text-emerald-500 font-bold mr-1">+12.5%</span> vs Last Week
               </p>
             </div>
             <div className="h-[180px] w-full mt-4 -mx-4">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={savingsHistory}>
                   <defs>
                     <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px' }}
                     itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                   />
                   <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" isAnimationActive={false} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Stats Bento: Data Points (4x1) */}
          <div className="md:col-span-4 md:row-span-1 glass p-8 rounded-[40px] flex flex-col justify-center border-white/[0.03] hover:border-blue-500/20 transition-all">
             <div className="flex items-center space-x-4">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5">
                   <Layers size={24} className="text-zinc-400" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Monitored</p>
                   <p className="text-3xl font-black text-white">{totalDataPoints.toLocaleString()}</p>
                </div>
             </div>
          </div>

          {/* Radar Bento: Brand Comparison (4x2) */}
          <div className="md:col-span-4 md:row-span-2 glass p-8 rounded-[40px] flex flex-col items-center justify-between border-white/[0.03]">
             <div className="w-full flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-tighter">Brand Efficiency</h3>
                <Activity size={16} className="text-zinc-700" />
             </div>
             <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                     <PolarGrid stroke="#18181b" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 'bold' }} />
                     <Radar name="Discount Rate" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} isAnimationActive={false} />
                   </RadarChart>
                </ResponsiveContainer>
             </div>
             <p className="text-[10px] text-zinc-600 font-bold text-center leading-relaxed">
                상위 5개 브랜드의 카테고리별 <br />평균 할인 효율을 비교 분석한 데이터입니다.
             </p>
          </div>

          {/* Pie Bento: Brand Dominance (5x2) */}
          <div className="md:col-span-5 md:row-span-2 glass p-8 rounded-[40px] flex flex-col border-white/[0.03]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-tighter">Inventory Mix</h3>
                <div className="px-3 py-1 bg-zinc-900 border border-white/5 rounded-full text-[8px] font-black text-zinc-500 uppercase">Live Distribution</div>
             </div>
             <div className="flex-1 flex items-center">
                <div className="h-[220px] w-1/2">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={brandDistribution} innerRadius={60} outerRadius={90} paddingAngle={10} dataKey="value" isAnimationActive={false}>
                         {brandDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                       </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-4 pl-6">
                   {brandDistribution.slice(0, 4).map((item) => (
                     <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                           <span className="text-zinc-500">{item.name}</span>
                           <span className="text-white">{Math.round((item.value / totalDataPoints) * 100)}%</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                           <div className="h-full rounded-full" style={{ width: `${(item.value / totalDataPoints) * 100}%`, backgroundColor: item.color }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Small Bento: Market Status (3x1) */}
          <div className="md:col-span-3 md:row-span-1 glass p-6 rounded-[40px] flex flex-col justify-between border-emerald-500/10 bg-emerald-500/[0.01]">
             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Market Pulse</p>
             <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <p className="text-2xl font-black text-white uppercase tracking-tighter">Normal</p>
             </div>
          </div>

          {/* Long Horizontal Bento: Verification (12x1) */}
          <div className="md:col-span-12 md:row-span-1 glass p-8 rounded-[40px] flex items-center justify-between border-blue-500/10 mt-2">
             <div className="flex items-center space-x-6">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5">
                   <ShieldCheck className="text-blue-500" size={32} />
                </div>
                <div className="space-y-1">
                   <h4 className="font-bold text-white text-lg">Infrastructure Integrity Verified</h4>
                   <p className="text-sm text-zinc-500 font-medium">본 리포트는 실시간 분산 수집 노드로부터 전송된 {totalDataPoints.toLocaleString()}개의 데이터 포인트를 기반으로 합니다.</p>
                </div>
             </div>
             <ReportDownloader />
          </div>

        </div>

      </main>
    </div>
  );
}
