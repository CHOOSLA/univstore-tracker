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
  ArrowRight,
  Database,
  BarChart3
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getStorageMetrics } from "./terminal/actions";
import HomeSearchBar from "@/components/HomeSearchBar";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 1. 데이터 병렬 쿼리 (추천 PICK 전체 수집 및 모든 지표 포함)
  const [totalProductsCount, totalHistoryCount, brandGroups, dailyPicks, featuredProducts, storage, dbStats] = await Promise.all([
    prisma.product.count(),
    prisma.priceHistory.count(),
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
      orderBy: { createdAt: 'asc' },
      take: 24 // 추천 PICK 전체 노출 (24개)
    }),
    prisma.product.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 7
        }
      }
    }),
    getStorageMetrics(),
    prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size('univstore')) as size`.catch(() => [{ size: '0 MB' }])
  ]);

  const categoryStats = brandGroups.map(group => ({
    label: group.brand || 'Etc',
    count: group._count.id,
    icon: group.brand === 'Apple' ? Laptop : Smartphone,
    color: group.brand === 'Apple' ? "text-zinc-50" : "text-blue-400"
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  // 상단 4구 매트릭 완벽 복구
  const metrics = [
    { title: "전체 상품", value: totalProductsCount.toLocaleString(), sub: "Data Scale", icon: Package, accent: "text-blue-500" },
    { title: "누적 데이터", value: totalHistoryCount.toLocaleString(), sub: "Price History", icon: Database, accent: "text-purple-500" },
    { title: "브랜드 수", value: brandGroups.length, sub: "Active Brands", icon: Zap, accent: "text-amber-500" },
    { title: "서버 상태", value: "ONLINE", sub: "Sync Active", icon: Clock, accent: "text-emerald-500" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-6 space-y-12">
        
        {/* --- [Hero Section: Restored Original Text] --- */}
        <section className="space-y-4 text-center md:text-left pt-12">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1] md:leading-[1.1]">
            Real-Time <span className="text-blue-500 italic">Insights</span> <br />
            From UnivStore.
          </h1>
          <p className="text-zinc-400 max-w-3xl text-lg md:text-xl font-medium leading-relaxed">
            33,000+ 데이터 포인트가 증명하는 시장의 무결성. <br className="hidden md:block" />
            UnivWatch는 자체 분산 수집 파이프라인을 통해 가공되지 않은 실시간 가격 변동을 정밀 분석합니다.
          </p>
        </section>

        {/* --- [Top Tier Metrics: Full 4-Card Layout Restored] --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {metrics.map((m, i) => (
             <MetricCard key={i} title={m.title} value={String(m.value)} sub={m.sub} icon={m.icon} accent={m.accent} />
           ))}
        </div>

        {/* --- [Search Bar] --- */}
        <section>
          <HomeSearchBar />
        </section>

        {/* --- [EVERYUNIV 추천 PICK: Full Display Without Link] --- */}
        <section className="space-y-8">
           <div className="px-2">
              <div className="space-y-1">
                 <h2 className="text-3xl font-black text-white tracking-tight flex items-center uppercase">
                    EVERYUNIV 추천 PICK
                 </h2>
                 <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">EveryUniv Curated + UnivWatch Price Engine</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dailyPicks.length > 0 ? dailyPicks.map((pick) => {
                const item = pick.product;
                const currentPrice = item.priceHistory[0]?.price || 0;
                const originalPrice = item.originalPrice || currentPrice;
                const discountRate = originalPrice > 0 && originalPrice > currentPrice
                  ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                  : 0;
                const historyData = item.priceHistory.map(h => h.price).reverse();
                
                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass p-6 rounded-[40px] flex flex-col space-y-5 group glass-hover border-white/[0.03]">
                    {/* 상단: 사진 (단독) */}
                    <div className="w-full aspect-square bg-zinc-950 rounded-3xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-800 font-black uppercase tracking-tighter px-1 text-center">NO IMAGE</div>
                      )}
                    </div>

                    {/* 중간: 이름 & 가격 */}
                    <div className="space-y-3 flex-1">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.brand || 'Brand'}</p>
                          <p className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors h-[2.5rem]">
                            {item.title}
                          </p>
                       </div>

                       <div className="flex flex-col">
                          {discountRate > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-red-500 text-xs font-black">{discountRate}%</span>
                              <span className="text-[10px] text-zinc-600 line-through font-bold">₩{originalPrice.toLocaleString()}</span>
                            </div>
                          )}
                          <p className="text-xl font-black text-white leading-tight">
                            ₩{currentPrice > 0 ? currentPrice.toLocaleString() : '---'}
                          </p>
                       </div>
                    </div>

                    {/* 하단: 트렌드 (유지) */}
                    <div className="pt-4 border-t border-white/5 space-y-4">
                       <div className="flex justify-between items-end">
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">7D Trend Feed</p>
                          {historyData.length > 1 && (
                            <div className="flex items-center space-x-1">
                               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[8px] font-black text-emerald-500 uppercase">Live</span>
                            </div>
                          )}
                       </div>
                       <div className="h-12 w-full">
                          {historyData.length > 1 ? (
                            <Sparkline data={historyData} color="#3b82f6" height={40} />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-xl">
                               <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Awaiting Data</p>
                            </div>
                          )}
                       </div>
                    </div>
                  </Link>
                );
              }) : (
                <div className="col-span-full py-10 text-center text-zinc-700 font-black uppercase text-xs tracking-widest italic">Syncing Recommendations...</div>
              )}
           </div>
        </section>

        {/* --- [Main Layout: Recent Updates + Brand Pulse] --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Recent Market Updates (8) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center">
                <Zap className="mr-2 text-yellow-400 fill-yellow-400" size={20} />
                Recent Market Updates
              </h2>
              <Link href="/products" className="text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-widest flex items-center transition-colors">
                Explore all items <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid gap-3">
              {featuredProducts.map((item) => {
                const currentPrice = item.priceHistory[0]?.price || 0;
                const oldPrice = item.originalPrice || currentPrice;
                const dropRate = oldPrice > 0 ? (((oldPrice - currentPrice) / oldPrice) * 100).toFixed(1) : "0";
                const historyData = item.priceHistory.map(h => h.price).reverse();

                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass glass-hover p-5 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between group cursor-pointer border-white/[0.05]">
                    <div className="flex items-center space-x-6">
                      <div className="relative w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-105 transition-transform">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <div className="text-[10px] text-zinc-700 uppercase font-black tracking-tighter px-1 text-center">NO IMAGE</div>}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.brand}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase">Active</span>
                        </div>
                        <p className="text-white font-black text-xl group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                        <div className="flex items-center space-x-1 text-xs text-emerald-400 font-bold">
                           <CreditCard size={12} />
                           <span>{item.bestBenefit || '기본 혜택 적용'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end space-x-8 mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-white/5">
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-right mb-2">Trend</p>
                        <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color={parseFloat(dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="flex items-baseline justify-end space-x-2">
                          <span className="text-xs text-zinc-500 line-through">₩{oldPrice.toLocaleString()}</span>
                          <span className="text-red-500 font-black text-lg">-{dropRate}%</span>
                        </div>
                        <p className="text-3xl font-black text-white leading-none">₩{currentPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sidebar Insights (4) */}
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
            
            {/* System Node: Storage Gauge */}
            <div className="glass p-8 rounded-[40px] space-y-6 border-blue-500/20 bg-blue-500/[0.02]">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="text-blue-500" size={28} />
                <h3 className="font-black text-white text-xl tracking-tight">System Node</h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                서버의 가용 자원을 실시간으로 모니터링하며 최적화된 수집 성능을 유지합니다.
              </p>
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                   <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      <span>Disk Storage ({storage.diskUsed})</span>
                      <span className="text-blue-400">{storage.diskPercent}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${storage.diskPercent}%` }} />
                   </div>
                </div>
                <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest pt-2">
                  <span>Database Size</span>
                  <span className="text-white">{(dbStats as any)[0]?.size}</span>
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
    <div className="glass p-8 rounded-[40px] flex items-start justify-between border-white/[0.03] group hover:border-white/10 transition-all">
      <div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">{title}</p>
        <p className="text-5xl font-black text-white tabular-nums tracking-tighter">{value}</p>
        <p className={cn("text-[10px] font-bold mt-4 uppercase tracking-widest opacity-80", accent)}>{sub}</p>
      </div>
      <div className={cn("p-4 bg-zinc-950/50 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform", accent)}>
        <Icon size={24} />
      </div>
    </div>
  );
}
