import React from "react";
import { cn } from "@/lib/utils";

/**
 * 가격 등급 0~100 배지.
 * 100=역대 최저, 0=역대 최고. worker가 매 갱신 시 산출.
 */
interface Props {
  score: number | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

function tierOf(score: number) {
  if (score >= 90) return { label: "역대급", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (score >= 70) return { label: "최저권", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
  if (score >= 40) return { label: "보통",   classes: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
  if (score >= 20) return { label: "고가권", classes: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
  return                  { label: "역대최고", classes: "bg-red-500/10 text-red-400 border-red-500/20" };
}

export default function PriceScoreBadge({ score, size = "sm", className }: Props) {
  if (score === null || score === undefined) return null;
  const tier = tierOf(score);
  const sizing = size === "sm"
    ? "text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 gap-1"
    : "text-xs md:text-sm px-2.5 py-1.5 gap-1.5";

  return (
    <span
      className={cn(
        "inline-flex items-center font-black uppercase tracking-widest border rounded-md tabular-nums whitespace-nowrap shrink-0",
        tier.classes,
        sizing,
        className
      )}
      title={`가격 등급 ${score}/100 (100=역대 최저)`}
    >
      <span>{tier.label}</span>
      <span className="opacity-70">·</span>
      <span>{score}</span>
    </span>
  );
}
