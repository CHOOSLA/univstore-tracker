import React from 'react';
import PriceAlertList from "@/components/alerts/PriceAlertList";
import GlobalSettingsManager from "@/components/alerts/GlobalSettingsManager";
import { getSystemConfig } from "./actions";
import { Bell } from "lucide-react";
import TelegramConnector from "@/components/alerts/TelegramConnector";

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const config = await getSystemConfig();

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

        {/* Telegram Sync & Personal Binding QR */}
        <TelegramConnector botUsername={config.TELEGRAM_BOT_USERNAME} />

        {/* User Specific Alerts */}
        <PriceAlertList />

        {/* System Wide Global Settings */}
        <GlobalSettingsManager initialConfig={config} />

        <div className="glass p-10 rounded-[40px] border-blue-500/20 bg-blue-500/[0.02]">
          <h3 className="text-xl font-bold text-white mb-4">How it works</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            모든 알림은 Redis 큐를 통해 비동기로 처리됩니다. 워커가 DB에 저장하기 전, 
            이전 가격과 실시간 비교하여 하락폭이 설정한 임계값을 넘거나 목표가에 진입할 시 등록된 개인 텔레그램 채널로 즉시 메시지를 발송합니다.
          </p>
        </div>
      </main>
    </div>
  );
}

