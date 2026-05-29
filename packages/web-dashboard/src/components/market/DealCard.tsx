import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sparkline } from '../Sparkline';

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
  history?: number[];
}

interface DealCardProps {
  item: DealItem;
  variant: DealVariant;
}

export default function DealCard({ item, variant }: DealCardProps) {
  const { id, title, brand, imageUrl, currentPrice } = item;

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
          comparisonLabel: '30일 중앙 ₩',
          comparisonValue: item.avgPrice ?? null,
          accentColor: 'text-amber-400',
        };
      case 'golden':
        return {
          headlinePercent: null,
          comparisonLabel: '정가 ₩',
          comparisonValue: item.originalPrice ?? null,
          accentColor: 'text-emerald-400',
        };
      case 'target':
        return {
          headlinePercent: item.gapPercent ?? null,
          comparisonLabel: '저격 목표 ₩',
          comparisonValue: item.targetPrice ?? null, // mostHunted에서는 targetPrice에 alertsCount가 매핑되어 들어옴
          accentColor: 'text-blue-400',
        };
    }
  })();

  const renderVisuals = () => {
    switch (variant) {
      case 'flash': {
        const hasHistory = item.history && item.history.length > 0;
        const dropAmount = item.dropAmount ?? 0;
        if (dropAmount <= 0) return null;
        return (
          <div className="pt-2 border-t border-white/[0.03] space-y-1.5">
            <div className="text-[10px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
              최근 1~2일간 <span className="text-red-400 font-black">₩{dropAmount.toLocaleString()}원</span> 하락
            </div>
            <div className="h-8 w-full flex items-center justify-center bg-zinc-950/20 rounded-lg px-2 border border-white/[0.02]">
              {hasHistory ? (
                <Sparkline data={item.history!} color="#f87171" height={22} fullWidth />
              ) : (
                <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-wider">No Trend</span>
              )}
            </div>
          </div>
        );
      }
      case 'true': {
        const gapAmount = item.gapAmount ?? 0;
        if (gapAmount <= 0) return null;
        return (
          <div className="pt-2 border-t border-white/[0.03]">
            <div className="text-[10px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
              평소보다 <span className="text-amber-400 font-black">₩{gapAmount.toLocaleString()}원</span> 더 저렴
            </div>
          </div>
        );
      }
      case 'golden': {
        const originalPrice = item.originalPrice ?? 0;
        const savedAmount = originalPrice > currentPrice ? originalPrice - currentPrice : 0;
        if (savedAmount <= 0) return null;
        return (
          <div className="pt-2 border-t border-white/[0.03]">
            <div className="text-[10px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
              정가대비 <span className="text-emerald-400 font-black">₩{savedAmount.toLocaleString()}원</span> 할인
            </div>
          </div>
        );
      }
      case 'target': {
        const alertLimit = 30;
        const targetCount = item.targetPrice ?? 0;
        const ratio = Math.min(100, Math.round((targetCount / alertLimit) * 100));
        return (
          <div className="pt-2 border-t border-white/[0.03] space-y-1.5">
            <div className="flex justify-between text-[10px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
              <span>알림 대기</span>
              <span className="text-blue-400 font-black">{targetCount}명</span>
            </div>
            <div className="relative h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className="absolute h-full bg-blue-500/30" 
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const discountRate = (() => {
    switch (variant) {
      case 'golden':
        return item.originalPrice && item.originalPrice > currentPrice
          ? Math.round(((item.originalPrice - currentPrice) / item.originalPrice) * 100)
          : 0;
      case 'true':
        return item.gapPercent ?? 0;
      case 'flash':
        return item.dropPercent ?? 0;
      default:
        return 0;
    }
  })();

  const oldPrice = (() => {
    switch (variant) {
      case 'golden':
        return item.originalPrice;
      case 'true':
        return item.avgPrice;
      case 'flash':
        return item.prevPrice;
      default:
        return null;
    }
  })();

  return (
    <Link
      href={`/product/${id}`}
      className="glass glass-hover p-4 md:p-6 rounded-[32px] md:rounded-[40px] border-white/[0.03] flex flex-col space-y-4 md:space-y-5 group transition-all duration-300"
    >
      {/* 이미지 영역 */}
      <div className="w-full aspect-square bg-zinc-950 rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 relative">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] md:text-xs font-black uppercase tracking-tighter px-1 text-center">
            NO IMAGE
          </div>
        )}

        {/* 헤드라인 배지: dropPercent / gapPercent / 역대 최저 */}
        <div className="absolute top-3 left-3 z-20">
          {variant === 'golden' ? (
            <span className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider',
              'bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)] border border-emerald-400/20'
            )}>
              역대 최저
            </span>
          ) : headlinePercent != null ? (
            <span className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black border',
              variant === 'flash' ? 'bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] border-red-400/20' :
              variant === 'true' ? 'bg-amber-500 text-zinc-950 shadow-[0_2px_8px_rgba(245,158,11,0.4)] border-amber-400/20' :
              'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.4)] border-blue-400/20'
            )}>
              {variant === 'target' ? `+${headlinePercent}%` : `-${headlinePercent}%`}
            </span>
          ) : null}
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <p className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none">{brand}</p>
          <p className="text-xs md:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors h-[2.5rem] md:h-[2.5rem] overflow-hidden">
            {title}
          </p>
        </div>

        <div className="space-y-3">
          {/* 가격 영역: 메인 페이지와 100% 동일한 일관성 정돈 */}
          <div className="flex flex-col pt-3 border-t border-white/[0.04]">
            {/* 상단 할인율 & 이전 가격 노출 라인 */}
            {discountRate > 0 && oldPrice && oldPrice > currentPrice && (
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-red-500 text-[10px] md:text-sm font-black">{discountRate}%</span>
                <span className="text-[8px] md:text-xs text-zinc-600 line-through font-bold">₩{oldPrice.toLocaleString()}</span>
              </div>
            )}

            {variant === 'target' && comparisonValue != null && (
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-blue-400 text-[10px] md:text-xs font-bold">
                  알림 {comparisonValue}건
                </span>
              </div>
            )}

            {/* 하단 실거래 가격 */}
            <span className="text-sm md:text-xl font-black text-white leading-none">
              ₩{currentPrice.toLocaleString()}
            </span>
          </div>

          {renderVisuals()}
        </div>
      </div>
    </Link>
  );
}
