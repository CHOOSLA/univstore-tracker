"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Target, Trash2, Bell, ExternalLink, Loader2 } from "lucide-react";
import { deletePriceAlert } from "@/app/alerts/actions";

type AlertItem = {
  id: number;
  productId: string;
  targetPrice: number;
  isActive: boolean;
  lastNotifiedAt: string | Date | null;
  product: { title: string; brand: string | null; imageUrl: string | null; currentPrice: number | null };
};

export default function MyAlertList({ alerts }: { alerts: AlertItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const result = await deletePriceAlert(id);
    setDeletingId(null);
    if (result.success) router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 text-blue-500 px-2">
        <Bell size={20} fill="currentColor" />
        <h3 className="text-xl font-bold text-white tracking-tight">내 목표가 알림</h3>
        <span className="text-xs font-mono text-zinc-600">{alerts.length}</span>
      </div>

      {alerts.length > 0 ? (
        <div className="grid gap-4">
          {alerts.map(alert => {
            const current = Number(alert.product.currentPrice ?? 0);
            const reached = current > 0 && current <= alert.targetPrice;
            return (
              <div key={alert.id} className="glass p-4 md:p-5 rounded-3xl border-white/[0.04] flex items-center gap-4">
                <Link href={`/product/${alert.productId}`} className="shrink-0">
                  {alert.product.imageUrl ? (
                    <img src={alert.product.imageUrl} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{alert.product.brand || 'Brand'}</p>
                  <Link href={`/product/${alert.productId}`} className="block text-sm font-black text-white truncate hover:text-blue-400 transition-colors">
                    {alert.product.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-black text-zinc-300">
                      <Target size={12} className={reached ? "text-emerald-500" : "text-zinc-500"} />
                      목표 ₩{alert.targetPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">현재 ₩{current.toLocaleString()}</span>
                    {reached && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        목표 도달
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  disabled={deletingId === alert.id}
                  className="shrink-0 text-zinc-600 hover:text-red-500 transition-colors p-2 disabled:opacity-50"
                  aria-label="삭제"
                >
                  {deletingId === alert.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass p-12 rounded-[32px] border-white/[0.03] text-center space-y-3">
          <Target className="mx-auto text-zinc-700" size={32} />
          <p className="text-sm text-zinc-500">설정한 목표가 알림이 없습니다.</p>
          <Link href="/products" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400">
            상품 둘러보기 <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
