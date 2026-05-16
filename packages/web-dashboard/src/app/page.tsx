import React from 'react';
import Link from 'next/link';
import { 
  TrendingDown, 
  Award, 
  Package, 
  Clock, 
  ChevronRight, 
  Smartphone, 
  Laptop, 
  Monitor, 
  Zap,
  ArrowDownRight,
  ShieldCheck
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

// --- Mock Data (pizzint.watch 스타일의 고밀도 데이터) ---
const MOCK_TOP_DROPS = [
  {
    id: "138746",
    brand: "Apple",
    name: "iPad Air 11 (M4 모델) Wi‑Fi 128GB",
    currentPrice: 863000,
    oldPrice: 949000,
    dropRate: 9.1,
    isATL: true,
    history: [949000, 949000, 920000, 910000, 890000, 863000],
    category: "Tablet"
  },
  {
    id: "138929",
    brand: "Apple",
    name: "MacBook Air 13 M3 16GB 512GB",
    currentPrice: 1596000,
    oldPrice: 1790000,
    dropRate: 10.8,
    isATL: false,
    history: [1790000, 1790000, 1750000, 1700000, 1650000, 1596000],
    category: "Laptop"
  },
  {
    id: "140221",
    brand: "Samsung",
    name: "Galaxy S24 Ultra 256GB Titanium Gray",
    currentPrice: 1420000,
    oldPrice: 1690000,
    dropRate: 15.9,
    isATL: true,
    history: [1690000, 1650000, 1600000, 1550000, 1500000, 1420000],
    category: "Smartphone"
  }
];

const CATEGORY_STATS = [
  { label: "Apple", count: 420, avgDrop: "12%", icon: Laptop, color: "text-zinc-50" },
  { label: "Samsung", count: 310, avgDrop: "15%", icon: Smartphone, color: "text-blue-400" },
  { label: "LG", count: 180, avgDrop: "8%", icon: Monitor, color: "text-red-500" },
  { label: "Others", count: 330, avgDrop: "5%", icon: Package, color: "text-zinc-500" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">U</div>
          <span className="text-xl font-bold tracking-tighter text-white">UnivWatch.</span>
        </Link>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-zinc-400">
          <Link href="/" className="text-white">Dashboard</Link>
          <Link href="/products" className="hover:text-white transition-colors">Products</Link>
          <Link href="/alerts" className="hover:text-white transition-colors">Alerts</Link>
          <Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link>
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">LIVE DATA</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-white leading-[1.1]">
            Track the <span className="text-blue-500">Unbeatable</span> <br />
            Student Privileges.
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg">
            학생복지스토어의 수천 개 품목을 실시간으로 추적합니다. <br />
            역대 최저가(ATL)와 가격 급락 상품을 데이터로 증명합니다.
          </p>
        </section>

        {/* Top Tier Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Today's Drops" value="128" sub="전일 대비 +12%" icon={TrendingDown} accent="text-red-500" />
          <MetricCard title="ATL Hit" value="24" sub="역대 최저가 경신" icon={Award} accent="text-amber-500" />
          <MetricCard title="Active Scrapers" value="8" sub="실시간 동작 중" icon={Zap} accent="text-blue-500" />
          <MetricCard title="Last Pulse" value="1:42 AM" sub="동기화 완료" icon={Clock} accent="text-zinc-500" />
        </div>

        {/* Bento Grid: Featured Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Main List Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <ArrowDownRight className="mr-2 text-red-500" />
                Featured Price Drops
              </h2>
              <Link href="/products" className="text-sm font-medium text-zinc-500 hover:text-white flex items-center">
                View all items <ChevronRight size={16} />
              </Link>
            </div>

            <div className="space-y-3">
              {MOCK_TOP_DROPS.map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="glass glass-hover p-4 rounded-2xl flex items-center justify-between group cursor-pointer block">
                  <div className="flex items-center space-x-5">
                    <div className="relative w-16 h-16 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5 overflow-hidden">
                      <div className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter">PRODUCT</div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.brand}</span>
                        {item.isATL && (
                          <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-500/20">ATL</span>
                        )}
                      </div>
                      <p className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">{item.name}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-zinc-500 line-through">₩{item.oldPrice.toLocaleString()}</span>
                        <span className="text-xs font-bold text-red-500">-{item.dropRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8">
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-right mb-1 text-nowrap">7-Day Trend</p>
                      <Sparkline data={item.history} color={item.dropRate > 10 ? "#ef4444" : "#3b82f6"} />
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xl font-black text-white">₩{item.currentPrice.toLocaleString()}</p>
                      <p className="text-[10px] font-mono text-zinc-500 italic">ID: {item.id}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-6 h-full">
            <h2 className="text-2xl font-bold text-white">Brand Pulse</h2>
            <div className="grid grid-cols-2 gap-4">
              {CATEGORY_STATS.map((cat, i) => (
                <Link key={i} href={`/products?brand=${cat.label}`} className="glass glass-hover p-5 rounded-3xl flex flex-col justify-between aspect-square block">
                  <div className={cn("p-3 w-fit rounded-2xl bg-zinc-950/50 border border-white/5", cat.color)}>
                    <cat.icon size={20} />
                  </div>
                  <div className="mt-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{cat.label}</p>
                    <p className="text-2xl font-black text-white">{cat.count}</p>
                    <p className="text-[10px] text-emerald-500 font-bold mt-1">Avg. {cat.avgDrop} Discount</p>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="glass p-6 rounded-3xl space-y-4">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="text-blue-500" />
                <h3 className="font-bold text-white text-lg">System Integrity</h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                모든 가격은 학생 인증 계정을 통해 검증된 실시간 데이터입니다. 
                중간 큐(Redis)를 거쳐 무결성이 보장됩니다.
              </p>
              <div className="pt-2">
                <div className="flex justify-between text-[10px] font-bold text-zinc-600 uppercase mb-2">
                  <span>Queue Health</span>
                  <span>Optimal</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon, accent }: { title: string, value: string, sub: string, icon: any, accent: string }) {
  return (
    <div className="glass p-6 rounded-3xl flex items-start justify-between">
      <div>
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-3">{title}</p>
        <p className="text-4xl font-black text-white">{value}</p>
        <p className={cn("text-xs font-bold mt-2", accent)}>{sub}</p>
      </div>
      <div className="p-3 bg-zinc-950/50 rounded-2xl border border-white/5">
        <Icon size={20} className={accent} />
      </div>
    </div>
  );
}
