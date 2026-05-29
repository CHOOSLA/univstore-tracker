import React from "react";
import Link from "next/link";
import PriceScoreBadge from "../common/PriceScoreBadge";

export interface SimilarItem {
  id: string;
  title: string;
  brand: string;
  imageUrl: string | null;
  currentPrice: number;
  priceScore?: number | null;
}

interface Props {
  items: SimilarItem[];
}

/**
 * 같은 카테고리 + 가격대(±30%)의 다른 상품. 가격 차이 작은 순.
 */
export default function SimilarProducts({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="px-2">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
            비슷한 가격대 상품
          </h2>
          <p className="text-[10px] md:text-xs text-zinc-600 font-bold uppercase tracking-widest">
            Same Category · ±30% Price · {items.length} items
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {items.map(item => (
          <Link
            key={item.id}
            href={`/product/${item.id}`}
            className="glass glass-hover p-3 md:p-4 rounded-2xl md:rounded-[24px] border-white/[0.03] flex flex-col space-y-3 group transition-all"
          >
            <div className="w-full aspect-square bg-zinc-950 rounded-xl md:rounded-2xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-800 font-black uppercase">No Image</div>
              )}
            </div>
            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{item.brand}</p>
                <PriceScoreBadge score={item.priceScore} />
              </div>
              <p className="text-[11px] md:text-xs font-bold text-white line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-blue-400 transition-colors break-keep">
                {item.title}
              </p>
              <p className="text-sm md:text-base font-black text-white tabular-nums pt-1">
                ₩{item.currentPrice.toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
