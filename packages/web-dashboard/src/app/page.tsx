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
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // 실시간 데이터 반영을 위해 다이내믹 렌더링 강제

export default async function HomePage() {
  // 1. 기초 지표 쿼리 (실제 데이터)
  const totalProductsCount = await prisma.product.count();
  
  // 2. 오늘의 가격 하락 상품 (최근 24시간 내 기록 비교)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 최근 업데이트된 상품 5개 가져오기 (가장 최근 이력 포함)
  const featuredProducts = await prisma.product.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 7
      }
    }
  });

  // 3. 브랜드별 통계 계산
  const brandGroups = await prisma.product.groupBy({
    by: ['brand'],
    _count: { id: true },
  });

  const categoryStats = brandGroups.map(group => ({
    label: group.brand || 'Etc',
    count: group._count.id,
    avgDrop: " 분석 중",
    icon: group.brand === 'Apple' ? Laptop : Smartphone,
    color: group.brand === 'Apple' ? "text-zinc-50" : "text-blue-400"
  })).slice(0, 4);

  // 상단 매트릭 카드 데이터 매핑
  const metrics = [
    { title: "추적 상품", value: totalProductsCount.toLocaleString(), sub: "Total Items", icon: Package, accent: "text-blue-500" },
    { title: "오늘의 수집", value: featuredProducts.length, sub: "Recently Updated", icon: TrendingDown, accent: "text-red-500" },
    { title: "브랜드 수", value: brandGroups.length, sub: "Active Brands", icon: Zap, accent: "text-amber-500" },
    { title: "서버 상태", value: "ONLINE", sub: "Sync Active", icon: Clock, accent: "text-emerald-500" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 text-center md:text-left pt-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1] md:leading-[1.1]">
            Real-Time <span className="text-blue-500 italic">Insights</span> <br />
            From UnivStore.
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg md:text-xl">
            수집된 실제 데이터를 바탕으로 실시간 가격 변동을 분석합니다. <br className="hidden md:block" />
            이제 가짜가 아닌 진짜 학생 복지 혜택을 확인하세요.
          </p>
        </section>

        {/* Top Tier Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} title={m.title} value={String(m.value)} sub={m.sub} icon={m.icon} accent={m.accent} />
          ))}
        </div>

        {/* Bento Grid: Real Data Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Main List Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Zap className="mr-2 text-yellow-400 fill-yellow-400" size={20} />
                Recent Market Updates
              </h2>
              <Link href="/products" className="text-sm font-medium text-zinc-500 hover:text-white flex items-center transition-colors">
                Explore all items <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid gap-3">
              {featuredProducts.length > 0 ? featuredProducts.map((item) => {
                const currentPrice = item.priceHistory[0]?.price || 0;
                const oldPrice = item.originalPrice || currentPrice;
                const dropRate = oldPrice > 0 ? (((oldPrice - currentPrice) / oldPrice) * 100).toFixed(1) : "0";
                const historyData = item.priceHistory.map(h => h.price).reverse();

                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass glass-hover p-5 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between group cursor-pointer border-white/[0.05]">
                    <div className="flex items-center space-x-6">
                      <div className="relative w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-105 transition-transform">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[10px] text-zinc-700 uppercase font-black tracking-tighter text-center px-1">NO IMAGE</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.brand || 'Brand'}</span>
                          <span className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase",
                            item.stockStatus === "Low Stock" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          )}>
                            {item.stockStatus || 'Checking'}
                          </span>
                        </div>
                        <p className="text-white font-black text-xl group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</p>
                        <div className="flex items-center space-x-3 text-xs">
                          <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                            <CreditCard size={12} />
                            <span>{item.bestBenefit || '기본 혜택 적용'}</span>
                          </div>
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
              }) : (
                <div className="glass p-20 rounded-[40px] flex flex-col items-center justify-center space-y-4 border-dashed border-zinc-800">
                  <Package size={48} className="text-zinc-800" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest">수집된 데이터가 아직 없습니다. 크롤러를 실행해 주세요.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Insights (Real Stats) */}
          <div className="lg:col-span-4 space-y-6 h-full">
            <h2 className="text-2xl font-bold text-white px-2">Brand Pulse</h2>
            <div className="grid grid-cols-2 gap-4">
              {categoryStats.length > 0 ? categoryStats.map((cat, i) => (
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
              )) : (
                <div className="col-span-2 glass aspect-video flex items-center justify-center text-zinc-700 font-black uppercase text-xs tracking-widest border-dashed border-zinc-800">
                  Waiting for Data...
                </div>
              )}
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
                    <span>Active Storage</span>
                    <span className="text-blue-400">PostgreSQL</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full w-[100%] bg-blue-500 rounded-full" />
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
