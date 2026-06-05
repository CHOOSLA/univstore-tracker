import React from "react";
import Link from "next/link";
import { Settings as SettingsIcon, LogIn, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { getSystemConfig } from "@/app/alerts/actions";
import { isAdmin } from "@/lib/admin";
import TelegramConnector from "@/components/alerts/TelegramConnector";
import AccountSection from "@/components/settings/AccountSection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await getSystemConfig();
  const session = await auth();
  const admin = await isAdmin();

  return (
    <div className="pb-20 bg-zinc-950 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-12 space-y-10">
        <section className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-4">
            <SettingsIcon className="text-blue-500" size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">설정</h1>
          <p className="text-zinc-400 text-base md:text-lg">알림 수신 채널을 연동하고 관리하세요.</p>
        </section>

        {session?.user ? (
          <>
            <TelegramConnector botUsername={config.TELEGRAM_BOT_USERNAME} />
            <AccountSection
              initialName={session.user.name ?? ""}
              email={session.user.email ?? null}
            />
          </>
        ) : (
          <div className="glass p-10 rounded-[40px] border-white/[0.04] text-center space-y-4">
            <p className="text-zinc-400">로그인하면 텔레그램 알림 채널을 연동할 수 있습니다.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400"
            >
              <LogIn size={14} /> 로그인하러 가기
            </Link>
          </div>
        )}

        {admin && (
          <Link
            href="/admin"
            className="glass p-6 rounded-[32px] border-amber-500/20 bg-amber-500/[0.02] flex items-center justify-between hover:bg-amber-500/[0.04] transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-amber-400" size={20} />
              <div>
                <p className="text-sm font-black text-white">관리자 설정</p>
                <p className="text-xs text-zinc-500">전역 알림 임계값·시스템 구성</p>
              </div>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">이동 →</span>
          </Link>
        )}
      </main>
    </div>
  );
}
