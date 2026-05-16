import React from 'react';
import { Search, Filter, ArrowUpDown, ChevronRight } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

// --- Mock Data (더 많은 데이터) ---
const MOCK_PRODUCTS = Array.from({ length: 15 }).map((_, i) => ({
  id: `${138000 + i}`,
  brand: i % 3 === 0 ? "Apple" : i % 3 === 1 ? "Samsung" : "LG",
  name: i % 3 === 0 ? `MacBook Pro 1${4 + (i%2)} M3 Max` : i % 3 === 1 ? `Galaxy S24 Ultra` : `UltraGear Monitor`,
  price: 1500000 - (i * 50000),
  dropRate: (Math.random() * 20).toFixed(1),
  isATL: i % 5 === 0,
  history: Array.from({ length: 10 }).map(() => Math.floor(Math.random() * 500000) + 1000000)
}));

export default function ProductsPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Sub-header */}
      <div className="glass border-b border-white/5 px-6 py-12 mb-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-4xl font-black text-white">Product Explorer</h1>
          <p className="text-zinc-400">수천 개의 학생 할인 품목을 실시간으로 검색하고 필터링하세요.</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900/30 p-2 rounded-2xl border border-white/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full bg-zinc-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors">
              <Filter size={16} />
              <span>Filters</span>
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-blue-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors">
              <span>Apply</span>
            </button>
          </div>
        </div>

        {/* High Density Table */}
        <div className="glass rounded-3xl overflow-hidden border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-[11px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                <th className="px-6 py-5">Product Info</th>
                <th className="px-6 py-5">
                  <div className="flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
                    <span>Price</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-5 text-center">Trend (7D)</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_PRODUCTS.map((item) => (
                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-zinc-900 rounded-lg border border-white/5 flex items-center justify-center text-[8px] text-zinc-600 font-bold">IMG</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">{item.brand}</span>
                          {item.isATL && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/20">ATL</span>}
                        </div>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{item.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-white">₩{item.price.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-red-500">-{item.dropRate}%</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <Sparkline data={item.history} color={parseFloat(item.dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 bg-zinc-900 rounded-lg border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
