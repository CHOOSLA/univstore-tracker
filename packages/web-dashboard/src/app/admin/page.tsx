import React from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSystemConfig } from "@/app/alerts/actions";
import { isAdmin } from "@/lib/admin";
import GlobalSettingsManager from "@/components/alerts/GlobalSettingsManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // 화이트리스트(ADMIN_EMAILS) 미포함 사용자는 홈으로 차단
  if (!(await isAdmin())) redirect("/");
  const config = await getSystemConfig();

  return (
    <div className="pb-20 bg-zinc-950 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-12 space-y-10">
        <section className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-4">
            <ShieldCheck className="text-amber-400" size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">관리자 설정</h1>
          <p className="text-zinc-400 text-base md:text-lg">전역 알림 정책과 시스템 구성을 관리합니다.</p>
        </section>

        <GlobalSettingsManager initialConfig={config} />
      </main>
    </div>
  );
}
