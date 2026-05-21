// [DISABLED] 네비게이션에서 제거됨 - 홈 배너 텍스트(가족결합특가 등)만 수집되어 실질적 데이터 없음
// 향후 구조화된 특가/래플 데이터 소스 확보 시 복구 가능
import React from 'react';
import { prisma } from "@/lib/prisma";
import SpecialsView from "@/components/specials/SpecialsView";

export const dynamic = 'force-dynamic';

export default async function SpecialsPage() {
  // 1. 래플 정보 조회
  const raffles = await prisma.raffle.findMany({
    where: { status: 'Ongoing' },
    orderBy: { endsAt: 'asc' },
  });

  // 2. 타임 세일 정보 조회
  const flashSales = await prisma.flashSale.findMany({
    where: { status: { in: ['Ongoing', 'Upcoming'] } },
    orderBy: { startTime: 'asc' },
  });

  // 데이터 가공 (뷰 컴포넌트 형식에 맞게)
  const formattedRaffles = raffles.map(r => ({
    id: r.id,
    title: r.title,
    brand: r.brand || 'Brand',
    entries: r.entries,
    endsIn: calculateEndsIn(r.endsAt),
    prob: calculateProb(r.entries, r.winners),
    image: r.brand?.substring(0, 2).toUpperCase() || 'SP'
  }));

  const formattedSales = flashSales.map(s => ({
    time: s.startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    status: s.status,
    name: s.title,
    discount: s.discount || 'Special',
    stock: s.stock || 0
  }));

  return (
    <SpecialsView 
      raffles={formattedRaffles}
      flashSales={formattedSales}
    />
  );
}

function calculateEndsIn(date: Date) {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `${days}d ${hours}h`;
}

function calculateProb(entries: number, winners: number) {
  if (entries === 0) return "0%";
  const p = (winners / entries) * 100;
  return p < 0.01 ? "0.01%" : `${p.toFixed(2)}%`;
}
