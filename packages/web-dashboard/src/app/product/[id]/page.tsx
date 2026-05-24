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
    // 1000개 정도면 수년간의 일일 데이터로 충분함
    take: 1000, 
  });

  // 클라이언트에서 처리하기 편하도록 타임스탬프와 가격만 전달
  const formattedHistory = history.map(h => ({
    date: h.timestamp.toISOString(),
    price: h.price
  }));

  const benefitRules = await prisma.benefitRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' }
  });

  const priceAlerts = await prisma.priceAlert.findMany({
    where: { productId: id, isActive: true },
    orderBy: { targetPrice: 'asc' }
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
      existingAlerts={priceAlerts.map(a => ({ id: a.id, targetPrice: a.targetPrice }))}
    />
  );
}
