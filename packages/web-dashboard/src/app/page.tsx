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
  // 1. 데이터 병렬 쿼리
  const [totalProductsCount, brandGroups, dailyPicks, featuredProducts] = await Promise.all([
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
      take: 4 // 상단 메트릭 공간을 채우기 위해 4개만 우선 노출
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
    })
  ]);

  const categoryStats = brandGroups.map(group => ({
    label: group.brand || 'Etc',
    count: group._count.id,
    icon: group.brand === 'Apple' ? Laptop : Smartphone,
    color: group.brand === 'Apple' ? "text-zinc-50" : "text-blue-400"
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-6 space-y-12">
        {/* --- [Hero Section: Restored Original Text] --- */}
        <section className="space-y-4 text-center md:text-left pt-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white leading-[1] md:leading-[1.1]">
            Real-Time <span className="text-blue-500 italic">Insights</span> <br />
            From UnivStore.
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg md:text-xl font-medium">
            수집된 실제 데이터를 바탕으로 실시간 가격 변동을 분석합니다. <br className="hidden md:block" />
            이제 가짜가 아닌 진짜 학생 복지 혜택을 확인하세요.
          </p>
        </section>

        {/* --- [UnivWatch PICK: Replacing old Metric Cards] --- */}
        <section className="space-y-6">
           <div className="flex items-center space-x-2 text-blue-500 px-2">
              <Sparkles size={18} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">EveryUniv 추천 PICK</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dailyPicks.length > 0 ? dailyPicks.map((pick) => {
                const item = pick.product;
                const currentPrice = item.priceHistory[0]?.price || 0;
                const historyData = item.priceHistory.map(h => h.price).reverse();
                
                return (
                  <Link key={item.id} href={`/product/${item.id}`} className="glass p-6 rounded-[32px] flex flex-col justify-between space-y-4 group glass-hover border-white/[0.03]">
                    <div className="flex justify-between items-start">
                       <div className="w-14 h-14 bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden group-hover:scale-105 transition-transform duration-500 shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-800 font-black">NO IMG</div>
                          )}
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{item.brand || 'Brand'}</p>
                          <p className="text-sm font-black text-white mt-1">₩{currentPrice.toLocaleString()}</p>
                       </div>
                    </div>
                    <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{item.title}</p>
                    <div className="h-8 w-full opacity-60">
                       <Sparkline data={historyData.length > 1 ? historyData : [currentPrice, currentPrice]} color="#3b82f6" height={30} />
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
          {/* Main Content (Restored Recent Updates) */}
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
                            {item.stockStatus || 'Active'}
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
                <div className="glass p-20 rounded-[40px] flex flex-col items-center justify-center space-y-4 border-dashed border-zinc-800 italic text-zinc-700 uppercase text-xs font-black">
                  Awaiting Telemetry...
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Insights (Brand Pulse) */}
          <div className="lg:col-span-4 space-y-6 h-full">
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
            
            <div className="glass p-8 rounded-[40px] space-y-6 border-blue-500/20 bg-blue-500/[0.02]">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="text-blue-500" size={28} />
                <h3 className="font-black text-white text-xl tracking-tight">System Node</h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                우분투 서버에서 24시간 작동하는 크롤러가 실시간으로 데이터를 검증하고 Redis 큐를 통해 무결성을 확보합니다.
              </p>
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <span>Total Monitored</span>
                  <span className="text-white">{totalProductsCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  <span>Storage</span>
                  <span className="text-blue-400">PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
