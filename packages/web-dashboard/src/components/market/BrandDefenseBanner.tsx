import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import DealCard, { DealItem } from './DealCard';

interface Props {
  items: DealItem[];
}

// Flash Drops 등 다른 딜 섹션과 동일한 폭/레이아웃을 쓴다.
// 무거운 glass 카드 래퍼를 걷어내 카드 그리드가 풀폭으로 펼쳐지고,
// 브랜드(레드) 정체성은 헤더 아이콘·배지로만 남긴다.
export default function BrandDefenseBanner({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section id="defense" className="space-y-6 scroll-mt-24">
      <header className="flex items-center justify-between gap-3 md:gap-4 border-b border-red-500/15 pb-3 px-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 bg-red-500/10 border border-red-500/25 rounded-xl shrink-0 animate-pulse">
            <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none uppercase truncate">
              브랜드 가격 방어선 붕괴
            </h3>
            <p className="text-xs md:text-sm text-zinc-400 font-semibold tracking-wide mt-1.5 truncate">
              평소 할인이 거의 없는 프리미엄 브랜드(애플·삼성·LG·소니·델 등)의 이례적 실시간 하락 감지
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] md:text-xs text-red-400 font-black tracking-wider uppercase whitespace-nowrap animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            긴급 감지
          </span>
          <Link
            href="/products?filter=defense"
            className="text-xs font-black text-red-400/70 hover:text-red-400 transition-colors uppercase tracking-widest inline-flex items-center gap-1 whitespace-nowrap group/more"
          >
            <span>더 보기</span>
            <span className="group-hover/more:translate-x-0.5 transition-transform">➔</span>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {items.slice(0, 12).map((item) => (
          <DealCard key={item.id} item={item} variant="true" />
        ))}
      </div>
    </section>
  );
}
