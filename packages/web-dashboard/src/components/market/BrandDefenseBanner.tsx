import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import DealCard, { DealItem } from './DealCard';

interface Props {
  items: DealItem[];
}

export default function BrandDefenseBanner({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="glass rounded-[32px] md:rounded-[40px] p-5 md:p-8 lg:p-12 relative overflow-hidden border border-red-500/10 bg-gradient-to-br from-red-950/15 via-zinc-900/30 to-zinc-950/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(239,68,68,0.06)] hover:border-red-500/25 transition-all duration-500 group/banner">
      {/* 백그라운드 네온 앰비언트 라이트 효과 */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none group-hover/banner:bg-red-500/8 transition-colors duration-500" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 헤더 및 상태 패널 */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5 md:pb-6 mb-5 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="p-2.5 md:p-3 bg-red-500/10 border border-red-500/25 rounded-2xl animate-pulse shrink-0">
            <ShieldAlert className="w-6 h-6 md:w-9 md:h-9 text-red-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-3xl font-black text-white tracking-tight leading-tight md:leading-none uppercase">
              Brand Price Defense: Breached
            </h2>
            <p className="text-xs md:text-base text-zinc-300 mt-2 md:mt-2.5 font-medium leading-relaxed">
              평소 공식 할인율이 매우 낮은 글로벌 프리미엄 브랜드(Apple, 삼성, LG, Sony, Dell 등)의 이례적인 실시간 하락 상품 감지
            </p>
          </div>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 self-stretch md:self-auto shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] md:text-sm text-red-400 font-black tracking-wider uppercase shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-pulse whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>CRITICAL STATUS</span>
          </div>
          <Link
            href="/products?filter=defense"
            className="text-xs font-black text-red-400/70 hover:text-red-400 transition-colors uppercase tracking-widest inline-flex items-center gap-1 shrink-0 whitespace-nowrap group/more"
          >
            <span>더 보기</span>
            <span className="group-hover/more:translate-x-0.5 transition-transform">➔</span>
          </Link>
        </div>
      </div>

      {/* 대형 카드 레이아웃 그리드 (반응형 다단 레이아웃 설계) */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {items.slice(0, 12).map((item) => (
          <DealCard key={item.id} item={item} variant="true" />
        ))}
      </div>
    </section>
  );
}

