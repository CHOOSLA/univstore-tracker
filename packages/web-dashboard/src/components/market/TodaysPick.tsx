import React from 'react';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { DealItem } from './DealCard';

interface Props {
  item: DealItem | null;
}

/**
 * /market 상단의 Hero 카드.
 * 4가지 deal 카테고리 중 가장 임팩트 있는 1건을 큰 화면으로 보여준다.
 * 가격 변동 폭이 가장 크다는 가정으로 page에서 우선순위를 정해 넘긴다.
 */
export default function TodaysPick({ item }: Props) {
  if (!item) {
    return (
      <section className="rounded-3xl border border-white/5 bg-zinc-900/30 p-12 text-center text-zinc-500 text-sm">
        오늘의 추천 후보가 없습니다. 다음 cycle에서 다시 확인해주세요.
      </section>
    );
  }

  const { id, title, brand, imageUrl, currentPrice, avgPrice, dropPercent, gapPercent } = item;
  const headlinePercent = dropPercent ?? gapPercent ?? null;

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-950 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 lg:p-10">
        {/* 이미지 */}
        <div className="lg:col-span-2">
          <Link href={`/product/${id}`} className="block group">
            <div className="aspect-square rounded-2xl bg-zinc-950 overflow-hidden border border-white/5">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  no image
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* 본문 */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-orange-400">
              <Flame size={16} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Today&rsquo;s Pick</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-widest text-zinc-500">{brand}</div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                {title}
              </h2>
            </div>

            <div className="flex items-baseline gap-4 pt-2">
              <span className="text-4xl lg:text-5xl font-black text-amber-400 font-mono">
                ₩{currentPrice.toLocaleString()}
              </span>
              {headlinePercent != null && (
                <span className="text-2xl font-black text-red-400">
                  -{headlinePercent}%
                </span>
              )}
            </div>

            {avgPrice != null && avgPrice > currentPrice && (
              <p className="text-sm text-zinc-500">
                30일 중앙값 <span className="font-mono text-zinc-300">₩{avgPrice.toLocaleString()}</span> 대비 하락
              </p>
            )}
          </div>

          <Link
            href={`/product/${id}`}
            className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-xl bg-white text-black font-black text-sm uppercase tracking-wider hover:bg-amber-300 transition-colors"
          >
            상품 보러 가기
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
