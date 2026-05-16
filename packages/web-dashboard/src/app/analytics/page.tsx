import React from 'react';
import Link from 'next/link';
import { BarChart3, PieChart, Activity, Zap, Cpu, Database } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen pb-20">
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">U</div>
          <span className="text-xl font-bold tracking-tighter text-white">UnivWatch.</span>
        </Link>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/products" className="hover:text-white transition-colors">Products</Link>
          <Link href="/alerts" className="hover:text-white transition-colors">Alerts</Link>
          <Link href="/analytics" className="text-white">Analytics</Link>
        </div>
        <div className="w-20" />
      </nav>

      <main className="max-w-7xl mx-auto px-6 space-y-12">
        <section className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white">Macro Analysis</h1>
            <p className="text-zinc-500 text-lg">전체 수집 데이터에 대한 통계 및 시스템 성능 지표</p>
          </div>
          <div className="flex space-x-3 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
            {['24H', '7D', '30D', 'YTD'].map(t => (
              <button key={t} className="px-5 py-2.5 rounded-xl text-xs font-black hover:bg-zinc-800 transition-all">
                {t}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass p-10 rounded-[40px] flex flex-col justify-between min-h-[500px]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">Market Volatility</h2>
                <p className="text-sm text-zinc-500">시간별 전체 카테고리 가격 변동 지수</p>
              </div>
              <BarChart3 className="text-blue-500" />
            </div>
            <div className="flex-1 flex items-center justify-center border-y border-white/5 my-8">
              <span className="text-zinc-700 font-black text-6xl opacity-20 uppercase tracking-tighter">Big Chart Area</span>
            </div>
            <div className="flex space-x-8">
              <Stat mini label="Volatility" value="4.2%" color="text-red-400" />
              <Stat mini label="Avg. Discount" value="12.8%" color="text-blue-400" />
              <Stat mini label="Peak Activity" value="03:00 AM" color="text-zinc-400" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-8 rounded-[40px] space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white uppercase text-xs tracking-widest">Brand Share</h3>
                <PieChart size={18} className="text-emerald-500" />
              </div>
              <div className="aspect-square bg-zinc-950/50 rounded-full border-8 border-zinc-900 flex items-center justify-center">
                <span className="font-black text-xl">1.2K+ Items</span>
              </div>
              <div className="space-y-2">
                <BrandRow label="Apple" percent={45} color="bg-zinc-100" />
                <BrandRow label="Samsung" percent={30} color="bg-blue-500" />
                <BrandRow label="LG" percent={15} color="bg-red-500" />
              </div>
            </div>

            <div className="glass p-8 rounded-[40px] space-y-6">
              <h3 className="font-bold text-white uppercase text-xs tracking-widest">Infrastructure</h3>
              <div className="grid grid-cols-2 gap-4">
                <InfraBox icon={Zap} label="Redis" status="Healthy" />
                <InfraBox icon={Database} label="PostgreSQL" status="98.2%" />
                <InfraBox icon={Cpu} label="Workers" status="4 Active" />
                <InfraBox icon={Activity} label="Latency" status="12ms" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color, mini }: any) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
      <p className={cn("text-2xl font-black", color)}>{value}</p>
    </div>
  );
}

function BrandRow({ label, percent, color }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function InfraBox({ icon: Icon, label, status }: any) {
  return (
    <div className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5 space-y-2">
      <Icon size={16} className="text-zinc-600" />
      <p className="text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
      <p className="text-sm font-black text-white">{status}</p>
    </div>
  );
}
