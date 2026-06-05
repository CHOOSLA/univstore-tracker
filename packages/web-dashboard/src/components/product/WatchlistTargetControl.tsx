"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Target, Loader2, X, Check } from "lucide-react";
import { createPriceAlert, deletePriceAlert } from "@/app/alerts/actions";

interface Props {
  productId: string;
  currentPrice: number;
  alert?: { id: number; targetPrice: number } | null;
}

/**
 * 관심상품 카드용 컴팩트 목표가 컨트롤.
 * 목표가 = 추적 상품의 속성이라는 모델에 맞춰, 카드 안에서 바로 설정/수정/해제한다.
 */
export default function WatchlistTargetControl({ productId, currentPrice, alert }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  if (status !== "authenticated") return null;

  const reached = !!alert && currentPrice > 0 && currentPrice <= alert.targetPrice;

  const save = async () => {
    const price = parseInt(value, 10);
    if (isNaN(price) || price <= 0) return;
    setLoading(true);
    const res = await createPriceAlert(productId, price);
    setLoading(false);
    if (res.success) {
      setEditing(false);
      setValue("");
      router.refresh();
    }
  };

  const clear = async () => {
    if (!alert) return;
    setLoading(true);
    const res = await deletePriceAlert(alert.id);
    setLoading(false);
    if (res.success) router.refresh();
  };

  // 목표가 있음 + 비편집 → 요약 칩
  if (alert && !editing) {
    return (
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={() => {
            setValue(String(alert.targetPrice));
            setEditing(true);
          }}
          className="flex items-center gap-1.5 text-[11px] font-black text-zinc-300 hover:text-white transition-colors min-w-0"
        >
          <Target size={12} className={reached ? "text-emerald-500" : "text-blue-400"} />
          <span className="tabular-nums truncate">목표 ₩{alert.targetPrice.toLocaleString()}</span>
          {reached && (
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
              도달
            </span>
          )}
        </button>
        <button
          onClick={clear}
          disabled={loading}
          className="text-zinc-600 hover:text-red-500 transition-colors p-1 disabled:opacity-50 shrink-0"
          aria-label="목표가 해제"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
        </button>
      </div>
    );
  }

  // 미설정 + 비편집 → 설정 버튼
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-400 border border-white/5 hover:border-blue-500/30 rounded-xl py-2 transition-all"
      >
        <Target size={12} /> 목표가 설정
      </button>
    );
  }

  // 편집 입력
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">₩</span>
        <input
          type="number"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setEditing(false);
              setValue("");
            }
          }}
          placeholder="목표가"
          className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 pl-6 pr-2 text-xs text-white font-black focus:outline-none focus:border-blue-500/50"
        />
      </div>
      <button
        onClick={save}
        disabled={loading || !value}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-2 rounded-xl shrink-0"
        aria-label="저장"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setValue("");
        }}
        className="text-zinc-600 hover:text-white p-2 shrink-0"
        aria-label="취소"
      >
        <X size={12} />
      </button>
    </div>
  );
}
