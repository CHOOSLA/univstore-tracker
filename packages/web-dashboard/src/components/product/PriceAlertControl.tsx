"use client";

import React, { useState } from 'react';
import { Bell, Target, Trash2, CheckCircle2, AlertCircle, Loader2, LogIn } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createPriceAlert, deletePriceAlert } from "@/app/alerts/actions";

interface PriceAlertControlProps {
  productId: string;
  currentPrice: number;
  existingAlerts: { id: number, targetPrice: number }[];
}

export default function PriceAlertControl({ productId, currentPrice, existingAlerts }: PriceAlertControlProps) {
  const { status } = useSession();
  const router = useRouter();
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSetAlert = async () => {
    const price = parseInt(targetPrice);
    if (isNaN(price) || price <= 0) return;

    setIsLoading(true);
    const result = await createPriceAlert(productId, price);
    setIsLoading(false);

    if (result.success) {
      setFeedback({ type: 'success', message: '목표 가격 알림이 설정되었습니다.' });
      setTargetPrice('');
      router.refresh();
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: result.error || '설정 실패' });
    }
  };

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    const result = await deletePriceAlert(id);
    setIsLoading(false);
    if (result.success) router.refresh();
    else setFeedback({ type: 'error', message: result.error || '삭제 실패' });
  };

  return (
    <div className="glass p-8 rounded-[40px] border-blue-500/20 bg-blue-500/[0.02] space-y-6">
      <div className="flex items-center space-x-3 text-blue-500">
        <Bell size={20} fill="currentColor" />
        <h3 className="text-xl font-bold text-white tracking-tight">목표가 알림</h3>
      </div>

      {status === "loading" ? (
        <div className="py-8 flex justify-center"><Loader2 className="text-blue-500 animate-spin" size={24} /></div>
      ) : status !== "authenticated" ? (
        /* 비로그인 → 로그인 유도 */
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 leading-relaxed">
            로그인하면 원하는 가격에 도달했을 때 알림을 받을 수 있습니다.
          </p>
          <button
            onClick={() => signIn()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
          >
            <LogIn size={16} /> 로그인하고 알림 받기
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500 leading-relaxed">
            원하는 구매 가격을 설정하세요. 수집된 가격이 목표가 이하로 떨어지면 알림에 표시됩니다.
          </p>

          <div className="space-y-4">
            {existingAlerts.map(alert => {
              const reached = currentPrice > 0 && currentPrice <= alert.targetPrice;
              return (
                <div key={alert.id} className="bg-zinc-950 p-4 rounded-2xl border border-white/5 flex justify-between items-center group">
                  <div className="flex items-center space-x-3">
                    <Target size={16} className={reached ? "text-emerald-500" : "text-zinc-500"} />
                    <span className="text-sm font-black text-white">₩{alert.targetPrice.toLocaleString()} 이하</span>
                    {reached && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        도달
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    disabled={isLoading}
                    className="text-zinc-600 hover:text-red-500 transition-colors p-2 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₩</div>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="목표 가격 입력..."
                className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pl-10 pr-32 text-white font-black focus:outline-none focus:border-blue-500/50 transition-all"
              />
              <button
                onClick={handleSetAlert}
                disabled={isLoading || !targetPrice}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : "설정"}
              </button>
            </div>
          </div>

          {feedback && (
            <div className={cn(
              "p-4 rounded-2xl flex items-center space-x-3",
              feedback.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-xs font-bold">{feedback.message}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
