import React from 'react';
import { Zap } from 'lucide-react';

export interface CategoryYield {
  category: string;
  dealCount: number;
  avgDiscount: number;
  score: number;
}

interface Props {
  categories: CategoryYield[];
}

export default function CategoryEfficiency({ categories }: Props) {
  if (!categories || categories.length === 0) return null;

  const sorted = [...categories].sort((a, b) => b.score - a.score).slice(0, 4);

  return (
    <section className="glass rounded-[32px] p-6 border-white/[0.03] bg-zinc-900/30">
      <div className="flex items-center gap-2.5 mb-5 border-b border-white/5 pb-3">
        <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
        <div>
          <h3 className="text-lg font-black text-white tracking-tight leading-none uppercase">
            CATEGORY SMARTNESS YIELD
          </h3>
          <p className="text-[11px] text-zinc-500 tracking-tight mt-1 uppercase font-bold">
            실시간 카테고리별 핫딜 밀도 및 가성비 효율 분석
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((ctg, index) => {
          const barColor = ctg.score >= 70 ? 'bg-emerald-500' : ctg.score >= 40 ? 'bg-amber-500' : 'bg-orange-500';
          const textColor = ctg.score >= 70 ? 'text-emerald-400' : ctg.score >= 40 ? 'text-amber-400' : 'text-orange-400';

          return (
            <div key={ctg.category} className="space-y-2">
              <div className="flex justify-between items-baseline text-sm">
                <span className="font-bold text-zinc-200">
                  {index + 1}. {ctg.category}
                </span>
                <span className={`font-black ${textColor}`}>
                  YIELD: {ctg.score.toFixed(0)}%
                </span>
              </div>

              {/* 게이지 바 높이 약간 상향 */}
              <div className="h-2.5 w-full bg-zinc-950 border border-white/5 rounded-full overflow-hidden flex">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${ctg.score}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-zinc-400 font-extrabold uppercase tracking-wide">
                <span>{ctg.dealCount} active deals</span>
                <span>avg drop: -{ctg.avgDiscount.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
