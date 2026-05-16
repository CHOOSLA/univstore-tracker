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
  ResponsiveContainer 
} from 'recharts';
import { cn } from "@/lib/utils";

const MOCK_DETAIL_HISTORY = [
  { date: '2026-05-10', price: 949000 },
  { date: '2026-05-11', price: 949000 },
  { date: '2026-05-12', price: 920000 },
  { date: '2026-05-13', price: 920000 },
  { date: '2026-05-14', price: 890000 },
  { date: '2026-05-15', price: 880000 },
  { date: '2026-05-16', price: 863000 },
];

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen pb-20">
      {/* Universal Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">U</div>
          <span className="text-xl font-bold tracking-tighter text-white">UnivWatch.</span>
        </Link>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/products" className="hover:text-white transition-colors">Products</Link>
          <Link href="/alerts" className="hover:text-white transition-colors">Alerts</Link>
          <Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link>
        </div>
        <div className="w-20" />
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-4 space-y-12">
        {/* Product Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="aspect-square bg-zinc-900 rounded-[40px] border border-white/5 flex items-center justify-center text-zinc-700 font-black text-4xl">
            PRODUCT IMAGE
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">Apple</span>
              <h1 className="text-4xl font-black text-white leading-tight">
                iPad Air 11 (M4 모델) <br /> Wi‑Fi 128GB - Space Gray
              </h1>
              <p className="text-zinc-500 font-mono text-sm">Product ID: {params.id}</p>
            </div>
            
            <div className="flex items-end space-x-4">
              <div className="space-y-1">
                <p className="text-sm text-zinc-500 font-bold uppercase">Current Price</p>
                <p className="text-5xl font-black text-white">₩863,000</p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-sm font-black border border-emerald-500/20 mb-2">
                All-Time Low
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
              <StatItem label="High" value="₩949,000" color="text-zinc-400" />
              <StatItem label="Low" value="₩863,000" color="text-red-400" />
              <StatItem label="Average" value="₩912,000" color="text-blue-400" />
            </div>

            <button className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-zinc-200 transition-colors mt-8">
              Buy on UnivStore
            </button>
          </div>
        </div>

        {/* Detailed Chart Section */}
        <div className="glass rounded-[40px] p-10 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">Price History Analysis</h2>
            <div className="flex space-x-2">
              {['7D', '1M', '3M', 'ALL'].map(t => (
                <button key={t} className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 border border-white/5 hover:border-white/20 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DETAIL_HISTORY}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${val/10000}만`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
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
