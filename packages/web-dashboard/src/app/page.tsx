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
  BarChart3,
  Trophy,
  Flame
} from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getStorageMetrics } from "./terminal/actions";
import HomeSearchBar from "@/components/HomeSearchBar";
import PriceScoreBadge from "@/components/common/PriceScoreBadge";
import ProductCard from "@/components/common/ProductCard";
import WatchlistButton from "@/components/product/WatchlistButton";
import { getMyWatchlistIds } from "@/app/watchlist/actions";

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
    trueDealsCountRow,
    crawlerStatus
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
      where: { imageUrl: { not: null }, stockStatus: { notIn: ['Discontinued', 'Out of Stock'] } },
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
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint FROM "Product" WHERE "currentPrice" <= "lowestPrice" AND "lowestPrice" < "highestPrice" AND "imageUrl" IS NOT NULL AND "stockStatus" NOT IN ('Discontinued', 'Out of Stock')`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint FROM "Product" WHERE "currentPrice" < "medianPrice30d" AND "currentPrice" >= 10000 AND "medianPrice30d" > 0 AND (("medianPrice30d" - "currentPrice")::numeric / "medianPrice30d"::numeric) < 0.6 AND "imageUrl" IS NOT NULL AND "stockStatus" NOT IN ('Discontinued', 'Out of Stock')`,
    prisma.crawlerStatus.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  ]);

  // 서버 상태: 크롤러는 12h cron 주기로 도는 배치라, cycle 사이 idle을 죽음으로 오판하지 않도록
  // 마지막 heartbeat가 13h(주기 + 여유) 이내면 파이프라인 정상으로 본다.
  const hbAge = crawlerStatus?.lastHeartbeat ? Date.now() - new Date(crawlerStatus.lastHeartbeat).getTime() : Infinity;
  const isCrawlerLive = hbAge < 13 * 60 * 60 * 1000;
  const serverStatus = isCrawlerLive ? 'ONLINE' : 'OFFLINE';

  const goldenCount = Number(goldenCountRow?.[0]?.count ?? 0);
  const trueDealsCount = Number(trueDealsCountRow?.[0]?.count ?? 0);

  // 로그인 사용자의 관심상품 (추천 PICK 카드 하트 초기상태)
  const watchedSet = new Set(await getMyWatchlistIds());

  const categoryStats = brandGroups.map(group => ({
    label: group.brand || 'Etc',
    count: group._count.id,
    icon: group.brand === 'Apple' ? Laptop : Smartphone,
    color: group.brand === 'Apple' ? "text-zinc-50" : "text-blue-400"
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  // 큰 수치는 한국어 컴팩트 표기로 (1,426,779 → "143만") — 카드 폭 초과/… 잘림 방지
  const fmtCompact = (n: number) => new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 0 }).format(n);

  // 상단 4구 매트릭
  const metrics = [
    { title: "전체 상품", value: totalProductsCount.toLocaleString(), sub: "Data Scale", icon: Package, accent: "text-blue-500" },
    { title: "누적 데이터", value: fmtCompact(totalHistoryCount), sub: "Price History", icon: Database, accent: "text-purple-500" },
    { title: "브랜드 수", value: brandGroups.length, sub: "Active Brands", icon: Zap, accent: "text-amber-500" },
    { title: "서버 상태", value: serverStatus, sub: isCrawlerLive ? "Sync Active" : "Sync Halted", icon: Clock, accent: serverStatus === 'OFFLINE' ? "text-red-500" : "text-emerald-500" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-12">
        
        {/* --- [Hero Section] --- */}
        <section className="space-y-4 text-center md:text-left pt-8 md:pt-12">
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white leading-[1.1] md:leading-[1.1]">
            학생가, <span className="text-blue-500 italic">가장 쌀 때</span> <br />
            딱 알려드려요.
          </h1>
          <p className="text-zinc-400 max-w-2xl text-base md:text-xl font-medium leading-relaxed">
            UnivStore 전 상품의 학생 할인가를 매일 추적합니다. 역대 최저가에 도달했거나
            평소보다 크게 떨어진 상품만 골라 보여드려요. 관심 상품은 찜해두면 가격이 내려갈 때 알림이 갑니다.
          </p>
        </section>

        {/* --- [명확한 3개 액션 카드] --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* 역대 최저 → 마켓 역대최저 섹션 */}
          <Link
            href="/market#golden"
            className="group relative overflow-hidden rounded-2xl md:rounded-3xl border border-amber-500/25 bg-amber-500/[0.07] hover:bg-amber-500/[0.14] hover:border-amber-400/60 p-5 md:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(245,158,11,0.35)] flex flex-col justify-between min-h-[150px] md:min-h-[170px]"
          >
            <Trophy className="w-6 h-6 md:w-7 md:h-7 text-amber-400" />
            <div>
              <p className="text-3xl md:text-4xl font-black text-amber-400 tabular-nums leading-none">{goldenCount.toLocaleString()}</p>
              <p className="text-sm md:text-base font-black text-white mt-1.5">역대 최저가</p>
              <p className="text-[11px] md:text-xs text-zinc-500 font-medium mt-0.5">지금이 가장 쌀 때인 상품</p>
            </div>
            <span className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 md:py-3 rounded-xl bg-amber-500/15 group-hover:bg-amber-500 text-amber-300 group-hover:text-zinc-950 text-sm md:text-base font-black uppercase tracking-wider transition-colors">
              보러가기 <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* 평균 대비 급락 → 마켓 True Deals 섹션 */}
          <Link
            href="/market#true"
            className="group relative overflow-hidden rounded-2xl md:rounded-3xl border border-red-500/25 bg-red-500/[0.07] hover:bg-red-500/[0.14] hover:border-red-400/60 p-5 md:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(239,68,68,0.35)] flex flex-col justify-between min-h-[150px] md:min-h-[170px]"
          >
            <Flame className="w-6 h-6 md:w-7 md:h-7 text-red-400" />
            <div>
              <p className="text-3xl md:text-4xl font-black text-red-400 tabular-nums leading-none">{trueDealsCount.toLocaleString()}</p>
              <p className="text-sm md:text-base font-black text-white mt-1.5">평소보다 급락</p>
              <p className="text-[11px] md:text-xs text-zinc-500 font-medium mt-0.5">한 달 평균가보다 크게 떨어짐</p>
            </div>
            <span className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 md:py-3 rounded-xl bg-red-500/15 group-hover:bg-red-500 text-red-300 group-hover:text-white text-sm md:text-base font-black uppercase tracking-wider transition-colors">
              보러가기 <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          {/* 마켓 전체 */}
          <Link
            href="/market"
            className="group relative overflow-hidden rounded-2xl md:rounded-3xl border border-blue-500/25 bg-blue-500/[0.07] hover:bg-blue-500/[0.14] hover:border-blue-400/60 p-5 md:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_30px_-8px_rgba(59,130,246,0.35)] flex flex-col justify-between min-h-[150px] md:min-h-[170px] col-span-2 md:col-span-1"
          >
            <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
            <div>
              <p className="text-xl md:text-2xl font-black text-white leading-tight">전체 마켓 보기</p>
              <p className="text-[11px] md:text-xs text-zinc-500 font-medium mt-1">오늘의 픽·핫딜을 한눈에</p>
            </div>
            <span className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 md:py-3 rounded-xl bg-blue-500/15 group-hover:bg-blue-500 text-blue-300 group-hover:text-white text-sm md:text-base font-black uppercase tracking-wider transition-colors">
              마켓 열기 <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        {/* --- [Top Tier Metrics] --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
           {metrics.map((m, i) => (
             <MetricCard key={i} title={m.title} value={String(m.value)} sub={m.sub} icon={m.icon} accent={m.accent} />
           ))}
        </div>

        {/* --- [Search Bar: 스크롤 시 떠있는 pill로 상단 고정] --- */}
        <section className="sticky top-[92px] z-40">
          <HomeSearchBar />
        </section>

        {/* --- [EVERYUNIV 추천 PICK] --- */}
        <section className="space-y-6 md:space-y-8">
           <div className="px-2">
              <div className="space-y-1">
                 <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center uppercase">
                    EVERYUNIV 추천 PICK
                 </h2>
                 <p className="text-[11px] md:text-xs text-zinc-600 font-bold uppercase tracking-widest">EveryUniv Curated + UnivWatch Price Engine</p>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {dailyPicks.length > 0 ? dailyPicks.map((pick) => {
                const item = pick.product;
                const currentPrice = item.priceHistory[0]?.price || 0;
                const historyData = item.priceHistory.map(h => h.price).reverse();
                return (
                  <ProductCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    brand={item.brand}
                    imageUrl={item.imageUrl}
                    currentPrice={currentPrice}
                    originalPrice={item.originalPrice}
                    priceScore={(item as any).priceScore}
                    history={historyData}
                    showScore
                    showSparkline
                    overlay={<WatchlistButton productId={item.id} initialWatched={watchedSet.has(item.id)} variant="icon" />}
                  />
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
              <Link href="/products" className="text-[11px] font-black text-zinc-600 hover:text-white uppercase tracking-widest flex items-center shrink-0 whitespace-nowrap transition-colors">
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
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <div className="text-[11px] text-zinc-700 uppercase font-black tracking-tighter px-1 text-center">NO IMAGE</div>}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] md:text-[11px] font-black text-zinc-500 uppercase tracking-widest truncate">{item.brand}</span>
                          <span className="shrink-0 text-[10px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase">Active</span>
                        </div>
                        <p className="text-white font-black text-base md:text-xl group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                        <div className="flex items-center space-x-1 text-[11px] md:text-xs text-emerald-400 font-bold truncate">
                           <CreditCard size={10} className="shrink-0" />
                           <span className="truncate">{item.bestBenefit || '기본 혜택 적용'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽 블록: 너비 고정으로 레이아웃 보호 */}
                    <div className="shrink-0 flex items-center justify-between sm:justify-end space-x-4 md:space-x-8 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="hidden md:block w-24 shrink-0">
                        <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest text-right mb-2">Trend</p>
                        <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color={parseFloat(dropRate) > 10 ? "#ef4444" : "#3b82f6"} />
                      </div>
                      <div className="text-right min-w-[100px] sm:min-w-[148px] shrink-0">
                        <div className="flex items-baseline justify-end space-x-2">
                          <span className="text-[11px] text-zinc-500 line-through">₩{oldPrice.toLocaleString()}</span>
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
                    <p className="text-zinc-500 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">{cat.label}</p>
                    <p className="text-2xl md:text-3xl font-black text-white">{cat.count}</p>
                    <p className="text-[10px] md:text-[11px] text-emerald-500 font-bold mt-1">Items Tracked</p>
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
              <p className="text-[11px] md:text-xs text-zinc-500 leading-relaxed font-medium">
                서버의 가용 자원을 실시간으로 모니터링하며 최적화된 수집 성능을 유지합니다.
              </p>
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="space-y-2">
                   <div className="flex justify-between text-[10px] md:text-[11px] font-black text-zinc-600 uppercase tracking-widest">
                      <span>Disk ({storage.diskUsed})</span>
                      <span className="text-blue-400">{storage.diskPercent}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${storage.diskPercent}%` }} />
                   </div>
                </div>
                <div className="flex justify-between text-[10px] md:text-[11px] font-black text-zinc-600 uppercase tracking-widest pt-2">
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
    <div className="glass p-5 md:p-8 rounded-[32px] md:rounded-[40px] flex flex-col md:flex-row items-start justify-between gap-3 md:gap-4 border-white/[0.03] group hover:border-white/10 transition-all">
      <div className="order-2 md:order-1 mt-4 md:mt-0 min-w-0 flex-1">
        <p className="text-[10px] md:text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 md:mb-4">{title}</p>
        <p className="text-2xl md:text-4xl xl:text-5xl font-black text-white tabular-nums tracking-tighter whitespace-nowrap">{value}</p>
        <p className={cn("text-[10px] md:text-[11px] font-bold mt-2 md:mt-4 uppercase tracking-widest opacity-80", accent)}>{sub}</p>
      </div>
      <div className={cn("order-1 md:order-2 shrink-0 p-3 md:p-4 bg-zinc-950/50 rounded-xl md:rounded-2xl border border-white/5 group-hover:scale-110 transition-transform", accent)}>
        <Icon size={18} />
      </div>
    </div>
  );
}
