"use client";

import React, { useState } from 'react';
import { Send, Settings, ShieldCheck, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateSystemConfig } from "@/app/alerts/actions";

interface GlobalSettingsManagerProps {
  initialConfig: {
    TELEGRAM_ENABLED: string;
    MIN_DROP_RATE: string;
    HEALTH_ALERTS_ENABLED: string;
  };
}

export default function GlobalSettingsManager({ initialConfig }: GlobalSettingsManagerProps) {
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const handleToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    setIsSaving(key);
    const res = await updateSystemConfig(key, newValue);
    if (res.success) {
      setConfig(prev => ({ ...prev, [key]: newValue }));
    }
    setIsSaving(null);
  };

  const handleUpdateValue = async (key: string, value: string) => {
    setIsSaving(key);
    const res = await updateSystemConfig(key, value);
    if (res.success) {
      setConfig(prev => ({ ...prev, [key]: value }));
    }
    setIsSaving(null);
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <h3 className="text-xs font-black text-zinc-600 uppercase tracking-widest px-2">Global System Configuration</h3>
      
      <SettingCard 
        title="Telegram Notifications" 
        desc="실시간 가격 알림 및 시스템 경고를 텔레그램으로 전송합니다." 
        status={config.TELEGRAM_ENABLED === 'true' ? 'Enabled' : 'Disabled'}
        icon={Send}
        color="text-sky-400"
        isLoading={isSaving === 'TELEGRAM_ENABLED'}
        onClick={() => handleToggle('TELEGRAM_ENABLED', config.TELEGRAM_ENABLED)}
        active={config.TELEGRAM_ENABLED === 'true'}
      />

      <div className="glass p-4 md:p-6 rounded-3xl flex items-center justify-between gap-3 group glass-hover">
        <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
          <div className="p-3 md:p-4 rounded-2xl bg-zinc-950/50 border border-white/5 text-zinc-400 shrink-0">
            <Settings size={24} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-white">Price Drop Threshold</h4>
            <p className="text-xs text-zinc-500">알림을 보낼 최소 가격 하락율을 설정합니다.</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 shrink-0">
          <select 
            value={config.MIN_DROP_RATE}
            onChange={(e) => handleUpdateValue('MIN_DROP_RATE', e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white focus:outline-none focus:border-blue-500/50"
            disabled={isSaving === 'MIN_DROP_RATE'}
          >
            <option value="5">5%</option>
            <option value="10">10%</option>
            <option value="15">15%</option>
            <option value="20">20%</option>
            <option value="30">30%</option>
          </select>
          {isSaving === 'MIN_DROP_RATE' && <Loader2 size={16} className="animate-spin text-zinc-500" />}
        </div>
      </div>

      <SettingCard 
        title="System Health Alerts" 
        desc="크롤러 차단이나 세션 만료 시 관리자 계정으로 즉시 통보합니다." 
        status={config.HEALTH_ALERTS_ENABLED === 'true' ? 'Active' : 'Paused'}
        icon={ShieldCheck}
        color="text-emerald-400"
        isLoading={isSaving === 'HEALTH_ALERTS_ENABLED'}
        onClick={() => handleToggle('HEALTH_ALERTS_ENABLED', config.HEALTH_ALERTS_ENABLED)}
        active={config.HEALTH_ALERTS_ENABLED === 'true'}
      />
    </div>
  );
}

function SettingCard({ title, desc, status, icon: Icon, color, onClick, active, isLoading }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass p-4 md:p-6 rounded-3xl flex items-center justify-between gap-3 group cursor-pointer transition-all border",
        active ? "border-white/10 bg-white/[0.01]" : "border-white/5 opacity-50 grayscale",
        isLoading && "pointer-events-none opacity-80"
      )}
    >
      <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
        <div className={cn("p-3 md:p-4 rounded-2xl bg-zinc-950/50 border border-white/5 shrink-0", color)}>
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-xs text-zinc-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 shrink-0">
        {isLoading ? (
          <Loader2 size={18} className="text-zinc-500 animate-spin" />
        ) : (
          <>
            <span className={cn("text-[10px] font-black uppercase tracking-widest", active ? "text-emerald-500" : "text-zinc-600")}>
              {status}
            </span>
            <div className={cn(
              "w-10 h-6 rounded-full relative transition-all border",
              active ? "bg-emerald-500/20 border-emerald-500/50" : "bg-zinc-900 border-white/5"
            )}>
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full transition-all",
                active ? "right-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "left-1 bg-zinc-700"
              )} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
