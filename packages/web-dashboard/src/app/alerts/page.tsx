import React from 'react';
import { prisma } from "@/lib/prisma";
import PriceAlertList from "@/components/alerts/PriceAlertList";
import { Bell, Send, Settings, ShieldCheck, ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const alerts = await prisma.priceAlert.findMany({
    include: {
      product: {
        select: {
          title: true,
          brand: true,
          imageUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="pb-20 bg-zinc-950 min-h-screen">
      <main className="max-w-4xl mx-auto px-6 pt-12 space-y-12">
        <section className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6">
            <Bell className="text-blue-500" size={32} />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">Notification Center</h1>
          <p className="text-zinc-400 text-lg">가격 하락 및 역대 최저가 경신 알림을 실시간으로 관리하세요.</p>
        </section>

        {/* Real Data Section */}
        <PriceAlertList alerts={alerts as any} />

        <div className="grid gap-6">
          <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest px-2">Global Settings</h3>
...
          <AlertSettingCard 
            title="Telegram Integration" 
            desc="텔레그램 봇을 통해 실시간으로 꿀매 정보를 받아봅니다." 
            status="Connected"
            icon={Send}
            color="text-sky-400"
          />
          <AlertSettingCard 
            title="Price Thresholds" 
            desc="특정 할인율(예: 20%) 이상의 하락만 알림을 받도록 설정합니다." 
            status="10% (Default)"
            icon={Settings}
            color="text-zinc-400"
          />
          <AlertSettingCard 
            title="System Health Alerts" 
            desc="크롤러 세션 만료나 서버 오류 시 관리자에게 알림을 보냅니다." 
            status="Active"
            icon={ShieldCheck}
            color="text-emerald-400"
          />
        </div>

        <div className="glass p-10 rounded-[40px] border-blue-500/20 bg-blue-500/[0.02]">
          <h3 className="text-xl font-bold text-white mb-4">How it works</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            모든 알림은 Redis 큐를 통해 비동기로 처리됩니다. 워커가 DB에 저장하기 전, 
            이전 가격과 실시간 비교하여 하락폭이 설정한 임계값을 넘으면 즉시 메시지를 발송합니다.
          </p>
          <button className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-zinc-200 transition-colors">
            Configure Webhooks
          </button>
        </div>
      </main>
    </div>
  );
}

function AlertSettingCard({ title, desc, status, icon: Icon, color }: any) {
  return (
    <div className="glass p-6 rounded-3xl flex items-center justify-between group cursor-pointer glass-hover">
      <div className="flex items-center space-x-5">
        <div className={`p-4 rounded-2xl bg-zinc-950/50 border border-white/5 ${color}`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-xs text-zinc-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-xs font-mono text-zinc-500">{status}</span>
        <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
      </div>
    </div>
  );
}
