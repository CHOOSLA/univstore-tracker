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
  const [
    totalProductsCount, 
    totalHistoryCount, 
    brandGroups, 
    dailyPicks, 
    featuredProducts, 
    storage, 
    dbStats,
    goldenCountRow,
    trueDealsCountRow
  ] = await Promise.all([
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
      where: { imageUrl: { not: null }, stockStatus: { not: 'Discontinued' } },
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
    prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size('univstore')) as size`.catch(() => [{ size: '0 MB' }]),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint FROM "Product" WHERE "currentPrice" <= "lowestPrice" AND "lowestPrice" < "highestPrice" AND "imageUrl" IS NOT NULL AND "stockStatus" != 'Discontinued'`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint FROM "Product" WHERE "currentPrice" < "medianPrice30d" AND "currentPrice" >= 10000 AND "medianPrice30d" > 0 AND (("medianPrice30d" - "currentPrice")::numeric / "medianPrice30d"::numeric) < 0.6 AND "imageUrl" IS NOT NULL AND "stockStatus" != 'Discontinued'`
  ]);

  const goldenCount = Number(goldenCountRow?.[0]?.count ?? 0);
  const trueDealsCount = Number(trueDealsCountRow?.[0]?.count ?? 0);

  const categoryStats = brandGroups.map(group => ({
    label: group.brand || 'Etc',
    count: group._count.id,
    icon: group.brand === 'Apple' ? Laptop : Smartphone,
    color: group.brand === 'Apple' ? "text-zinc-50" : "text-blue-400"
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  // 상단 4구 매트릭
  const metrics = [
    { title: "전체 상품", value: totalProductsCount.toLocaleString(), sub: "Data Scale", icon: Package, accent: "text-blue-500" },
    { title: "누적 데이터", value: totalHistoryCount.toLocaleString(), sub: "Price History", icon: Database, accent: "text-purple-500" },
    { title: "브랜드 수", value: brandGroups.length, sub: "Active Brands", icon: Zap, accent: "text-amber-500" },
    { title: "서버 상태", value: "ONLINE", sub: "Sync Active", icon: Clock, accent: "text-emerald-500" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-12">
        
        {/* --- [Hero Section: Responsive Typography] --- */}
        <section className="space-y-4 text-center md:text-left pt-8 md:pt-12">
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white leading-[1.1] md:leading-[1.1]">
            Real-Time <span className="text-blue-500 italic">Insights</span> <br />
            From UnivStore.
          </h1>
          <p className="text-zinc-400 max-w-3xl text-base md:text-xl font-medium leading-relaxed">
            33,000+ 데이터 포인트가 증명하는 시장의 무결성. <br className="hidden md:block" />
            UnivWatch는 자체 분산 수집 파이프라인을 통해 가공되지 않은 실시간 가격 변동을 정밀 분석합니다.
          </p>
        </section>

        {/* --- [Live Deals Ticker Banner] --- */}
        <Link href="/market" className="relative group block overflow-hidden rounded-[24px] border border-blue-500/20 bg-gradient-to-r from-blue-950/20 via-zinc-900/30 to-zinc-950/90 p-4 md:px-6 md:py-4 transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.1)]">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-700 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-3 text-center md:text-left">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0">Live Alert</span>
              <p className="text-zinc-300 text-xs md:text-sm font-medium">
                현재 마켓에서 <span className="text-amber-400 font-black">역대 최저가 {goldenCount}개</span> 및 <span className="text-red-400 font-black">평균대비 급락 {trueDealsCount}개</span> 상품 실시간 감지됨.
              </p>
            </div>
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center shrink-0 bg-blue-500/5 px-3.5 py-2 rounded-xl border border-blue-500/10 group-hover:bg-blue-500/10 transition-colors">
              Deals Console 입장 <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* --- [Top Tier Metrics] --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
           {metrics.map((m, i) => (
             <MetricCard key={i} title={m.title} value={String(m.value)} sub={m.sub} icon={m.icon} accent={m.accent} />
           ))}
        </div>

        {/* --- [Search Bar] --- */}
        <section>
          <HomeSearchBar />
        </section>

        {/* --- [EVERYUNIV 추천 PICK] --- */}
        <section className="space-y-6 md:space-y-8">
           <div className="px-2">
              <div className="space-y-1">
                 <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center uppercase">
                    EVERYUNIV 추천 PICK
                 </h2>
                 <p className="text-[10px] md:text-xs text-zinc-600 font-bold uppercase tracking-widest">EveryUniv Curated + UnivWatch Price Engine</p>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {dailyPicks.length > 0 ? dailyPicks.map((pick) => {
                const item = pick.product;
                const currentPrice = item.priceHistory[0]?.price || 0;
                const originalPrice = item.originalPrice || currentPrice;
                const discountRate = originalPrice > 0 && originalPrice > currentPrice
                  ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                  : 0;
                const historyData = item.priceHistory.map(h => h.price).reverse();
                
                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass p-4 md:p-6 rounded-[32px] md:rounded-[40px] flex flex-col space-y-4 md:space-y-5 group glass-hover border-white/[0.03]">
                    {/* 상단: 사진 */}
                    <div className="w-full aspect-square bg-zinc-950 rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-800 font-black uppercase tracking-tighter px-1 text-center">NO IMAGE</div>
                      )}
                    </div>

                    {/* 중간: 이름 & 가격 */}
                    <div className="space-y-2 md:space-y-3 flex-1">
                       <div className="space-y-1">
                          <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.brand || 'Brand'}</p>
                          <p className="text-xs md:text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors h-[2.5rem] md:h-[3rem]">
                            {item.title}
                          </p>
                       </div>

                       <div className="flex flex-col">
                          {discountRate > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-red-500 text-[10px] md:text-sm font-black">{discountRate}%</span>
                              <span className="text-[8px] md:text-xs text-zinc-600 line-through font-bold">₩{originalPrice.toLocaleString()}</span>
                            </div>
                          )}
                          <p className="text-base md:text-2xl font-black text-white leading-tight">
                            ₩{currentPrice > 0 ? currentPrice.toLocaleString() : '---'}
                          </p>
                       </div>
                    </div>

                    {/* 하단: 트렌드 (Full Width 복구) */}
                    <div className="pt-3 md:pt-4 border-t border-white/5 space-y-3 md:space-y-4">
                       <div className="flex justify-between items-end">
                          <p className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">7D Trend Feed</p>
                          {historyData.length > 1 && (
                            <div className="flex items-center space-x-1">
                               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[7px] md:text-[8px] font-black text-emerald-500 uppercase">Live</span>
                            </div>
                          )}
                       </div>
                       <div className="h-10 md:h-12 w-full">
                          {historyData.length > 1 ? (
                            <Sparkline data={historyData} color="#3b82f6" height={48} fullWidth />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
                               <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Awaiting Data</p>
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
          
          {/* Recent Market Updates (레이아웃 보호 로직 복구) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center">
                <Zap className="mr-2 text-yellow-400 fill-yellow-400" size={20} />
                Recent Market Updates
              </h2>
              <Link href="/products" className="text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-widest flex items-center transition-colors">
                Explore all <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid gap-3">
              {featuredProducts.map((item) => {
                const currentPrice = item.priceHistory[0]?.price || 0;
                const oldPrice = item.originalPrice || currentPrice;
                const dropRate = oldPrice > 0 ? (((oldPrice - currentPrice) / oldPrice) * 100).toFixed(1) : "0";
                const historyData = item.priceHistory.map(h => h.price).reverse();

                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass glass-hover p-4 md:p-5 rounded-[24px] md:rounded-[32px] flex flex-col sm:flex-row sm:items-center justify-between group cursor-pointer border-white/[0.05]">
                    {/* 왼쪽 블록: 고정 크기 이미지 및 텍스트 보호 */}
                    <div className="flex items-center space-x-4 md:space-x-6 flex-1 min-w-0">
                      <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-105 transition-transform">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <div className="text-[10px] text-zinc-700 uppercase font-black tracking-tighter px-1 text-center">NO IMAGE</div>}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{item.brand}</span>
                          <span className="shrink-0 text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase">Active</span>
                        </div>
                        <p className="text-white font-black text-base md:text-xl group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                        <div className="flex items-center space-x-1 text-[10px] md:text-xs text-emerald-400 font-bold truncate">
                           <CreditCard size={10} className="shrink-0" />
                           <span className="truncate">{item.bestBenefit || '기본 혜택 적용'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽 블록: 너비 고정으로 레이아웃 보호 */}
                    <div className="shrink-0 flex items-center justify-between sm:justify-end space-x-4 md:space-x-8 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="hidden md:block w-24 shrink-0">
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-right mb-2">Trend</p>
                        <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color={parseFloat(dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                      </div>
                      <div className="text-right min-w-[100px] sm:min-w-[148px] shrink-0">
                        <div className="flex items-baseline justify-end space-x-2">
                          <span className="text-[10px] text-zinc-500 line-through">₩{oldPrice.toLocaleString()}</span>
                          <span className="text-red-500 font-black text-base md:text-lg">-{dropRate}%</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black text-white leading-none">₩{currentPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-white px-2 tracking-tight">Brand Pulse</h2>
            <div className="grid grid-cols-2 gap-4">
              {categoryStats.map((cat, i) => (
                <Link key={i} href={`/products?brand=${cat.label}`} className="glass glass-hover p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex flex-col justify-between aspect-square group border-white/[0.05]">
                  <div className={cn("p-3 md:p-4 w-fit rounded-xl md:rounded-2xl bg-zinc-950/50 border border-white/5 group-hover:scale-110 transition-transform", cat.color)}>
                    <cat.icon size={20} />
                  </div>
                  <div className="mt-2 md:mt-4">
                    <p className="text-zinc-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">{cat.label}</p>
                    <p className="text-2xl md:text-3xl font-black text-white">{cat.count}</p>
                    <p className="text-[8px] md:text-[10px] text-emerald-500 font-bold mt-1">Items Tracked</p>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* System Node: Storage Gauge */}
            <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-4 md:space-y-6 border-blue-500/20 bg-blue-500/[0.02]">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="text-blue-500" size={24} />
                <h3 className="font-black text-white text-lg md:text-xl tracking-tight">System Node</h3>
              </div>
              <p className="text-[10px] md:text-xs text-zinc-500 leading-relaxed font-medium">
                서버의 가용 자원을 실시간으로 모니터링하며 최적화된 수집 성능을 유지합니다.
              </p>
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                   <div className="flex justify-between text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      <span>Disk ({storage.diskUsed})</span>
                      <span className="text-blue-400">{storage.diskPercent}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${storage.diskPercent}%` }} />
                   </div>
                </div>
                <div className="flex justify-between text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest pt-2">
                  <span>DB Size</span>
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
    <div className="glass p-5 md:p-8 rounded-[32px] md:rounded-[40px] flex flex-col md:flex-row items-start justify-between border-white/[0.03] group hover:border-white/10 transition-all">
      <div className="order-2 md:order-1 mt-4 md:mt-0">
        <p className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 md:mb-4">{title}</p>
        <p className="text-2xl md:text-5xl font-black text-white tabular-nums tracking-tighter">{value}</p>
        <p className={cn("text-[8px] md:text-[10px] font-bold mt-2 md:mt-4 uppercase tracking-widest opacity-80", accent)}>{sub}</p>
      </div>
      <div className={cn("order-1 md:order-2 p-3 md:p-4 bg-zinc-950/50 rounded-xl md:rounded-2xl border border-white/5 group-hover:scale-110 transition-transform", accent)}>
        <Icon size={18} />
      </div>
    </div>
  );
}
