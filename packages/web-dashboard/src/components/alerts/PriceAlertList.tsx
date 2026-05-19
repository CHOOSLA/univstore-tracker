"use client";

import React from 'react';
import { Target, Trash2, Bell, Clock, ExternalLink } from "lucide-react";
import Link from 'next/link';
import { deletePriceAlert } from "@/app/alerts/actions";

interface PriceAlert {
  id: number;
  productId: string;
  targetPrice: number;
  isActive: boolean;
  lastNotifiedAt: string | null;
  product: {
    title: string;
    brand: string | null;
    imageUrl: string | null;
  };
}

interface PriceAlertListProps {
  alerts: PriceAlert[];
}

export default function PriceAlertList({ alerts }: PriceAlertListProps) {
  const handleDelete = async (id: number) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) return;
    await deletePriceAlert(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 text-blue-500 px-2">
        <Bell size={20} fill="currentColor" />
        <h3 className="text-xl font-bold text-white tracking-tight">Active Watching List</h3>
      </div>

      {alerts.length > 0 ? (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="glass p-6 rounded-[32px] border-white/[0.03] flex items-center justify-between group glass-hover">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 bg-zinc-950 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  {alert.product.imageUrl ? (
                    <img src={alert.product.imageUrl} alt={alert.product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Target size={24} className="text-zinc-800" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{alert.product.brand}</span>
                    {alert.lastNotifiedAt && (
                      <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">Last Alerted</span>
                    )}
                  </div>
                  <Link href={`/product/${alert.productId}`} className="text-base font-bold text-white hover:text-blue-400 transition-colors line-clamp-1">
                    {alert.product.title}
                  </Link>
                  <div className="flex items-center space-x-3 text-[11px] text-zinc-500 font-bold">
                    <span className="text-zinc-300">Target: ₩{alert.targetPrice.toLocaleString()}</span>
                    {alert.lastNotifiedAt && (
                      <span className="flex items-center space-x-1">
                        <Clock size={10} /> 
                        <span>{new Date(alert.lastNotifiedAt).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                 <Link 
                   href={`https://www.univstore.com/item/${alert.productId}`} 
                   target="_blank"
                   className="p-3 bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white rounded-xl transition-all"
                 >
                   <ExternalLink size={18} />
                 </Link>
                 <button 
                   onClick={() => handleDelete(alert.id)}
                   className="p-3 bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 rounded-xl transition-all"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-20 rounded-[40px] border-dashed border-white/5 flex flex-col items-center justify-center space-y-4 text-center">
           <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
             <Target size={32} />
           </div>
           <div className="space-y-1">
             <p className="text-zinc-500 font-bold">No active price watches.</p>
             <p className="text-zinc-700 text-sm">상품 상세 페이지에서 목표 가격을 설정하여 추적을 시작하세요.</p>
           </div>
        </div>
      )}
    </div>
  );
}
