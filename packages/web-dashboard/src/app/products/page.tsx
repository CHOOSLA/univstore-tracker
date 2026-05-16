import React from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  CreditCard, 
  Truck,
  Zap,
  LayoutGrid,
  List
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

// --- High Density Mock Data ---
const MOCK_PRODUCTS = Array.from({ length: 20 }).map((_, i) => ({
  id: `${138000 + i}`,
  brand: i % 3 === 0 ? "Apple" : i % 3 === 1 ? "Samsung" : "LG",
  name: i % 3 === 0 ? `MacBook Pro 1${4 + (i%2)} M3 Max` : i % 3 === 1 ? `Galaxy S24 Ultra Titanium` : `UltraGear 27" Gaming`,
  currentPrice: 1500000 - (i * 20000),
  oldPrice: 1750000 - (i * 10000),
  dropRate: (Math.random() * 25).toFixed(1),
  isATL: i % 4 === 0,
  bestBenefit: i % 2 === 0 ? "KB Pay 6만" : "Payco 5만",
  stockStatus: i % 7 === 0 ? "Low Stock" : "In Stock",
  history: Array.from({ length: 12 }).map(() => Math.floor(Math.random() * 400000) + 1100000)
}));

export default function ProductsPage() {
  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter">Explorer</h1>
            <p className="text-zinc-500 text-lg">실시간 학생 할인가 및 카드사 혜택 데이터 센터</p>
          </div>
          <div className="flex items-center space-x-3">
             <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
               {MOCK_PRODUCTS.length} Items Found
             </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 bg-zinc-900/30 p-2 rounded-[28px] border border-white/5 backdrop-blur-md">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by brand, name, or product ID..." 
              className="w-full bg-transparent border-none rounded-2xl py-4 pl-14 pr-4 text-sm focus:outline-none placeholder:text-zinc-600 font-medium"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 bg-zinc-900/80 border border-white/10 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
              <Filter size={14} />
              <span>Advanced Filter</span>
            </button>
            <button className="bg-blue-600 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
              Refresh
            </button>
          </div>
        </div>

        {/* High Density Table */}
        <div className="glass rounded-[40px] overflow-hidden border-white/[0.03]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <th className="pl-10 pr-6 py-6">Product Details</th>
                <th className="px-6 py-6 text-right">Price Matrix</th>
                <th className="px-6 py-6 text-center">Trend (14D)</th>
                <th className="pr-10 pl-6 py-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_PRODUCTS.map((item) => (
                <tr key={item.id} className="group hover:bg-white/[0.02] transition-all relative">
                  <td className="pl-10 pr-6 py-8">
                    <Link href={`/product/${item.id}`} className="absolute inset-0 z-10" />
                    <div className="flex items-center space-x-6 relative z-0">
                      <div className="w-14 h-14 bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
                        <div className="text-[8px] text-zinc-700 font-black uppercase tracking-tighter">IMAGE</div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{item.brand}</span>
                          {item.isATL && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded border border-amber-500/20 uppercase">ATL</span>}
                        </div>
                        <p className="text-base font-black text-white group-hover:text-blue-400 transition-colors">{item.name}</p>
                        <div className="flex items-center space-x-3 text-[11px] text-zinc-500 font-bold">
                           <span className="flex items-center space-x-1 text-emerald-400/80">
                             <CreditCard size={10} /> <span>{item.bestBenefit}</span>
                           </span>
                           <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                           <span className="flex items-center space-x-1">
                             <Truck size={10} /> <span>무료 배송</span>
                           </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-right relative z-0">
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline space-x-2">
                         <span className="text-xs text-zinc-600 line-through tabular-nums font-medium">₩{item.oldPrice.toLocaleString()}</span>
                         <span className="text-red-500 font-black text-sm">-{item.dropRate}%</span>
                      </div>
                      <p className="text-2xl font-black text-white tracking-tighter tabular-nums">₩{item.currentPrice.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-8 relative z-0">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Sparkline data={item.history} color={parseFloat(item.dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Volatility Check</span>
                    </div>
                  </td>
                  <td className="pr-10 pl-6 py-8 text-right relative z-0">
                    <div className="flex items-center justify-end space-x-4">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest",
                          item.stockStatus === "Low Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {item.stockStatus}
                        </span>
                        <p className="text-[10px] font-bold text-zinc-600 mt-2 italic">Ref: {item.id}</p>
                      </div>
                      <div className="p-3 bg-zinc-900 rounded-2xl border border-white/5 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                        <Zap size={18} className={cn(item.isATL && "fill-amber-500 text-amber-500")} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Placeholder */}
          <div className="bg-white/[0.01] px-10 py-8 border-t border-white/5 flex justify-between items-center">
            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Showing 1 to 20 of {MOCK_PRODUCTS.length} items</p>
            <div className="flex space-x-2">
               {[1, 2, 3, '...', 12].map((p, i) => (
                 <button key={i} className={cn(
                   "w-10 h-10 rounded-xl text-xs font-black transition-all",
                   p === 1 ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                 )}>
                   {p}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
