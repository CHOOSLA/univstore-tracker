"use client";

import React from 'react';
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
  ShieldCheck, 
  Zap, 
  Info, 
  CreditCard, 
  History,
  TrendingDown,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Deep Analysis Mock Data ---
const MOCK_PRICE_HISTORY = [
  { date: '05/10', price: 949000 },
  { date: '05/11', price: 949000 },
  { date: '05/12', price: 920000 },
  { date: '05/13', price: 920000 },
  { date: '05/14', price: 890000 },
  { date: '05/15', price: 880000 },
  { date: '05/16', price: 863000 },
];

const MOCK_VOLATILITY_DATA = [
  { name: 'Avg', price: 912000 },
  { name: 'Min', price: 863000 },
  { name: 'Max', price: 949000 },
];

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const currentPrice = 863000;
  const originalPrice = 949000;
  const cardDiscount = 60000; // KB Pay 예시
  const finalPrice = currentPrice - cardDiscount;

  return (
    <div className="pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-6 pt-4 space-y-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Product Visuals & Main Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass rounded-[40px] p-2 overflow-hidden aspect-[4/3] relative flex items-center justify-center border-white/[0.03]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-50" />
              <span className="text-zinc-800 font-black text-6xl tracking-tighter opacity-20 uppercase">Apple Product</span>
              {/* <img src={imageUrl} /> */}
            </div>

            <div className="glass p-10 rounded-[40px] space-y-8 border-white/[0.03]">
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="bg-zinc-900 text-zinc-400 text-[10px] font-black px-2 py-1 rounded border border-white/5 uppercase tracking-widest">Apple</span>
                    <span className="bg-blue-600/10 text-blue-500 text-[10px] font-black px-2 py-1 rounded border border-blue-500/20 uppercase tracking-widest">In Stock</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                    iPad Air 11 (M4 모델) <br /> Wi‑Fi 128GB - Space Gray
                  </h1>
                </div>
                <div className="p-4 bg-zinc-900 rounded-3xl border border-white/5">
                  <TrendingDown className="text-red-500" size={32} />
                </div>
              </div>

              <div className="h-[300px] w-full pt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_PRICE_HISTORY}>
                    <defs>
                      <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="date" stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis hide domain={['dataMin - 50000', 'dataMax + 50000']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPriceDetail)" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: Price Receipt & Deep Insights */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* The Price Receipt Card */}
            <div className="glass p-8 rounded-[40px] border-zinc-100/10 bg-zinc-100/[0.02] space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] -mr-16 -mt-16" />
              
              <div className="space-y-1">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Live Pricing Analysis</h3>
                <p className="text-sm text-zinc-400">마지막 업데이트: 방금 전 (01:42)</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-zinc-400 text-sm">
                  <span>정상 판매가</span>
                  <span className="line-through font-mono">₩{originalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">학생 할인가</span>
                    <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-1.5 py-0.5 rounded border border-red-500/20">-9.1%</span>
                  </div>
                  <span className="text-2xl font-black font-mono">₩{currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400">
                  <div className="flex items-center space-x-2">
                    <CreditCard size={16} />
                    <span className="font-bold text-sm">KB Pay 결제 혜택</span>
                  </div>
                  <span className="font-black font-mono">- ₩{cardDiscount.toLocaleString()}</span>
                </div>
                
                <div className="pt-6 border-t border-white/5 space-y-2">
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-widest text-right">최종 실질 구매가</p>
                  <p className="text-6xl font-black text-white text-right tracking-tighter tabular-nums">
                    ₩{finalPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center space-x-2 bg-white text-black h-14 rounded-2xl font-black hover:bg-zinc-200 transition-all">
                  <span>Buy Now</span>
                  <ExternalLink size={18} />
                </button>
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
                    <BarChart data={MOCK_VOLATILITY_DATA}>
                      <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                        {MOCK_VOLATILITY_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 1 ? '#ef4444' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs font-bold text-zinc-400 mt-4 text-center text-nowrap italic">Lowest recorded in 30 days</p>
              </div>

              <div className="glass p-6 rounded-[32px] border-white/[0.03] flex flex-col justify-between">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center">
                    <Percent className="mr-2" size={12} /> Student Perk
                  </p>
                  <p className="text-2xl font-black text-white leading-none">AppleCare+ <br/> 25% Off</p>
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                    본 상품 구매 시 애플케어플러스 패키지 할인이 적용됩니다.
                  </p>
                </div>
                <div className="flex items-center text-blue-500 space-x-1 text-xs font-black uppercase tracking-tighter cursor-pointer hover:underline pt-2">
                  <span>View Details</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>

            {/* System Log Insight */}
            <div className="glass p-6 rounded-[32px] border-white/[0.03] space-y-4">
               <div className="flex items-center space-x-2 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                  <Info size={14} />
                  <span>Insight</span>
               </div>
               <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                  현재 가격은 지난 90일 평균 대비 <span className="text-blue-500 font-bold">₩49,000</span> 저렴합니다. 
                  주요 카드사 혜택이 종료되기 전 구매를 권장합니다.
               </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
