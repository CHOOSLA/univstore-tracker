import React from 'react';
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/product/ProductDetailView";

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. 상품 기본 정보 조회
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return notFound();
  }

  // 2. 가격 이력 전체 조회 (차트용)
  const history = await prisma.priceHistory.findMany({
    where: { productId: id },
    orderBy: { timestamp: 'desc' },
    take: 100, // 더 넉넉하게 가져와서 필터링
  });

  // 날짜별 최신 가격만 필터링 (차트 가시성 개선)
  const uniqueDays = new Map();
  history.forEach(h => {
    const dateStr = h.timestamp.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
    if (!uniqueDays.has(dateStr)) {
      uniqueDays.set(dateStr, h.price);
    }
  });

  const formattedHistory = Array.from(uniqueDays.entries())
    .map(([date, price]) => ({
      date,
      price
    }))
    .slice(0, 30); // 최종적으로 최근 30일치만 사용

  const benefitRules = await prisma.benefitRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' }
  });

  return (
    <ProductDetailView 
      product={product} 
      history={formattedHistory} 
      benefitRules={benefitRules.map(r => ({
        pattern: r.pattern,
        rate: r.rate,
        maxLimit: r.maxLimit,
        label: r.label
      }))}
    />
  );
}
