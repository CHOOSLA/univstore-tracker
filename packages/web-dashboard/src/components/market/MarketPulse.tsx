import React from 'react';
import { Activity, Bell, Boxes, PiggyBank } from 'lucide-react';

interface Props {
  totalProducts: number;
  activeAlerts: number;
  totalCategories: number;
  totalSavings: number; // 누적 절약 금액(원)
}

/**
 * Deals-First 화면의 보조 통계 footer.
 * "방금 무엇을 보고 있는가"의 큰 맥락을 차분하게 한 줄로 정리한다.
 * 자랑성 큰 숫자가 아니라 dashboard 운영 상태를 알리는 톤.
 */
export default function MarketPulse({ totalProducts, activeAlerts, totalCategories, totalSavings }: Props) {
  const items = [
    { icon: <Boxes size={14} />, label: '추적 상품', value: totalProducts.toLocaleString() },
    { icon: <Bell size={14} />, label: '활성 알림', value: activeAlerts.toLocaleString() },
    { icon: <Activity size={14} />, label: '카테고리', value: totalCategories.toLocaleString() },
    {
      icon: <PiggyBank size={14} />,
      label: '추적 누적 차익',
      value: totalSavings >= 100_000_000
        ? `${(totalSavings / 100_000_000).toFixed(1)}억`
        : totalSavings >= 10_000
        ? `${Math.round(totalSavings / 10_000).toLocaleString()}만`
        : totalSavings.toLocaleString(),
    },
  ];

  return (
    <footer className="rounded-2xl border border-white/5 bg-zinc-900/30 px-6 py-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-zinc-400">
            <span className="text-zinc-600">{it.icon}</span>
            <span className="text-zinc-500">{it.label}</span>
            <span className="font-mono font-black text-white">{it.value}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}
