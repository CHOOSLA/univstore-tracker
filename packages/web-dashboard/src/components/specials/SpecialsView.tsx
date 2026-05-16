"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Ticket, 
  Zap, 
  Timer, 
  Package, 
  Star,
  GanttChartSquare,
  AlertCircle,
  BellRing
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RaffleItem {
  id: string;
  title: string;
  brand: string;
  entries: number;
  endsIn: string;
  prob: string;
  image: string;
}

interface FlashSaleItem {
  time: string;
  status: string;
  name: string;
  discount: string;
  stock: number;
}

interface SpecialsViewProps {
  raffles: RaffleItem[];
  flashSales: FlashSaleItem[];
}

export default function SpecialsView({ raffles, flashSales }: SpecialsViewProps) {
  return (
    <div className="pb-20 bg-zinc-950" suppressHydrationWarning>
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        
        {/* Page Header */}
        <section className="space-y-4">
          <div className="flex items-center space-x-3 text-amber-500">
            <Ticket size={24} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">Specials & Raffles</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">High Stakes.</h1>
          <p className="text-zinc-500 text-xl max-w-3xl">
            래플 응모 정보부터 한정판 번들, 기습 특가 타임라인까지 <br />
            시간 한정의 혜택을 데이터로 추적하고 기회를 잡으세요.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Raffle Tracker (Left) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-bold text-white flex items-center tracking-tight">
                <Star className="mr-3 text-amber-400 fill-amber-400" size={20} />
                Live Raffle Tracker
              </h2>
              <span className="text-xs font-mono text-zinc-500">{raffles.length} Active Raffles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {raffles.length > 0 ? raffles.map((raffle) => (
                <div key={raffle.id} className="glass p-6 rounded-[32px] border-amber-500/10 bg-amber-500/[0.01] hover:bg-amber-500/[0.03] transition-all group cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-center text-[10px] font-black text-zinc-700">
                      {raffle.image}
                    </div>
                    <div className="bg-zinc-950 px-3 py-1 rounded-full border border-white/5 flex items-center space-x-2">
                      <Timer size={12} className="text-amber-500" />
                      <span className="text-[10px] font-black text-zinc-300 uppercase">{raffle.endsIn}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{raffle.brand}</p>
                    <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">{raffle.title}</h3>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Entries</p>
                      <p className="text-lg font-black text-white">{raffle.entries.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Winning Prob.</p>
                      <p className="text-lg font-black text-emerald-500">{raffle.prob}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 glass p-16 rounded-[40px] flex flex-col items-center justify-center space-y-6 border-dashed border-zinc-800 bg-zinc-900/20">
                   <div className="w-20 h-20 bg-zinc-950 rounded-3xl flex items-center justify-center border border-white/5 relative">
                      <Star className="text-zinc-800" size={40} />
                      <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full" />
                   </div>
                   <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-zinc-400">No Active Raffles</h3>
                      <p className="text-sm text-zinc-600 max-w-xs mx-auto">현재 진행 중인 래플 이벤트가 없습니다. 새로운 래플이 감지되면 시스템이 자동으로 분석을 시작합니다.</p>
                   </div>
                </div>
              )}
              <div className="glass p-6 rounded-[32px] border-dashed border-zinc-800 flex flex-col items-center justify-center space-y-3 opacity-50">
                 <BellRing className="text-zinc-700" size={32} />
                 <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">More Coming Soon</p>
              </div>
            </div>
          </div>

          {/* Flash Sale Timeline (Right) */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-2xl font-bold text-white px-2 tracking-tight flex items-center">
              <Zap className="mr-3 text-yellow-400 fill-yellow-400" size={20} />
              Flash Sale Pipeline
            </h2>
            
            <div className="glass p-8 rounded-[40px] border-white/[0.03] space-y-8 relative">
              <div className="absolute left-10 top-20 bottom-20 w-px bg-zinc-800" />
              
              {flashSales.length > 0 ? flashSales.map((sale, i) => (
                <div key={i} className="relative pl-12">
                   <div className={cn(
                     "absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 z-10",
                     sale.status === 'Ongoing' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-zinc-700"
                   )} />
                   <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-black text-zinc-500">{sale.time}</span>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase",
                          sale.status === 'Ongoing' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-zinc-900 text-zinc-600 border-white/5"
                        )}>{sale.status}</span>
                      </div>
                      <h4 className="font-bold text-white leading-tight">{sale.name}</h4>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs font-black text-emerald-400">{sale.discount}</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Stock: {sale.stock} units</span>
                      </div>
                   </div>
                </div>
              )) : (
                <div className="py-10 text-center text-zinc-700 font-black uppercase text-[10px] tracking-widest">
                  예정된 특가 일정이 없습니다.
                </div>
              )}

              <div className="pt-4">
                <button className="w-full bg-zinc-900 border border-white/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center space-x-2">
                  <GanttChartSquare size={16} />
                  <span>View Full Weekend Schedule</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Global Warning Banner */}
        <div className="glass p-6 rounded-[32px] border-red-500/20 bg-red-500/[0.02] flex items-center space-x-5">
           <AlertCircle className="text-red-500 shrink-0" size={24} />
           <p className="text-xs text-zinc-500 leading-relaxed font-medium">
             <span className="text-white font-bold underline">주의:</span> 래플 및 타임 한정 상품은 사이트 사정에 의해 조기 종료될 수 있습니다. 
             UnivWatch는 실시간 갱신을 원칙으로 하나, 실제 구매 시점의 가격과 상이할 수 있으니 최종 결제 창에서 반드시 확인하시기 바랍니다.
           </p>
        </div>

      </main>
    </div>
  );
}
