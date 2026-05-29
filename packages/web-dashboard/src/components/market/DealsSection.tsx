import React from 'react';
import Link from 'next/link';
import DealCard, { DealItem, DealVariant } from './DealCard';

interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: DealItem[];
  variant: DealVariant;
}

export default function DealsSection({ title, description, icon, items, variant }: Props) {
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3 md:gap-4 border-b border-white/5 pb-3 px-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="text-zinc-400 shrink-0">{icon}</div>
          <div className="min-w-0">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none uppercase truncate">{title}</h3>
            <p className="text-xs md:text-sm text-zinc-400 font-semibold tracking-wide mt-1.5 truncate">{description}</p>
          </div>
        </div>
        <Link
          href={`/products?filter=${variant}`}
          className="text-xs font-black text-zinc-500 hover:text-blue-400 transition-colors uppercase tracking-widest inline-flex items-center gap-1 shrink-0 whitespace-nowrap group/more"
        >
          <span>더 보기</span>
          <span className="group-hover/more:translate-x-0.5 transition-transform">➔</span>
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="glass rounded-2xl border-white/[0.03] p-10 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
          No matching products detected
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map(item => (
            <DealCard key={item.id} item={item} variant={variant} />
          ))}
        </div>
      )}
    </section>
  );
}
