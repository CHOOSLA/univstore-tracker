"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Target, Loader2, X, Check, Pencil } from "lucide-react";
import { createPriceAlert, deletePriceAlert } from "@/app/alerts/actions";

interface Props {
  productId: string;
  currentPrice: number;
  alert?: { id: number; targetPrice: number } | null;
  /** 모달 헤더에 표시할 상품명(선택) */
  title?: string;
}

/**
 * 관심상품 목표가 컨트롤.
 * 카드 밖(아래)에 붙는 트리거 한 줄만 렌더하고,
 * 실제 입력은 모달에서 처리한다(작은 카드 안 인라인 입력의 폭 문제 해소).
 */
export default function WatchlistTargetControl({ productId, currentPrice, alert, title }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  // 모달 열려 있을 때 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (status !== "authenticated") return null;

  const reached = !!alert && currentPrice > 0 && currentPrice <= alert.targetPrice;

  const openModal = () => {
    setValue(alert ? String(alert.targetPrice) : "");
    setOpen(true);
  };

  const save = async () => {
    const price = parseInt(value, 10);
    if (isNaN(price) || price <= 0) return;
    setLoading(true);
    const res = await createPriceAlert(productId, price);
    setLoading(false);
    if (res.success) {
      setOpen(false);
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

  return (
    <>
      {/* 카드 아래 트리거 한 줄 */}
      {alert ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-zinc-900/50 border border-white/5">
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 text-[11px] md:text-xs font-black text-zinc-300 hover:text-white transition-colors min-w-0"
          >
            <Target size={13} className={reached ? "text-emerald-500" : "text-blue-400"} />
            <span className="tabular-nums truncate">목표 ₩{alert.targetPrice.toLocaleString()}</span>
            {reached && (
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                도달
              </span>
            )}
          </button>
          <div className="flex items-center shrink-0">
            <button
              onClick={openModal}
              className="text-zinc-500 hover:text-blue-400 transition-colors p-1.5"
              aria-label="목표가 수정"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={clear}
              disabled={loading}
              className="text-zinc-600 hover:text-red-500 transition-colors p-1.5 disabled:opacity-50"
              aria-label="목표가 해제"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openModal}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] md:text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-blue-400 border border-white/5 hover:border-blue-500/30 rounded-2xl py-2.5 transition-all"
        >
          <Target size={13} /> 목표가 설정
        </button>
      )}

      {/* 목표가 설정 모달 */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full md:max-w-sm glass border border-white/10 rounded-t-[28px] md:rounded-[28px] p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Target size={16} className="text-blue-400" /> 목표가 설정
                </h3>
                {title && <p className="text-xs text-zinc-500 font-medium mt-1 line-clamp-1">{title}</p>}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white p-1 shrink-0"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-500 uppercase tracking-widest">현재가</span>
              <span className="text-white tabular-nums">₩{currentPrice > 0 ? currentPrice.toLocaleString() : "---"}</span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg font-black">₩</span>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="목표가 입력"
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-lg text-white font-black tabular-nums focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
              이 가격 이하로 떨어지면 알림을 보내드려요.
            </p>

            <div className="flex gap-2">
              {alert && (
                <button
                  onClick={clear}
                  disabled={loading}
                  className="px-4 py-3 rounded-2xl border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  해제
                </button>
              )}
              <button
                onClick={save}
                disabled={loading || !value}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-600/20"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {alert ? "수정" : "설정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
