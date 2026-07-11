import React from "react";
import { ExternalLink, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceComparison as PC } from "@/lib/naverPrice";

interface Props {
  data: PC;
  univPrice: number; // univstore 학생가(현재가)
}

/**
 * 네이버 쇼핑 가격비교 스타일: 여러 몰의 가격을 저렴한순으로 나열.
 * univstore 학생가를 함께 넣어 실제로 어디가 최저인지 보여준다.
 * matched=false(신뢰 낮음)면 렌더하지 않음(오답 방지).
 */
export default function PriceComparison({ data, univPrice }: Props) {
  if (!data.matched || data.items.length === 0) return null;

  // univstore + 외부몰을 한 리스트로 합쳐 정렬
  const rows = [
    { mall: "유니브스토어 (학생가)", price: univPrice, link: null as string | null, isUniv: true },
    ...data.items.map((m) => ({ mall: m.mall, price: m.price, link: m.link, isUniv: false })),
  ].sort((a, b) => a.price - b.price);

  const lowest = rows[0].price;
  const univIsLowest = rows[0].isUniv;

  return (
    <div className="glass p-5 md:p-7 rounded-[28px] md:rounded-[36px] border-white/[0.03] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wide">다른 곳 최저가 비교</h3>
        </div>
        <span className="text-[10px] md:text-[11px] font-bold text-zinc-600 uppercase tracking-widest">네이버 쇼핑 기준</span>
      </div>

      {/* 요약 배너 */}
      <div className={cn(
        "rounded-2xl p-4 border",
        univIsLowest ? "bg-emerald-500/10 border-emerald-500/25" : "bg-amber-500/10 border-amber-500/25"
      )}>
        {univIsLowest ? (
          <p className="text-sm md:text-base font-black text-emerald-400 flex items-center gap-2">
            <Trophy size={16} /> 유니브스토어 학생가가 최저가예요
          </p>
        ) : (
          <p className="text-sm md:text-base font-black text-amber-400">
            더 싼 곳이 있어요 — {rows[0].mall} ₩{lowest.toLocaleString()}
            <span className="text-amber-300/80 font-bold text-xs md:text-sm ml-1">
              (학생가보다 ₩{(univPrice - lowest).toLocaleString()} 저렴)
            </span>
          </p>
        )}
      </div>

      {/* 몰별 가격 리스트 */}
      <ul className="space-y-1.5">
        {rows.map((r, i) => {
          const content = (
            <div className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors",
              r.isUniv
                ? "bg-blue-500/10 border-blue-500/25"
                : "bg-zinc-900/40 border-white/5 hover:border-white/15"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn(
                  "text-[11px] font-black w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                  i === 0 ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                )}>{i + 1}</span>
                <span className={cn("font-bold truncate text-sm", r.isUniv ? "text-blue-300" : "text-zinc-200")}>
                  {r.mall}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("font-black tabular-nums text-sm md:text-base", i === 0 ? "text-emerald-400" : "text-white")}>
                  ₩{r.price.toLocaleString()}
                </span>
                {!r.isUniv && <ExternalLink size={14} className="text-zinc-600" />}
              </div>
            </div>
          );
          return (
            <li key={i}>
              {r.link ? (
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
              ) : content}
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] md:text-[11px] text-zinc-600 font-medium leading-relaxed">
        * 모델명 기준 자동 매칭이라 옵션(색상·용량)이 다를 수 있어요. 정확한 가격은 각 몰에서 확인하세요.
      </p>
    </div>
  );
}
