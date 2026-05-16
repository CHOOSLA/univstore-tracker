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
  ShieldCheck,
  CreditCard,
  Truck
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

// --- Rich Mock Data (결제 혜택 및 재고 상태 포함) ---
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
    category: "Tablet",
    bestBenefit: "KB Pay 6만원 할인",
    stockStatus: "In Stock",
    delivery: "무료 배송"
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
    category: "Laptop",
    bestBenefit: "토스페이 10만원 할인",
    stockStatus: "Low Stock",
    delivery: "당일 출고"
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
    category: "Smartphone",
    bestBenefit: "카카오페이 5만원 할인",
    stockStatus: "In Stock",
    delivery: "무료 배송"
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
    <div className="pb-20">
      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 text-center md:text-left">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1] md:leading-[1.1]">
            Unbeatable <span className="text-blue-500 italic">Deals</span> <br />
            For Students.
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg md:text-xl">
            단순한 가격 비교를 넘어 카드사 혜택, 재고 상태, <br className="hidden md:block" />
            번들 할인까지 실시간으로 분석하여 최적의 구매 시점을 제안합니다.
          </p>
        </section>

        {/* Top Tier Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Price Drops" value="128" sub="Today's total" icon={TrendingDown} accent="text-red-500" />
          <MetricCard title="All-Time Lows" value="24" sub="Records broken" icon={Award} accent="text-amber-500" />
          <MetricCard title="Stock Alerts" value="15" sub="Low stock found" icon={Package} accent="text-blue-500" />
          <MetricCard title="Next Sync" value="14:02" sub="Countdown" icon={Clock} accent="text-zinc-500" />
        </div>

        {/* Bento Grid: Featured Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Main List Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Zap className="mr-2 text-yellow-400 fill-yellow-400" size={20} />
                Hottest Student Discounts
              </h2>
              <Link href="/products" className="text-sm font-medium text-zinc-500 hover:text-white flex items-center transition-colors">
                Explore all items <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid gap-3">
              {MOCK_TOP_DROPS.map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="glass glass-hover p-5 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between group cursor-pointer border-white/[0.05]">
                  <div className="flex items-center space-x-6">
                    <div className="relative w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-105 transition-transform">
                      <div className="text-[10px] text-zinc-700 uppercase font-black tracking-tighter">PREVIEW</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.brand}</span>
                        {item.isATL && (
                          <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">All-Time Low</span>
                        )}
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase",
                          item.stockStatus === "Low Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {item.stockStatus}
                        </span>
                      </div>
                      <p className="text-white font-black text-xl group-hover:text-blue-400 transition-colors">{item.name}</p>
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                          <CreditCard size={12} />
                          <span>{item.bestBenefit}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-zinc-500">
                          <Truck size={12} />
                          <span>{item.delivery}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-8 mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-right mb-2">Trend Analysis</p>
                      <Sparkline data={item.history} color={item.dropRate > 10 ? "#ef4444" : "#3b82f6"} />
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end space-x-2">
                        <span className="text-xs text-zinc-500 line-through">₩{item.oldPrice.toLocaleString()}</span>
                        <span className="text-red-500 font-black text-lg">-{item.dropRate}%</span>
                      </div>
                      <p className="text-3xl font-black text-white leading-none">₩{item.currentPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-6 h-full">
            <h2 className="text-2xl font-bold text-white px-2">Market Pulse</h2>
            <div className="grid grid-cols-2 gap-4">
              {CATEGORY_STATS.map((cat, i) => (
                <Link key={i} href={`/products?brand=${cat.label}`} className="glass glass-hover p-6 rounded-[32px] flex flex-col justify-between aspect-square group border-white/[0.05]">
                  <div className={cn("p-4 w-fit rounded-2xl bg-zinc-950/50 border border-white/5 group-hover:scale-110 transition-transform", cat.color)}>
                    <cat.icon size={24} />
                  </div>
                  <div className="mt-4">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{cat.label}</p>
                    <p className="text-3xl font-black text-white">{cat.count}</p>
                    <p className="text-[10px] text-emerald-500 font-bold mt-1"> Avg. -{cat.avgDrop} Today</p>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="glass p-8 rounded-[40px] space-y-6 border-blue-500/20 bg-blue-500/[0.02]">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="text-blue-500" size={28} />
                <h3 className="font-black text-white text-xl tracking-tight">System Node</h3>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                우분투 서버에서 24시간 동작하는 크롤러가 실시간으로 데이터를 검증하고 Redis 큐를 통해 무결성을 확보합니다.
              </p>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    <span>Queue Congestion</span>
                    <span className="text-blue-400">Optimal (12ms)</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full w-[15%] bg-blue-500 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    <span>DB Index Health</span>
                    <span className="text-emerald-400">98.2% Sync</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full w-[98%] bg-emerald-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon, accent }: any) {
  return (
    <div className="glass p-7 rounded-[32px] flex items-start justify-between border-white/[0.03]">
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">{title}</p>
        <p className="text-5xl font-black text-white tabular-nums">{value}</p>
        <p className={cn("text-xs font-bold mt-3", accent)}>{sub}</p>
      </div>
      <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5">
        <Icon size={24} className={accent} />
      </div>
    </div>
  );
}
