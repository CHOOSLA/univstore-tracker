"use client";

import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Globe, 
  ShieldCheck, 
  Target,
  BarChart3,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReportDownloader from "./ReportDownloader";

interface MarketInsightViewProps {
  totalSavings: number;
  brandDistribution: { name: string, value: number, color: string }[];
  categoryEfficiency: { category: string, discount: number }[];
  savingsHistory: { week: string, amount: number }[];
  totalDataPoints: number;
  topValueDeals: {
    id: string;
    title: string;
    brand: string | null;
    currentPrice: number;
    originalPrice: number;
    discountRate: number;
  }[];
}

export default function MarketInsightView({
  totalSavings,
  brandDistribution,
  categoryEfficiency,
  savingsHistory,
  totalDataPoints,
  topValueDeals
}: MarketInsightViewProps) {
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    console.log("🚀 MarketInsightView Mounted");
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Engine...</div>;
  }

  const bestCategory = categoryEfficiency[0];

  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-10">
        
        {/* Page Header */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3 text-blue-500">
            <Globe size={24} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">Market Insights</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">Brand Intelligence.</h1>
          <p className="text-zinc-500 text-xl max-w-3xl">
            브랜드 간의 할인 경쟁과 카테고리별 성과를 정밀 분석합니다. <br />
            실시간 데이터를 기반으로 시장의 흐름(Pulse)을 포착하세요.
          </p>
        </section>

        {/* Top Indicators: Savings Index */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 glass p-10 rounded-[40px] border-blue-500/20 bg-blue-500/[0.02] flex flex-col justify-between min-h-[300px]">
             <div className="flex justify-between items-start text-nowrap">
               <div className="space-y-1">
                 <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Savings Index</h3>
                 <p className="text-4xl font-black text-white">₩{totalSavings.toLocaleString()}+</p>
                 <p className="text-sm text-zinc-500">UnivWatch 사용자들이 정가 대비 절약한 총 누적 금액</p>
               </div>
               <TrendingUp className="text-blue-500" size={32} />
             </div>
             <div className="h-[150px] w-full mt-6 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={savingsHistory}>
                   <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} dot={false} isAnimationActive={false} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                     formatter={(value: number) => [`₩${value.toLocaleString()}`, 'Savings']}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>
          
          <div className="glass p-10 rounded-[40px] flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Market Status</h3>
              <p className="text-4xl font-black text-white">{totalSavings > 0 ? "Active" : "Scanning"}</p>
              <p className="text-sm text-zinc-500 italic mt-2 leading-relaxed">
                {totalSavings > 0 
                  ? "실시간 데이터 수집을 통해 시장의 할인 기회를 포착하고 있습니다."
                  : "현재 데이터를 분석 중입니다. 잠시 후 더 정확한 지표가 제공됩니다."}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-blue-500 font-black text-sm pt-4">
               <Info size={18} fill="currentColor" className="text-blue-500" />
               <span>{totalDataPoints} Data Points</span>
            </div>
          </div>
        </div>

        {/* Market Depth Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Brand Dominance (Pie Chart) */}
          <div className="lg:col-span-5 glass p-8 rounded-[40px] space-y-8 border-white/[0.03]">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Brand Dominance</h3>
              <Target className="text-zinc-700" />
            </div>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandDistribution}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {brandDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 px-2">
               {brandDistribution.slice(0, 4).map((brand) => (
                 <div key={brand.name} className="flex items-center space-x-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.color }} />
                   <span className="text-xs font-bold text-zinc-400">{brand.name}</span>
                   <span className="text-xs font-black text-white ml-auto">{brand.value} Items</span>
                 </div>
               ))}
            </div>
          </div>

          {/* Category Efficiency (Bar Chart) */}
          <div className="lg:col-span-7 glass p-8 rounded-[40px] space-y-8 border-white/[0.03]">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Brand Efficiency</h3>
                <BarChart3 className="text-zinc-700" />
             </div>
             <div className="h-[300px] w-full pt-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryEfficiency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="category" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    />
                    <Bar dataKey="discount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="px-4 text-center">
               <p className="text-xs text-zinc-500 font-medium italic leading-relaxed">
                 {bestCategory ? (
                    <>현재 <span className="text-white font-bold underline underline-offset-4">{bestCategory.category}</span> 브랜드가 평균 {bestCategory.discount}%로 가장 높은 할인 효율을 보이고 있습니다.</>
                 ) : "데이터 수집 중..."}
               </p>
             </div>
          </div>

        </div>

        {/* Footer Insight */}
        <div className="glass p-8 rounded-[40px] border-emerald-500/20 bg-emerald-500/[0.01] flex items-center justify-between">
           <div className="flex items-center space-x-6">
              <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <ShieldCheck className="text-emerald-500" size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-lg">Market Integrity Verified</h4>
                <p className="text-sm text-zinc-500">본 분석 리포트는 실시간으로 수집된 {totalDataPoints.toLocaleString()}개의 상품 데이터를 기반으로 생성되었습니다.</p>
              </div>
           </div>
           <ReportDownloader />
        </div>

        {/* --- [Top Value Deals Section] --- */}
        <section className="space-y-6">
           <div className="flex items-center space-x-3 text-amber-500 px-2">
              <Zap size={20} fill="currentColor" />
              <h3 className="text-xl font-bold text-white tracking-tight">Top Value Opportunities</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topValueDeals.map((deal) => (
                <Link 
                  key={deal.id} 
                  href={`/product/${deal.id}`}
                  className="glass p-6 rounded-3xl border-white/[0.03] hover:border-amber-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{deal.brand}</p>
                    <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">{deal.title}</p>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500">
                      <span className="line-through opacity-40">₩{deal.originalPrice.toLocaleString()}</span>
                      <span className="text-zinc-300">₩{deal.currentPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white tracking-tighter">-{deal.discountRate}%</p>
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Efficiency</p>
                  </div>
                </Link>
              ))}
           </div>
        </section>

      </main>
    </div>
  );
}
