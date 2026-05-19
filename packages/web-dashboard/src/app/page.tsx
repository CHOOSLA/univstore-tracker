import React from 'react';
import Link from 'next/link';
import { 
  TrendingDown, 
  Package, 
  Clock, 
  ChevronRight, 
  Smartphone, 
  Laptop, 
  Zap,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 1. 기초 지표 쿼리
  const [totalProductsCount, brandGroups, dailyPicks] = await Promise.all([
    prisma.product.count(),
    prisma.product.groupBy({ by: ['brand'], _count: { id: true } }),
    prisma.dailyPick.findMany({
      include: {
        product: {
          include: {
            priceHistory: {
              orderBy: { timestamp: 'desc' },
              take: 10
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    })
  ]);

  const categoryStats = brandGroups.map(group => ({
    label: group.brand || 'Etc',
    count: group._count.id,
    icon: group.brand === 'Apple' ? Laptop : Smartphone,
    color: group.brand === 'Apple' ? "text-zinc-50" : "text-blue-400"
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  // 상단 매트릭 카드 (의미 없는 항목 제거 후 재구성)
  const metrics = [
    { title: "전체 상품", value: totalProductsCount.toLocaleString(), sub: "Total Items", icon: Package, accent: "text-blue-500" },
    { title: "브랜드 수", value: brandGroups.length, sub: "Active Brands", icon: Zap, accent: "text-amber-500" },
    { title: "큐레이션", value: dailyPicks.length, sub: "UnivWatch Picks", icon: Sparkles, accent: "text-purple-500" },
    { title: "서버 상태", value: "ONLINE", sub: "Sync Active", icon: Clock, accent: "text-emerald-500" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 text-center md:text-left pt-12">
          <div className="flex items-center justify-center md:justify-start space-x-2 text-blue-500 mb-2">
             <Sparkles size={18} fill="currentColor" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Intelligence & Curation</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white leading-[1] md:leading-[1.1]">
            Smart <span className="text-blue-500 italic">Curation</span> <br />
            Data Driven.
          </h1>
          <p className="text-zinc-500 max-w-2xl text-lg md:text-xl font-medium">
            EveryUniv 에디터가 선별한 추천 PICK에 <br className="hidden md:block" />
            UnivWatch의 실시간 가격 엔진을 결합했습니다.
          </p>
        </section>

        {/* Top Tier Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} title={m.title} value={String(m.value)} sub={m.sub} icon={m.icon} accent={m.accent} />
          ))}
        </div>

        {/* --- [UnivWatch Pick Section: The New Materialization] --- */}
        <section className="space-y-8">
           <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                 <h2 className="text-3xl font-black text-white tracking-tight flex items-center">
                    UnivWatch PICK
                 </h2>
                 <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">EveryUniv Curated + Price Engine</p>
              </div>
              <Link href="/products" className="group flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors">
                 <span className="text-xs font-black uppercase tracking-widest">Explore All</span>
                 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {dailyPicks.length > 0 ? dailyPicks.map((pick) => {
                const item = pick.product;
                const currentPrice = item.priceHistory[0]?.price || 0;
                const historyData = item.priceHistory.map(h => h.price).reverse();
                
                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass p-6 rounded-[40px] flex flex-col space-y-6 group glass-hover border-white/[0.03]">
                    <div className="flex justify-between items-start">
                       <div className="w-20 h-20 bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden group-hover:scale-105 transition-transform duration-500 shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-800 font-black">NO IMG</div>
                          )}
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{item.brand || 'Brand'}</p>
                          <p className="text-lg font-black text-white mt-1">₩{currentPrice > 0 ? currentPrice.toLocaleString() : '---'}</p>
                       </div>
                    </div>

                    <div className="space-y-2 flex-1">
                       <p className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                          {item.title}
                       </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                       <div className="flex justify-between items-end">
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">7D Trend</p>
                          {historyData.length > 1 && (
                            <span className="text-[10px] font-bold text-emerald-500">Live Feed</span>
                          )}
                       </div>
                       <div className="h-12 w-full">
                          {historyData.length > 1 ? (
                            <Sparkline data={historyData} color="#3b82f6" height={40} />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-xl">
                               <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Collecting Data...</p>
                            </div>
                          )}
                       </div>
                    </div>
                  </Link>
                );
              }) : (
                <div className="col-span-full glass p-20 rounded-[50px] flex flex-col items-center justify-center space-y-4 border-dashed border-zinc-800">
                  <Package size={48} className="text-zinc-800" />
                  <p className="text-zinc-600 font-bold uppercase tracking-widest">추천 상품을 동기화 중입니다...</p>
                </div>
              )}
           </div>
        </section>

        {/* Sidebar Insights: Brand Pulse */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-4 space-y-6">
              <h2 className="text-2xl font-black text-white px-2 tracking-tight">Brand Pulse</h2>
              <div className="grid grid-cols-2 gap-4">
                {categoryStats.map((cat, i) => (
                  <Link key={i} href={`/products?brand=${cat.label}`} className="glass glass-hover p-6 rounded-[32px] flex flex-col justify-between aspect-square group border-white/[0.05]">
                    <div className={cn("p-4 w-fit rounded-2xl bg-zinc-950/50 border border-white/5 group-hover:scale-110 transition-transform", cat.color)}>
                      <cat.icon size={24} />
                    </div>
                    <div className="mt-4">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{cat.label}</p>
                      <p className="text-3xl font-black text-white">{cat.count}</p>
                      <p className="text-[10px] text-emerald-500 font-bold mt-1">Items Tracked</p>
                    </div>
                  </Link>
                ))}
              </div>
           </div>

           <div className="lg:col-span-8 flex flex-col justify-between">
              <div className="glass p-10 rounded-[50px] space-y-6 border-blue-500/20 bg-blue-500/[0.01] h-full flex flex-col justify-center">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5">
                    <ShieldCheck className="text-blue-500" size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-2xl tracking-tight">Real-time Distributed Node</h3>
                    <p className="text-zinc-500 font-medium mt-1">서버 클러스터가 24시간 작동하며 데이터를 무결하게 유지합니다.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8 pt-8">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Database</p>
                      <p className="text-xl font-black text-white">PostgreSQL</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Cache</p>
                      <p className="text-xl font-black text-white">Redis Cluster</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Latency</p>
                      <p className="text-xl font-black text-emerald-500">{"< 50ms"}</p>
                   </div>
                </div>
              </div>
           </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon, accent }: any) {
  return (
    <div className="glass p-8 rounded-[40px] flex items-start justify-between border-white/[0.03] group hover:border-white/10 transition-all">
      <div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 group-hover:text-zinc-400 transition-colors">{title}</p>
        <p className="text-5xl font-black text-white tabular-nums tracking-tighter">{value}</p>
        <p className={cn("text-[10px] font-bold mt-4 uppercase tracking-widest opacity-80", accent)}>{sub}</p>
      </div>
      <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform">
        <Icon size={24} className={accent} />
      </div>
    </div>
  );
}
