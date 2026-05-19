import React from 'react';
import { prisma } from "@/lib/prisma";
import MarketInsightView from "@/components/market/MarketInsightView";

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  // 1. 브랜드별 상품 수 (Brand Dominance)
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

  // 2. 전체 누적 절약 금액 (Savings Index)
  // (정가 - 최신가)의 합산
  const productsWithPrices = await prisma.product.findMany({
    where: {
      originalPrice: { not: null },
    },
    include: {
      priceHistory: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    }
  });

  let totalSavings = 0;
  productsWithPrices.forEach(p => {
    const currentPrice = p.priceHistory[0]?.price || 0;
    if (p.originalPrice && currentPrice > 0 && p.originalPrice > currentPrice) {
      totalSavings += (p.originalPrice - currentPrice);
    }
  });

  // 3. 카테고리별 할인율 (Category Efficiency)
  // 여기서는 브랜드별 평균 할인율로 대체 (현재 카테고리 수집이 미비함)
  const brandDiscounts = brandGroups.map(group => {
    const brandProducts = productsWithPrices.filter(p => p.brand === group.brand);
    
    // 유효한 할인 데이터만 필터링 (할인가가 정가보다 낮은 정상적인 케이스만)
    const validDiscounts = brandProducts
      .map(p => {
        const current = p.priceHistory[0]?.price || 0;
        if (!p.originalPrice || p.originalPrice <= 0 || current <= 0 || current >= p.originalPrice) {
          return 0;
        }
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

  // 4. 주차별 절약 추이 (Savings History - Mock for now as we just reset)
  const savingsHistory = [
    { week: 'W1', amount: totalSavings * 0.4 },
    { week: 'W2', amount: totalSavings * 0.6 },
    { week: 'W3', amount: totalSavings * 0.5 },
    { week: 'W4', amount: totalSavings * 0.8 },
    { week: 'W5', amount: totalSavings * 0.9 },
    { week: 'W6', amount: totalSavings },
  ];

  // 5. 현재 구매 적기 상품 (Top Value Deals)
  const topValueDeals = productsWithPrices
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

  return (
    <MarketInsightView 
      totalSavings={totalSavings}
      brandDistribution={brandDistribution}
      categoryEfficiency={brandDiscounts}
      savingsHistory={savingsHistory}
      totalDataPoints={productsWithPrices.length}
      topValueDeals={topValueDeals}
    />
  );
}
