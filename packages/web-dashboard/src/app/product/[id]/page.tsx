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
    take: 30, // 최근 30개 기록
  });

  // 데이터 포맷팅 (recharts용)
  const formattedHistory = history.map(h => ({
    date: h.timestamp.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
    price: h.price
  }));

  return (
    <ProductDetailView 
      product={product} 
      history={formattedHistory} 
    />
  );
}
