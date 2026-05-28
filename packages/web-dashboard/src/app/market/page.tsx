import React from 'react';
import { Flame, TrendingDown, Trophy, Target, BarChart3 } from 'lucide-react';
import { prisma } from "@/lib/prisma";
import TodaysPick from "@/components/market/TodaysPick";
import DealsSection from "@/components/market/DealsSection";
import MarketPulse from "@/components/market/MarketPulse";
import BrandDefenseBanner from "@/components/market/BrandDefenseBanner";

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  // 1. 누적 차익 SQL 연산
  const [savingsRow] = await prisma.$queryRaw<{ sum: number | null }[]>`
    WITH latest AS (
      SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
      FROM "PriceHistory" ph ORDER BY ph."productId", ph.timestamp DESC
    )
    SELECT COALESCE(SUM(p."originalPrice" - latest.price), 0)::bigint AS sum
    FROM "Product" p
    JOIN latest ON latest."productId" = p.id
    WHERE p."originalPrice" > latest.price
  `;
  const totalSavings = Number(savingsRow?.sum ?? 0);

  const totalProducts = await prisma.product.count();
  const activeAlerts = await prisma.priceAlert.count({ where: { isActive: true } });
  const totalCategories = 8;

  // 2. 프리미엄 브랜드 가격 장벽 붕괴 쿼리 (Apple, Samsung, Sony, LG, Dell 대상 30일 평균 대비 8% 이상 폭락 상품)
  const brandDefenseRaw = await prisma.$queryRaw<any[]>`
    WITH median_prices AS (
      SELECT "productId", PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY price) AS median_price
      FROM "PriceHistory"
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY "productId"
    ),
    latest_prices AS (
      SELECT DISTINCT ON (ph."productId") ph."productId", ph.price, ph.timestamp
      FROM "PriceHistory" ph ORDER BY ph."productId", ph.timestamp DESC
    )
    SELECT p.id, p.title, p.brand, p."imageUrl", lp.price as "currentPrice",
           mp.median_price as "avgPrice",
           ROUND(((mp.median_price - lp.price)::numeric / mp.median_price::numeric) * 100, 1) as "gapPercent"
    FROM "Product" p
    JOIN latest_prices lp ON p.id = lp."productId"
    JOIN median_prices mp ON p.id = mp."productId"
    WHERE p.brand IN ('Apple', 'Apple(애플)', 'Samsung', 'Samsung(삼성)', '삼성전자', '삼성', 'LG', 'LG전자', 'Sony', '소니', 'Dell', '델', 'HP', 'Lenovo', '레노버', 'Asus', '에이수스', 'Logitech', '로지텍', 'Intel', 'AMD', 'Nvidia')
      AND lp.price < mp.median_price * 0.92
      AND p."imageUrl" IS NOT NULL
    ORDER BY "gapPercent" DESC
    LIMIT 12
  `;


  // 4. 기존 3대 핵심 핫딜 섹션 및 커뮤니티 공동 저격(Most Hunted) 상품 집계
  const [goldenLowsRaw, trueDealsRaw, flashDropsRaw, mostHuntedRaw] = await Promise.all([
    // A. Golden Lows (역대 최저가 도달)
    prisma.$queryRaw<any[]>`
      WITH min_prices AS (
        SELECT "productId", 
               MIN(price) as min_price,
               MAX(price) as max_price
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
      WHERE lp.price <= mp.min_price 
        AND mp.max_price > mp.min_price
        AND p."imageUrl" IS NOT NULL
      ORDER BY lp.timestamp DESC
      LIMIT 12
    `,
    // B. True Deals (30일 중앙값 대비 최대 하락)
    prisma.$queryRaw<any[]>`
      WITH median_prices AS (
        SELECT "productId",
               PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
               COUNT(*) AS samples
        FROM "PriceHistory"
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ),
      latest_prices AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
        FROM "PriceHistory" ph
        ORDER BY ph."productId", ph.timestamp DESC
      )
      SELECT p.id, p.title, p.brand, p."imageUrl",
             lp.price as "currentPrice",
             mp.median_price as "avgPrice",
             (mp.median_price - lp.price) as "gapAmount",
             ROUND(((mp.median_price - lp.price)::numeric / mp.median_price::numeric) * 100, 1) as "gapPercent"
      FROM "Product" p
      JOIN latest_prices lp ON p.id = lp."productId"
      JOIN median_prices mp ON p.id = mp."productId"
      WHERE mp.samples >= 5
        AND lp.price < mp.median_price
        AND lp.price >= 10000
        AND ((mp.median_price - lp.price)::numeric / mp.median_price::numeric) < 0.6
        AND p."imageUrl" IS NOT NULL
      ORDER BY "gapPercent" DESC
      LIMIT 12
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
      WHERE lp.price < old.price
        AND lp.price >= 10000
        AND ((old.price - lp.price)::numeric / old.price::numeric) < 0.7
        AND p."imageUrl" IS NOT NULL
      ORDER BY "dropPercent" DESC
      LIMIT 12
    `,
    // D. Most Hunted (전체 사용자 알림 최다 등록 저격 상품)
    prisma.$queryRaw<any[]>`
      WITH alert_counts AS (
        SELECT "productId", COUNT(*)::int as alerts_count
        FROM "PriceAlert"
        WHERE "isActive" = true
        GROUP BY "productId"
      ),
      latest_prices AS (
        SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
        FROM "PriceHistory" ph
        ORDER BY ph."productId", ph.timestamp DESC
      )
      SELECT p.id, p.title, p.brand, p."imageUrl", lp.price as "currentPrice", ac.alerts_count as "targetPrice"
      FROM "Product" p
      JOIN latest_prices lp ON p.id = lp."productId"
      JOIN alert_counts ac ON p.id = ac."productId"
      WHERE p."imageUrl" IS NOT NULL
      ORDER BY ac.alerts_count DESC
      LIMIT 12
    `
  ]);

  // 5. 최근 7일 가격 이력 쿼리
  const allProductIds = Array.from(new Set([
    ...flashDropsRaw.map(p => p.id),
    ...trueDealsRaw.map(p => p.id),
    ...goldenLowsRaw.map(p => p.id),
    ...mostHuntedRaw.map(p => p.id),
    ...brandDefenseRaw.map(p => p.id)
  ]));

  const histories = allProductIds.length > 0 ? await prisma.priceHistory.findMany({
    where: {
      productId: { in: allProductIds },
      timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { timestamp: 'asc' },
    select: {
      productId: true,
      price: true
    }
  }) : [];

  // productId별 가격 배열 매핑
  const historyMap: Record<string, number[]> = {};
  histories.forEach(h => {
    if (!historyMap[h.productId]) {
      historyMap[h.productId] = [];
    }
    historyMap[h.productId].push(Number(h.price));
  });

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
    targetPrice: item.targetPrice ? Number(item.targetPrice) : null,
    history: historyMap[item.id] || []
  });

  const flashDrops = flashDropsRaw.map(mapRawItem);
  const trueDeals = trueDealsRaw.map(mapRawItem);
  const goldenLows = goldenLowsRaw.map(mapRawItem);
  const mostHunted = mostHuntedRaw.map(mapRawItem);
  const brandDefense = brandDefenseRaw.map(mapRawItem);

  const todaysPick = flashDrops[0] ?? trueDeals[0] ?? goldenLows[0] ?? null;

  return (
    <div className="pb-24 bg-zinc-950 text-zinc-100 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-10 space-y-12">
        <header className="space-y-4 border-b border-white/5 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6 px-2">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-amber-500">
              <BarChart3 size={16} />
              <span className="text-xs font-black uppercase tracking-[0.25em]">Market Data Pulse</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-none">
              Deals.
            </h1>
            <p className="text-zinc-300 text-sm md:text-base font-medium max-w-3xl leading-relaxed mt-2">
              수집된 가격 통계를 기반으로 진짜 가치가 확인된 타겟 하락 상품 정보를 실시간 데이터 콘솔 형식으로 제공합니다.
            </p>
          </div>
        </header>

        {/* 1. 프리미엄 브랜드 가격 붕괴 경보 배너 (Glass/Red 그라데이션) */}
        <BrandDefenseBanner items={brandDefense} />

        {/* 오늘의 베스트 추천 딜 (Hero 섹션) */}
        <TodaysPick item={todaysPick} />

        {/* 3. 기존의 핵심 3대 핫딜 그리드 섹션 */}
        <DealsSection
          title="Flash Drops"
          description="최근 1~2일 사이에 갑자기 가격이 뚝 떨어진 반짝 할인 상품"
          icon={<TrendingDown size={16} />}
          items={flashDrops}
          variant="flash"
        />

        <DealsSection
          title="True Deals"
          description="지난 한 달 평균 가격보다 확실히 싸진 진짜 가성비 상품"
          icon={<Flame size={16} />}
          items={trueDeals}
          variant="true"
        />

        <DealsSection
          title="역대 최저가"
          description="수집된 데이터 중 가격이 가장 낮아진 역대급 최저가 찬스"
          icon={<Trophy size={16} />}
          items={goldenLows}
          variant="golden"
        />

        {/* 4. 최다 알림 등록 "Most Hunted" 저격 섹션 */}
        <DealsSection
          title="Most Hunted"
          description="사람들이 가격이 떨어지길 가장 많이 기다리는 인기 저격 상품"
          icon={<Target size={16} />}
          items={mostHunted}
          variant="target"
        />

        <MarketPulse
          totalProducts={totalProducts}
          activeAlerts={activeAlerts}
          totalCategories={totalCategories}
          totalSavings={totalSavings}
        />
      </main>
    </div>
  );
}
