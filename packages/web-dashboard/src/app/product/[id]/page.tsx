import React from 'react';
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/product/ProductDetailView";
import { auth } from "@/auth";
import { isWatched } from "@/app/watchlist/actions";
import { getPriceComparison } from "@/lib/naverPrice";

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

  // 로그인 사용자 본인의 목표가 알림 + 관심상품 여부
  const session = await auth();
  const priceAlerts = session?.user?.id
    ? await prisma.priceAlert.findMany({
        where: { productId: id, userId: session.user.id },
        orderBy: { targetPrice: 'asc' }
      })
    : [];
  const watched = session?.user?.id ? await isWatched(id) : false;

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

  // 유사 상품 — 같은 sub 또는 third 카테고리, 가격 ±30% 내, 가격 차이 작은 순
  const currentPrice = Number(product.currentPrice ?? 0);
  const subCats = product.menuSubCategories ?? [];
  const thirdCats = product.thirdCategories ?? [];
  const similarItems = (subCats.length || thirdCats.length) && currentPrice > 0
    ? await prisma.$queryRaw<any[]>`
        SELECT id, title, brand, "imageUrl", "currentPrice", "priceScore"
        FROM "Product"
        WHERE id != ${id}
          AND "imageUrl" IS NOT NULL
          AND "stockStatus" != 'Discontinued'
          AND "currentPrice" BETWEEN ${Math.floor(currentPrice * 0.7)} AND ${Math.ceil(currentPrice * 1.3)}
          AND ("menuSubCategories" && ${subCats}::text[] OR "thirdCategories" && ${thirdCats}::text[])
        ORDER BY ABS("currentPrice" - ${currentPrice})
        LIMIT 6
      `
    : [];
  const similar = similarItems.map(s => ({
    id: s.id,
    title: s.title,
    brand: s.brand ?? 'Brand',
    imageUrl: s.imageUrl,
    currentPrice: Number(s.currentPrice ?? 0),
    priceScore: s.priceScore ?? null,
  }));

  // 네이버 쇼핑 최저가 비교 — 모델코드는 web-api에서 live fetch (스키마 미저장)
  let modelCode = '';
  try {
    const r = await fetch(`https://web-api.univstore.com/api/v1/items/${id}`, {
      headers: { Referer: `https://www.univstore.com/item/${id}` },
      next: { revalidate: 86400 },
    });
    if (r.ok) modelCode = (await r.json())?.result?.item?.code || '';
  } catch { /* code 없으면 title로 폴백 */ }
  const priceComparison = await getPriceComparison(modelCode, product.title, Number(product.originalPrice ?? currentPrice ?? 0));

  return (
    <ProductDetailView
      product={product}
      history={formattedHistory}
      existingAlerts={priceAlerts.map(a => ({ id: a.id, targetPrice: a.targetPrice }))}
      isMnoItem={isMnoItem}
      externalUrl={externalUrl}
      mnoOption={mnoOption ? JSON.parse(JSON.stringify(mnoOption)) : null}
      similar={similar}
      watched={watched}
      priceComparison={priceComparison}
    />
  );
}
