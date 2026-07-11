import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Heart, LogIn, TrendingDown, Target, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { getMyWatchlist } from "./actions";
import { getMyPriceAlerts } from "@/app/alerts/actions";
import PriceScoreBadge from "@/components/common/PriceScoreBadge";
import WatchlistButton from "@/components/product/WatchlistButton";
import WatchlistTargetControl from "@/components/product/WatchlistTargetControl";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;
  const [items, alerts] = loggedIn
    ? await Promise.all([getMyWatchlist(), getMyPriceAlerts()])
    : [[], []];

  // 목표가 맵 (productId → 최저 목표가 알림 {id, targetPrice})
  const alertMap = new Map<string, { id: number; targetPrice: number }>();
  for (const a of alerts) {
    const prev = alertMap.get(a.productId);
    if (!prev || a.targetPrice < prev.targetPrice) alertMap.set(a.productId, { id: a.id, targetPrice: a.targetPrice });
  }

  // 인사이트 분류
  const enriched = items.map((it) => {
    const current = Number(it.product.currentPrice ?? 0);
    const score = it.product.priceScore ?? null;
    const target = alertMap.get(it.productId)?.targetPrice;
    const targetReached = target !== undefined && current > 0 && current <= target;
    const atLow = score !== null && score >= 90;      // 역대최저 진입
    const nearLow = score !== null && score >= 70;     // 최저권
    return { ...it, current, score, target, targetReached, atLow, nearLow };
  });

  const atLowCount = enriched.filter((e) => e.atLow).length;
  const reachedCount = enriched.filter((e) => e.targetReached).length;
  // 주목 피드: 목표 도달 또는 최저권 이상, priceScore 높은 순
  const feed = enriched
    .filter((e) => e.targetReached || e.nearLow)
    .sort((a, b) => (b.targetReached ? 1 : 0) - (a.targetReached ? 1 : 0) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  return (
    <div className="pb-24 bg-zinc-950 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 space-y-10">
        <section className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-4">
            <Heart className="text-red-500" size={32} fill="currentColor" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">관심상품</h1>
          <p className="text-zinc-400 text-base md:text-lg">담아둔 상품의 현재가와 가격 등급을 한곳에서.</p>
        </section>

        {loggedIn && items.length > 0 && (
          <section className="space-y-6">
            {/* 요약 칩 */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="glass p-4 md:p-6 rounded-3xl border-white/[0.04] text-center">
                <p className="text-2xl md:text-4xl font-black text-white tabular-nums">{items.length}</p>
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 mt-1">담은 상품</p>
              </div>
              <div className="glass p-4 md:p-6 rounded-3xl border-amber-500/20 bg-amber-500/[0.03] text-center">
                <p className="text-2xl md:text-4xl font-black text-amber-400 tabular-nums">{atLowCount}</p>
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 mt-1">역대최저 진입</p>
              </div>
              <div className="glass p-4 md:p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/[0.03] text-center">
                <p className="text-2xl md:text-4xl font-black text-emerald-400 tabular-nums">{reachedCount}</p>
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 mt-1">목표가 도달</p>
              </div>
            </div>

            {/* 주목 피드 */}
            {feed.length > 0 && (
              <div className="glass p-5 md:p-8 rounded-[32px] border-blue-500/20 bg-blue-500/[0.02] space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Sparkles size={18} />
                  <h2 className="text-lg font-black text-white tracking-tight">주목할 상품</h2>
                </div>
                <div className="space-y-2">
                  {feed.map((e) => (
                    <Link
                      key={e.id}
                      href={`/product/${e.productId}`}
                      className="flex items-center gap-3 md:gap-4 p-3 rounded-2xl hover:bg-white/[0.03] transition-colors"
                    >
                      {e.product.imageUrl ? (
                        <img src={e.product.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-white shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">{e.product.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {e.targetReached ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              <Target size={10} /> 목표 도달
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              <TrendingDown size={10} /> {e.atLow ? "역대최저" : "최저권"}
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-400 tabular-nums">₩{e.current.toLocaleString()}</span>
                          {e.target !== undefined && (
                            <span className="text-[11px] text-zinc-600">목표 ₩{e.target.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <PriceScoreBadge score={e.score} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {!session?.user ? (
          <div className="glass p-12 rounded-[32px] border-white/[0.04] text-center space-y-4 max-w-lg mx-auto">
            <p className="text-zinc-400">로그인하면 관심상품을 저장하고 가격 등급을 모아볼 수 있습니다.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400"
            >
              <LogIn size={14} /> 상품에서 로그인 후 담기
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="glass p-12 rounded-[32px] border-white/[0.04] text-center space-y-4 max-w-lg mx-auto">
            <Heart className="mx-auto text-zinc-700" size={32} />
            <p className="text-zinc-500">담아둔 관심상품이 없습니다.</p>
            <Link href="/products" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400">
              상품 둘러보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {items.map((item) => {
              const current = Number(item.product.currentPrice ?? 0);
              const original = Number(item.product.originalPrice ?? 0);
              const discount = original > 0 && original > current ? Math.round(((original - current) / original) * 100) : 0;
              const soldOut = item.product.stockStatus === 'Out of Stock';
              return (
                <div key={item.id} className="glass p-4 md:p-6 rounded-[32px] md:rounded-[40px] flex flex-col space-y-4 group border-white/[0.03] relative">
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
                    <WatchlistButton productId={item.productId} initialWatched variant="icon" />
                  </div>
                  <Link href={`/product/${item.productId}`} className="flex flex-col space-y-4">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-white relative">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.title} className={cn("w-full h-full object-cover", soldOut && "grayscale opacity-50")} />
                      ) : (
                        <div className="w-full h-full bg-zinc-900" />
                      )}
                      {soldOut && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="px-3 py-1.5 rounded-lg bg-zinc-800/90 border border-white/15 text-zinc-200 text-xs md:text-sm font-black uppercase tracking-widest">품절</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{item.product.brand || "Brand"}</p>
                        <PriceScoreBadge score={item.product.priceScore} />
                      </div>
                      <p className="text-sm font-black text-white leading-tight line-clamp-2">{item.product.title}</p>
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-lg md:text-xl font-black text-white tabular-nums">
                          ₩{current > 0 ? current.toLocaleString() : "---"}
                        </span>
                        {discount > 0 && (
                          <span className="text-xs font-black text-red-400">-{discount}%</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <WatchlistTargetControl
                    productId={item.productId}
                    currentPrice={current}
                    alert={alertMap.get(item.productId) ?? null}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
