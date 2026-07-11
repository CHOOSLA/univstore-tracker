import React from 'react';
import ProductCard, { BadgeTone } from '../common/ProductCard';
import WatchlistButton from '../product/WatchlistButton';

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
  priceScore?: number | null;
  soldOut?: boolean;
}

interface DealCardProps {
  item: DealItem;
  variant: DealVariant;
  initialWatched?: boolean;
}

/**
 * 마켓 딜 카드. 통합 ProductCard에 variant별 옵션(배지·footer·스파크라인)을 매핑.
 */
export default function DealCard({ item, variant, initialWatched = false }: DealCardProps) {
  const { currentPrice } = item;

  // variant별 헤드라인 배지 / 정가(할인선) / footer
  let headlineBadge: { text: string; tone: BadgeTone } | null = null;
  let originalPrice: number | null | undefined = null;
  let footer: React.ReactNode = null;
  let showSparkline = false;

  switch (variant) {
    case 'flash': {
      const pct = item.dropPercent ?? null;
      headlineBadge = pct != null ? { text: `-${pct}%`, tone: 'red' } : null;
      originalPrice = item.prevPrice;
      showSparkline = true;
      const drop = item.dropAmount ?? 0;
      if (drop > 0) footer = (
        <div className="text-[11px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
          최근 1~2일간 <span className="text-red-400 font-black">₩{drop.toLocaleString()}원</span> 하락
        </div>
      );
      break;
    }
    case 'true': {
      const pct = item.gapPercent ?? null;
      headlineBadge = pct != null ? { text: `-${pct}%`, tone: 'amber' } : null;
      originalPrice = item.avgPrice;
      const gap = item.gapAmount ?? 0;
      if (gap > 0) footer = (
        <div className="text-[11px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
          평소보다 <span className="text-amber-400 font-black">₩{gap.toLocaleString()}원</span> 더 저렴
        </div>
      );
      break;
    }
    case 'golden': {
      headlineBadge = { text: '역대 최저', tone: 'emerald' };
      originalPrice = item.originalPrice;
      const saved = (item.originalPrice ?? 0) > currentPrice ? (item.originalPrice ?? 0) - currentPrice : 0;
      if (saved > 0) footer = (
        <div className="text-[11px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
          정가대비 <span className="text-emerald-400 font-black">₩{saved.toLocaleString()}원</span> 할인
        </div>
      );
      break;
    }
    case 'target': {
      const pct = item.gapPercent ?? null;
      headlineBadge = pct != null ? { text: `+${pct}%`, tone: 'blue' } : null;
      const count = item.targetPrice ?? 0; // mostHunted는 targetPrice에 관심 등록 수가 들어옴
      const ratio = Math.min(100, Math.round((count / 30) * 100));
      footer = (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] md:text-xs text-zinc-400 font-semibold whitespace-nowrap">
            <span>관심 등록</span><span className="text-blue-400 font-black">{count}명</span>
          </div>
          <div className="relative h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div className="absolute h-full bg-blue-500/30" style={{ width: `${ratio}%` }} />
          </div>
        </div>
      );
      break;
    }
  }

  return (
    <ProductCard
      id={item.id}
      title={item.title}
      brand={item.brand}
      imageUrl={item.imageUrl}
      currentPrice={currentPrice}
      originalPrice={originalPrice}
      priceScore={item.priceScore}
      history={item.history}
      headlineBadge={headlineBadge}
      footer={footer}
      showScore
      showSparkline={showSparkline}
      soldOut={item.soldOut}
      overlay={<WatchlistButton productId={item.id} initialWatched={initialWatched} variant="icon" />}
    />
  );
}
