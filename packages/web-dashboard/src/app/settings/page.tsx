import React from "react";
import Link from "next/link";
import { Settings as SettingsIcon, LogIn, ShieldCheck, User as UserIcon, Bell } from "lucide-react";
import { auth } from "@/auth";
import { getSystemConfig } from "@/app/alerts/actions";
import { isAdmin } from "@/lib/admin";
import TelegramConnector from "@/components/alerts/TelegramConnector";
import AccountSection from "@/components/settings/AccountSection";

export const dynamic = "force-dynamic";

function SectionLabel({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 px-2">
      <Icon size={15} className="text-zinc-500" />
      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">{title}</h2>
      <span className="text-[11px] text-zinc-600 hidden sm:inline">· {desc}</span>
    </div>
  );
}

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
          <p className="text-zinc-400 text-base md:text-lg">계정 정보와 알림 채널을 관리하세요.</p>
        </section>

        {session?.user ? (
          <div className="space-y-12">
            {/* 계정 (이름·탈퇴) — 가장 근본 정보이므로 상단 */}
            <section className="space-y-4">
              <SectionLabel icon={UserIcon} title="계정" desc="표시 이름과 회원 상태" />
              <AccountSection
                initialName={session.user.name ?? ""}
                email={session.user.email ?? null}
              />
            </section>

            {/* 알림 채널 (텔레그램 연동) */}
            <section className="space-y-4">
              <SectionLabel icon={Bell} title="알림 채널" desc="목표가·관심상품 알림을 텔레그램으로" />
              <TelegramConnector botUsername={config.TELEGRAM_BOT_USERNAME} />
            </section>

            {admin && (
              <section className="space-y-4">
                <SectionLabel icon={ShieldCheck} title="관리자" desc="전역 시스템 설정" />
                <Link
                  href="/admin"
                  className="glass p-6 rounded-[32px] border-amber-500/20 bg-amber-500/[0.02] flex items-center justify-between hover:bg-amber-500/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-amber-400" size={20} />
                    <div>
                      <p className="text-sm font-black text-white">관리자 설정</p>
                      <p className="text-xs text-zinc-500">전역 알림 정책·시스템 구성</p>
                    </div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400">이동 →</span>
                </Link>
              </section>
            )}
          </div>
        ) : (
          <div className="glass p-10 rounded-[40px] border-white/[0.04] text-center space-y-4">
            <p className="text-zinc-400">로그인하면 계정 관리와 텔레그램 알림 연동을 사용할 수 있습니다.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400"
            >
              <LogIn size={14} /> 로그인하러 가기
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
