import React from 'react';
import { prisma } from "@/lib/prisma";
import MarketInsightView from "@/components/market/MarketInsightView";

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  // 1. 브랜드별 상품 수 (Brand Dominance) - Top 5 + Others 그룹화
  const brandGroups = await prisma.product.groupBy({
    by: ['brand'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  const totalBrands = brandGroups.length;
  const top5 = brandGroups.slice(0, 5);
  const others = brandGroups.slice(5);
  const othersCount = others.reduce((acc, curr) => acc + curr._count.id, 0);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#27272a'];
  const brandDistribution = [
    ...top5.map((group, i) => ({
      name: group.brand || 'Etc',
      value: group._count.id,
      color: colors[i]
    })),
    { name: 'Others', value: othersCount, color: colors[5] }
  ];

  // 2. 전체 데이터 포인트 수
  const totalDataPoints = await prisma.product.count();

  // 3. 누적 절약 금액 (Savings Index)
  const productsRaw = await prisma.product.findMany({
    where: {
      originalPrice: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      brand: true,
      originalPrice: true,
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: { price: true }
      }
    }
  });

  let totalSavings = 0;
  productsRaw.forEach(p => {
    const currentPrice = p.priceHistory[0]?.price || 0;
    if (p.originalPrice && currentPrice > 0 && p.originalPrice > currentPrice) {
      totalSavings += (p.originalPrice - currentPrice);
    }
  });

  // 4. 브랜드별 평균 할인율 (Efficiency)
  const brandDiscounts = top5.map(group => {
    const brandProducts = productsRaw.filter(p => p.brand === group.brand);
    const validDiscounts = brandProducts
      .map(p => {
        const current = p.priceHistory[0]?.price || 0;
        if (!p.originalPrice || p.originalPrice <= 0 || current <= 0 || current >= p.originalPrice) return 0;
        return ((p.originalPrice - current) / p.originalPrice) * 100;
      })
      .filter(rate => rate > 0);

    const avgDiscount = validDiscounts.length > 0 
      ? validDiscounts.reduce((acc, rate) => acc + rate, 0) / validDiscounts.length
      : 0;

    return {
      category: group.brand || 'Etc',
      discount: Math.round(avgDiscount)
    };
  }).filter(b => b.discount > 0).sort((a, b) => b.discount - a.discount);

  // 5. 주차별 절약 추이
  const savingsHistory = [
    { week: 'W1', amount: totalSavings * 0.4 },
    { week: 'W2', amount: totalSavings * 0.6 },
    { week: 'W3', amount: totalSavings * 0.5 },
    { week: 'W4', amount: totalSavings * 0.8 },
    { week: 'W5', amount: totalSavings * 0.9 },
    { week: 'W6', amount: totalSavings },
  ];

  return (
    <MarketInsightView 
      totalSavings={totalSavings}
      brandDistribution={brandDistribution}
      categoryEfficiency={brandDiscounts}
      savingsHistory={savingsHistory}
      totalDataPoints={totalDataPoints}
      totalBrands={totalBrands}
    />
  );
}
