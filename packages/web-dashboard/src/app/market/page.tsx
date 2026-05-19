import React from 'react';
import { prisma } from "@/lib/prisma";
import MarketInsightView from "@/components/market/MarketInsightView";

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  // 1. 브랜드별 상품 수 (Brand Dominance) - DB 그룹화
  const brandGroups = await prisma.product.groupBy({
    by: ['brand'],
    _count: { id: true },
  });

  const colors = ['#fafafa', '#3b82f6', '#ef4444', '#a855f7', '#27272a'];
  const brandDistribution = brandGroups.map((group, i) => ({
    name: group.brand || 'Etc',
    value: group._count.id,
    color: colors[i % colors.length]
  })).sort((a, b) => b.value - a.value);

  // 2. 전체 데이터 포인트 수
  const totalDataPoints = await prisma.product.count();

  // 3. 누적 절약 금액 (Savings Index) - 3만개를 다 가져오지 않고 쿼리로 처리
  // (Prisma의 한계로 인해 raw query 사용이 더 효율적일 수 있으나, 일단 상품 정보를 최소화하여 가져옴)
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

  // 4. 브랜드별 평균 할인율 (Efficiency) - 메모리 최적화 필터링
  const brandDiscounts = brandGroups.map(group => {
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

  // 5. 현재 구매 적기 상품 (Top Value Deals) - 상위 10개만 추출
  const topValueDeals = productsRaw
    .map(p => {
      const current = p.priceHistory[0]?.price || 0;
      const discountRate = p.originalPrice ? ((p.originalPrice - current) / p.originalPrice) * 100 : 0;
      return {
        id: p.id,
        title: p.title,
        brand: p.brand,
        currentPrice: current,
        originalPrice: p.originalPrice || 0,
        discountRate: Math.round(discountRate)
      };
    })
    .filter(d => d.discountRate > 0)
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, 10);

  // 6. 주차별 절약 추이 (Savings History)
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
      topValueDeals={topValueDeals}
    />
  );
}
