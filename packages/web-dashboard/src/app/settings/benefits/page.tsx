import React from 'react';
import { prisma } from "@/lib/prisma";
import BenefitRuleManager from "@/components/settings/BenefitRuleManager";
import { ShieldCheck } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function BenefitsSettingsPage() {
  const rules = await prisma.benefitRule.findMany({
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  return (
    <div className="min-h-screen pb-20 bg-zinc-950">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        <section className="space-y-4">
          <div className="flex items-center space-x-3 text-blue-500">
            <ShieldCheck size={24} />
            <span className="text-sm font-black uppercase tracking-[0.3em]">Operational Policy</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white">Rule Control.</h1>
          <p className="text-zinc-500 text-xl max-w-3xl">
            실시간 할인 정책을 관리합니다. 여기서 변경된 규칙은 <br />
            모든 상품의 '최종 실질 구매가' 계산에 즉시 적용됩니다.
          </p>
        </section>

        <BenefitRuleManager initialRules={rules} />
      </main>
    </div>
  );
}
