import React from 'react';
import DealCard, { DealItem, DealVariant } from './DealCard';

interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: DealItem[];
  variant: DealVariant;
}

/**
 * 4개 섹션(flash/true/golden/target)이 공통으로 쓰는 컨테이너.
 * 상단에 아이콘·제목·설명을 두고 그 아래에 DealCard 6장을 그리드로 깐다.
 * 빈 결과일 때는 차분한 빈 상태 메시지로 대체.
 */
export default function DealsSection({ title, description, icon, items, variant }: Props) {
  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-zinc-400">{icon}</div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">
          {items.length}건
        </span>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900/20 p-8 text-center text-xs text-zinc-600">
          현재 조건에 맞는 상품이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {items.map(item => (
            <DealCard key={item.id} item={item} variant={variant} />
          ))}
        </div>
      )}
    </section>
  );
}
