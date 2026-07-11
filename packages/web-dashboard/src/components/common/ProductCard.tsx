import React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "../Sparkline";
import PriceScoreBadge from "./PriceScoreBadge";

export type BadgeTone = "red" | "amber" | "emerald" | "blue";

const TONE: Record<BadgeTone, string> = {
  red: "bg-red-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] border-red-400/20",
  amber: "bg-amber-500 text-zinc-950 shadow-[0_2px_8px_rgba(245,158,11,0.4)] border-amber-400/20",
  emerald: "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)] border-emerald-400/20",
  blue: "bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.4)] border-blue-400/20",
};

const SPARK_COLOR: Record<BadgeTone, string> = {
  red: "#f87171", amber: "#fbbf24", emerald: "#34d399", blue: "#3b82f6",
};

export interface ProductCardProps {
  id: string;
  title: string;
  brand?: string | null;
  imageUrl?: string | null;
  currentPrice: number;
  /** 정가(취소선/할인율 계산용). currentPrice보다 클 때만 노출 */
  originalPrice?: number | null;
  priceScore?: number | null;
  reviewCount?: number | null;
  reviewAvgGrade?: number | null;
  /** 7일 가격 추이 스파크라인 데이터 */
  history?: number[];
  /** 좌상단 헤드라인 배지 (예: -23%, 역대 최저) */
  headlineBadge?: { text: string; tone: BadgeTone } | null;
  /** 가격 하단 부가 영역 (섹션별 커스텀: 하락액/알림 게이지 등) */
  footer?: React.ReactNode;
  showRating?: boolean;
  showScore?: boolean;
  showSparkline?: boolean;
  /** 품절: 이미지 회색 + 품절 배지 (클릭은 가능) */
  soldOut?: boolean;
  /** 카드 우상단 오버레이 (예: 관심 하트 버튼) */
  overlay?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * 통합 상품 카드. Explorer/Market 등 모든 그리드가 공유.
 * 표시 요소(배지·별점·점수·스파크라인·footer)는 옵션으로 켜고 끈다.
 */
export default function ProductCard({
  id, title, brand, imageUrl, currentPrice, originalPrice, priceScore,
  reviewCount, reviewAvgGrade, history, headlineBadge, footer,
  showRating = false, showScore = true, showSparkline = false, soldOut = false, overlay, onClick, className,
}: ProductCardProps) {
  const discountRate = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const hasHistory = showSparkline && history && history.length > 1;
  const sparkTone = headlineBadge?.tone ?? "blue";

  return (
    <Link
      href={`/product/${id}`}
      onClick={onClick}
      className={cn(
        "relative glass glass-hover p-4 md:p-6 rounded-[32px] md:rounded-[40px] border-white/[0.03] flex flex-col space-y-4 md:space-y-5 group transition-all duration-300",
        className
      )}
    >
      {overlay && <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">{overlay}</div>}
      {/* 이미지 */}
      <div className="w-full aspect-square bg-zinc-950 rounded-2xl md:rounded-3xl border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 relative">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className={cn("w-full h-full object-cover", soldOut && "grayscale opacity-50")} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[11px] md:text-xs font-black uppercase tracking-tighter">NO IMAGE</div>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <span className="px-3 py-1.5 rounded-lg bg-zinc-800/90 border border-white/15 text-zinc-200 text-xs md:text-sm font-black uppercase tracking-widest">품절</span>
          </div>
        )}
        {!soldOut && headlineBadge && (
          <div className="absolute top-3 left-3 z-20">
            <span className={cn("px-2.5 py-1 rounded-lg text-[11px] md:text-xs font-black uppercase tracking-wider border", TONE[headlineBadge.tone])}>
              {headlineBadge.text}
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none truncate">{brand || "Brand"}</p>
            {showScore && <PriceScoreBadge score={priceScore ?? null} />}
          </div>
          <p className="text-xs md:text-sm font-bold text-white leading-snug group-hover:text-blue-400 transition-colors line-clamp-2 min-h-[2.5em] break-keep">
            {title}
          </p>
          {showRating && (reviewCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-black text-amber-400">{(reviewAvgGrade ?? 0).toFixed(1)}</span>
              <span className="text-[10px] font-bold text-zinc-600">({(reviewCount ?? 0).toLocaleString()})</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col pt-3 border-t border-white/[0.04]">
            {discountRate > 0 && (
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-red-500 text-[11px] md:text-sm font-black">{discountRate}%</span>
                <span className="text-[10px] md:text-xs text-zinc-600 line-through font-bold">₩{originalPrice!.toLocaleString()}</span>
              </div>
            )}
            <span className="text-sm md:text-xl font-black text-white leading-none">
              ₩{currentPrice > 0 ? currentPrice.toLocaleString() : "---"}
            </span>
          </div>

          {footer}

          {hasHistory && (
            <div className="pt-2 border-t border-white/[0.03]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">7D Trend</span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase">Live</span>
                </span>
              </div>
              <div className="h-10 w-full">
                <Sparkline data={history!} color={SPARK_COLOR[sparkTone]} height={40} fullWidth />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
