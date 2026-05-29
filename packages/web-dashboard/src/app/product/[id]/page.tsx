import React from 'react';
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/product/ProductDetailView";

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return notFound();

  const history = await prisma.priceHistory.findMany({
    where: { productId: id },
    orderBy: { timestamp: 'desc' },
    take: 1000,
  });

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

  // 통신사(mno) 상품은 univstore에서 /mno/item/{id} 경로에 노출됨
  // menuSubCategories에 '통신사'가 포함된 상품은 Buy Now URL을 mno 경로로 분기해야
  // univstore의 홈 redirect를 피할 수 있음 (사용자 신고로 발견된 패턴)
  const isMnoItem = product.menuSubCategories?.includes('통신사') ?? false;
  const externalUrl = isMnoItem
    ? `https://www.univstore.com/mno/item/${product.id}`
    : `https://www.univstore.com/item/${product.id}`;

  // 통신사 상품이면 옵션/요금제 메타데이터 동봉
  const mnoOption = isMnoItem
    ? await prisma.mnoOption.findUnique({ where: { productId: id } })
    : null;

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
      isMnoItem={isMnoItem}
      externalUrl={externalUrl}
      mnoOption={mnoOption ? JSON.parse(JSON.stringify(mnoOption)) : null}
    />
  );
}
