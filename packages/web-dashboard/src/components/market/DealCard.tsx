import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type DealVariant = 'flash' | 'true' | 'golden' | 'target';

export interface DealItem {
  id: string;
  title: string;
  brand: string;
  imageUrl: string | null;
  currentPrice: number;
  originalPrice?: number | null;
  avgPrice?: number | null;
  gapAmount?: number | null;
  gapPercent?: number | null;
  prevPrice?: number | null;
  dropAmount?: number | null;
  dropPercent?: number | null;
  targetPrice?: number | null;
}

interface DealCardProps {
  item: DealItem;
  variant: DealVariant;
}

/**
 * /market의 4가지 deal 섹션에서 공통으로 쓰는 상품 카드.
 * variant에 따라 보조 라인(평균가/직전가/목표가)과 강조 색이 달라진다.
 */
export default function DealCard({ item, variant }: DealCardProps) {
  const { id, title, brand, imageUrl, currentPrice } = item;

  // variant별로 어떤 비교 수치를 보여줄지 결정
  const { headlinePercent, comparisonLabel, comparisonValue, accentColor } = (() => {
    switch (variant) {
      case 'flash':
        return {
          headlinePercent: item.dropPercent ?? null,
          comparisonLabel: '직전 ₩',
          comparisonValue: item.prevPrice ?? null,
          accentColor: 'text-red-400',
        };
      case 'true':
        return {
          headlinePercent: item.gapPercent ?? null,
          comparisonLabel: '30일 중앙값 ₩',
          comparisonValue: item.avgPrice ?? null,
          accentColor: 'text-amber-400',
        };
      case 'golden':
        return {
          headlinePercent: null, // golden은 % 대신 '역대 최저' 라벨
          comparisonLabel: '정가 ₩',
          comparisonValue: item.originalPrice ?? null,
          accentColor: 'text-emerald-400',
        };
      case 'target':
        return {
          headlinePercent: item.gapPercent ?? null,
          comparisonLabel: '목표 ₩',
          comparisonValue: item.targetPrice ?? null,
          accentColor: 'text-blue-400',
        };
    }
  })();

  return (
    <Link
      href={`/product/${id}`}
      className="group block rounded-2xl border border-white/5 bg-zinc-900/30 hover:border-white/15 hover:bg-zinc-900/60 transition-all overflow-hidden"
    >
      {/* 이미지 영역 */}
      <div className="aspect-square bg-zinc-950 overflow-hidden relative">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-mono">
            no image
          </div>
        )}

        {/* 헤드라인 배지: dropPercent / gapPercent / 역대 최저 */}
        <div className="absolute top-3 left-3">
          {variant === 'golden' ? (
            <span className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider',
              'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            )}>
              역대 최저
            </span>
          ) : headlinePercent != null ? (
            <span className={cn(
              'px-2.5 py-1 rounded-md text-xs font-black',
              variant === 'flash' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
              variant === 'true' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
              'bg-blue-500/15 text-blue-300 border border-blue-500/30'
            )}>
              {variant === 'target' ? `+${headlinePercent}%` : `-${headlinePercent}%`}
            </span>
          ) : null}
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="p-4 space-y-2">
        <div className="flex items-baseline gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <span className="truncate">{brand}</span>
        </div>
        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug min-h-[2.5em]">
          {title}
        </p>
        <div className="pt-1 flex items-baseline justify-between">
          <span className={cn('font-black text-lg', accentColor)}>
            ₩{currentPrice.toLocaleString()}
          </span>
          {comparisonValue != null && (
            <span className="text-[11px] text-zinc-500 font-mono">
              {comparisonLabel}{comparisonValue.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
