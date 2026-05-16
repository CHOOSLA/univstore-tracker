"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  PieChart, 
  Activity, 
  Zap, 
  Cpu, 
  Database, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  History,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';

// --- Analytics Mock Data ---
const MOCK_PULSE_DATA = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  requests: Math.floor(Math.random() * 50) + 10,
  errors: Math.random() > 0.9 ? 1 : 0
}));

const MOCK_MARKET_TREND = [
  { date: '05/10', avgDiscount: 8.2 },
  { date: '05/11', avgDiscount: 8.5 },
  { date: '05/12', avgDiscount: 10.1 },
  { date: '05/13', avgDiscount: 9.8 },
  { date: '05/14', avgDiscount: 12.4 },
  { date: '05/15', avgDiscount: 11.2 },
  { date: '05/16', avgDiscount: 13.5 },
];

const BRAND_DISTRIBUTION = [
  { name: 'Apple', value: 45, color: '#fafafa' },
  { name: 'Samsung', value: 30, color: '#3b82f6' },
  { name: 'LG', value: 15, color: '#ef4444' },
  { name: 'Others', value: 10, color: '#27272a' },
];

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest text-xs animate-pulse">Initializing System Pulse...</div>;
  }

  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-10">
        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter">System Pulse</h1>
            <p className="text-zinc-500 text-lg">전체 데이터 파이프라인 및 시장 매크로 분석 지표</p>
          </div>
          <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
            {['LIVE', '24H', '7D', '30D'].map(t => (
              <button key={t} className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black transition-all",
                t === '24H' ? "bg-white text-black" : "text-zinc-500 hover:text-white"
              )}>{t}</button>
            ))}
          </div>
        </section>

        {/* Macro Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <AnalyticMetric label="Market Volatility" value="4.2%" trend="+0.8%" isPositive={false} />
           <AnalyticMetric label="Avg. Discount Rate" value="13.5%" trend="+2.1%" isPositive={true} />
           <AnalyticMetric label="Total Throughput" value="1.2M" trend="Nodes" isPositive={null} />
           <AnalyticMetric label="System Latency" value="12ms" trend="Stable" isPositive={true} />
        </div>

        {/* Main Analytics Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Market Trend Area */}
          <div className="lg:col-span-8 glass p-10 rounded-[40px] border-white/[0.03] space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">Market Discount Index</h3>
                <p className="text-xs text-zinc-500 font-medium">지난 7일간의 카테고리 전체 평균 할인율 변화</p>
              </div>
              <History className="text-zinc-700" />
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_MARKET_TREND}>
                  <defs>
                    <linearGradient id="marketColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis dataKey="date" stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="avgDiscount" stroke="#3b82f6" strokeWidth={3} fill="url(#marketColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass p-8 rounded-[40px] border-white/[0.03] space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Infra Nodes</h3>
                <RefreshCw size={14} className="text-zinc-700 animate-spin-slow" />
              </div>
              <div className="space-y-4">
                <HealthItem icon={Zap} label="Redis Buffer" status="Healthy" value="0.02ms" color="text-blue-500" />
                <HealthItem icon={Database} label="PostgreSQL" status="Optimized" value="98.4%" color="text-emerald-500" />
                <HealthItem icon={Cpu} label="Crawler Node" status="Polling" value="2.4s/req" color="text-zinc-100" />
                <HealthItem icon={Activity} label="Memory Load" status="Stable" value="1.2GB" color="text-purple-400" />
              </div>
            </div>

            <div className="glass p-8 rounded-[40px] border-white/[0.03] flex flex-col justify-between aspect-square">
               <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Brand Dominance</h3>
               <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BRAND_DISTRIBUTION} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {BRAND_DISTRIBUTION.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <p className="text-[10px] text-zinc-600 font-bold text-center italic uppercase tracking-tighter">Based on 1,240 active tracking items</p>
            </div>
          </div>

        </div>

        {/* Scraper Heartbeat Section */}
        <section className="glass p-10 rounded-[40px] border-white/[0.03] space-y-8">
           <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Scraper Heartbeat</h3>
                <p className="text-sm text-zinc-500">최근 24시간 동안의 데이터 수집 밀도 및 성공률</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-zinc-600 uppercase tracking-widest block mb-1">Status</span>
                <span className="text-emerald-500 font-black text-xl tracking-tighter">Synchronized</span>
              </div>
           </div>
           <div className="h-40 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_PULSE_DATA}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="requests">
                    {MOCK_PULSE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.errors > 0 ? '#ef4444' : '#27272a'} className="hover:fill-blue-500 transition-colors" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </section>
      </main>
    </div>
  );
}

function AnalyticMetric({ label, value, trend, isPositive }: any) {
  return (
    <div className="glass p-8 rounded-[32px] border-white/[0.03] flex flex-col justify-between">
      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-4xl font-black text-white tabular-nums leading-none">{value}</p>
        <div className={cn(
          "flex items-center space-x-1 text-[11px] font-black px-2 py-1 rounded-lg border",
          isPositive === true ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
          isPositive === false ? "bg-red-500/10 text-red-500 border-red-500/20" :
          "bg-zinc-900 text-zinc-500 border-white/5"
        )}>
          {isPositive === true ? <ArrowUpRight size={12} /> : isPositive === false ? <ArrowDownRight size={12} /> : null}
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ icon: Icon, label, status, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-white/5">
      <div className="flex items-center space-x-4">
        <div className={cn("p-2 rounded-lg bg-zinc-900 border border-white/5", color)}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs font-black text-white">{label}</p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase">{status}</p>
        </div>
      </div>
      <p className="font-mono text-xs font-bold text-zinc-400">{value}</p>
    </div>
  );
}
