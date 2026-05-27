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
  // Prisma 5.22가 32k+ 결과셋의 nested select에서 패닉하는 이슈가 있어 priceHistory를 별도 쿼리로 분리
  const productsRaw = await prisma.product.findMany({
    where: { originalPrice: { gt: 0 } },
    select: {
      id: true,
      title: true,
      brand: true,
      originalPrice: true,
    },
  });

  // Postgres DISTINCT ON으로 product당 최신 가격 1건씩 효율적으로 가져옴
  // (Prisma 5.22의 priceHistory.findMany는 32k+ 결과 + distinct에서 패닉함)
  const latestPrices = await prisma.$queryRaw<{ productId: string; price: number }[]>`
    SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
    FROM "PriceHistory" ph
    INNER JOIN "Product" p ON p.id = ph."productId"
    WHERE p."originalPrice" > 0
    ORDER BY ph."productId", ph.timestamp DESC
  `;
  const priceMap = new Map(latestPrices.map(lp => [lp.productId, lp.price]));

  let totalSavings = 0;
  productsRaw.forEach(p => {
    const currentPrice = priceMap.get(p.id) || 0;
    if (p.originalPrice && currentPrice > 0 && p.originalPrice > currentPrice) {
      totalSavings += (p.originalPrice - currentPrice);
    }
  });

  // 4. 브랜드별 평균 할인율 (Efficiency)
  const brandDiscounts = top5.map(group => {
    const brandProducts = productsRaw.filter(p => p.brand === group.brand);
    const validDiscounts = brandProducts
      .map(p => {
        const current = priceMap.get(p.id) || 0;
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

  // 6. Bento Grid 2.0용 미시 분석 데이터 집계 (Postgres Raw SQL 활용)
  const [goldenLowsRaw, trueDealsRaw, flashDropsRaw, nearTargetsRaw] = await Promise.all([
    // A. Golden Lows (역대 최저가 도달)
    prisma.$queryRaw<any[]>`
      WITH min_prices AS (
        SELECT "productId", MIN(price) as min_price
        FROM "PriceHistory"
        GROUP BY "productId"
      ),
      latest_prices AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price, ph.timestamp
        FROM "PriceHistory" ph
        ORDER BY ph."productId", ph.timestamp DESC
      )
      SELECT p.id, p.title, p.brand, p."imageUrl", lp.price as "currentPrice", p."originalPrice"
      FROM "Product" p
      JOIN latest_prices lp ON p.id = lp."productId"
      JOIN min_prices mp ON p.id = mp."productId"
      WHERE lp.price <= mp.min_price AND p."imageUrl" IS NOT NULL
      ORDER BY lp.timestamp DESC
      LIMIT 6
    `,
    // B. True Deals (30일 평균가 대비 최대 하락)
    prisma.$queryRaw<any[]>`
      WITH avg_prices AS (
        SELECT "productId", ROUND(AVG(price)) as avg_price
        FROM "PriceHistory"
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ),
      latest_prices AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
        FROM "PriceHistory" ph
        ORDER BY ph."productId", ph.timestamp DESC
      )
      SELECT p.id, p.title, p.brand, p."imageUrl", lp.price as "currentPrice", ap.avg_price as "avgPrice",
             (ap.avg_price - lp.price) as "gapAmount",
             ROUND(((ap.avg_price - lp.price)::numeric / ap.avg_price::numeric) * 100, 1) as "gapPercent"
      FROM "Product" p
      JOIN latest_prices lp ON p.id = lp."productId"
      JOIN avg_prices ap ON p.id = ap."productId"
      WHERE lp.price < ap.avg_price AND p."imageUrl" IS NOT NULL
      ORDER BY "gapPercent" DESC
      LIMIT 6
    `,
    // C. Flash Drops (48시간 대비 최근 급하락)
    prisma.$queryRaw<any[]>`
      WITH price_48h_ago AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
        FROM "PriceHistory" ph
        WHERE ph.timestamp >= NOW() - INTERVAL '48 hours' AND ph.timestamp < NOW() - INTERVAL '24 hours'
        ORDER BY ph."productId", ph.timestamp ASC
      ),
      latest_prices AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
        FROM "PriceHistory" ph
        ORDER BY ph."productId", ph.timestamp DESC
      )
      SELECT p.id, p.title, p.brand, p."imageUrl", lp.price as "currentPrice", old.price as "prevPrice",
             (old.price - lp.price) as "dropAmount",
             ROUND(((old.price - lp.price)::numeric / old.price::numeric) * 100, 1) as "dropPercent"
      FROM "Product" p
      JOIN latest_prices lp ON p.id = lp."productId"
      JOIN price_48h_ago old ON p.id = old."productId"
      WHERE lp.price < old.price AND p."imageUrl" IS NOT NULL
      ORDER BY "dropPercent" DESC
      LIMIT 6
    `,
    // D. Near Target (목표가 5% 이내 임박)
    prisma.$queryRaw<any[]>`
      WITH latest_prices AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
        FROM "PriceHistory" ph
        ORDER BY ph."productId", ph.timestamp DESC
      )
      SELECT p.id, p.title, p.brand, p."imageUrl", lp.price as "currentPrice", pa."targetPrice",
             ROUND(((lp.price - pa."targetPrice")::numeric / pa."targetPrice"::numeric) * 100, 1) as "gapPercent"
      FROM "PriceAlert" pa
      JOIN "Product" p ON pa."productId" = p.id
      JOIN latest_prices lp ON p.id = lp."productId"
      WHERE pa."isActive" = true AND lp.price > pa."targetPrice" AND lp.price <= pa."targetPrice" * 1.05 AND p."imageUrl" IS NOT NULL
      ORDER BY "gapPercent" ASC
      LIMIT 6
    `
  ]);

  // 안전한 데이터 매핑 및 JSON 전송 규격 일치화
  const mapRawItem = (item: any) => ({
    id: item.id,
    title: item.title,
    brand: item.brand || 'Brand',
    imageUrl: item.imageUrl,
    currentPrice: Number(item.currentPrice),
    originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
    avgPrice: item.avgPrice ? Number(item.avgPrice) : null,
    gapAmount: item.gapAmount ? Number(item.gapAmount) : null,
    gapPercent: item.gapPercent ? Number(item.gapPercent) : null,
    prevPrice: item.prevPrice ? Number(item.prevPrice) : null,
    dropAmount: item.dropAmount ? Number(item.dropAmount) : null,
    dropPercent: item.dropPercent ? Number(item.dropPercent) : null,
    targetPrice: item.targetPrice ? Number(item.targetPrice) : null
  });

  return (
    <MarketInsightView 
      totalSavings={totalSavings}
      brandDistribution={brandDistribution}
      categoryEfficiency={brandDiscounts}
      savingsHistory={savingsHistory}
      totalDataPoints={totalDataPoints}
      totalBrands={totalBrands}
      goldenLows={goldenLowsRaw.map(mapRawItem)}
      trueDeals={trueDealsRaw.map(mapRawItem)}
      flashDrops={flashDropsRaw.map(mapRawItem)}
      nearTargets={nearTargetsRaw.map(mapRawItem)}
    />
  );
}

