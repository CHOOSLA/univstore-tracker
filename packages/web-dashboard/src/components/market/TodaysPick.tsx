import React from 'react';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { DealItem } from './DealCard';

interface Props {
  item: DealItem | null;
}

export default function TodaysPick({ item }: Props) {
  if (!item) {
    return (
      <section className="glass rounded-[32px] p-12 text-center text-zinc-600 text-sm font-bold uppercase tracking-widest">
        No target opportunity identified for today
      </section>
    );
  }

  const { id, title, brand, imageUrl, currentPrice, avgPrice, dropPercent, gapPercent } = item;
  const headlinePercent = dropPercent ?? gapPercent ?? null;

  return (
    <section className="glass rounded-[32px] md:rounded-[40px] overflow-hidden border-white/[0.03] bg-gradient-to-br from-zinc-900/40 via-zinc-900/10 to-zinc-950 relative">
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 lg:p-10 relative z-10">
        {/* 이미지 */}
        <div className="lg:col-span-2">
          <Link href={`/product/${id}`} className="block group">
            <div className="w-full aspect-square bg-zinc-950 rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">
                  NO IMAGE
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* 본문 */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Flame size={16} className="animate-pulse" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Today&rsquo;s Super Deal</span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{brand}</div>
              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                {title}
              </h2>
            </div>

            <div className="flex items-baseline gap-4 pt-1">
              <span className="text-3xl lg:text-4xl font-black text-amber-400">
                ₩{currentPrice.toLocaleString()}
              </span>
              {headlinePercent != null && (
                <span className="text-2xl font-black text-red-500">
                  -{headlinePercent}%
                </span>
              )}
            </div>

            {avgPrice != null && avgPrice > currentPrice && (
              <p className="text-xs md:text-sm text-zinc-500 font-medium">
                30일 중앙값 <span className="font-bold text-zinc-400">₩{avgPrice.toLocaleString()}</span> 대비 이례적인 최저 수준 낙폭 도달
              </p>
            )}
          </div>

          <Link
            href={`/product/${id}`}
            className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-wider hover:bg-amber-300 transition-colors"
          >
            상품 보러 가기
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
