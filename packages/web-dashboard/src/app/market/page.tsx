import React from 'react';
import { Flame, TrendingDown, Trophy, Target, BarChart3 } from 'lucide-react';
import { prisma } from "@/lib/prisma";
import TodaysPick from "@/components/market/TodaysPick";
import DealsSection from "@/components/market/DealsSection";
import MarketPulse from "@/components/market/MarketPulse";

export const dynamic = 'force-dynamic';

export default async function MarketPage() {
  // 누적 차익은 한 번에 SQL로 (Prisma 5.22가 32k+ nested select에서 패닉)
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
  const totalCategories = 8; // taxonomy.json의 main 카테고리 수

  // 4가지 deal 섹션 데이터 동시 집계
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
    // B. True Deals (30일 중앙가 대비 최대 하락)
    // AVG → PERCENTILE_DISC(0.5)로 변경: outlier에 휘둘리지 않음
    // 추가 가드: 표본 3건 이상, 하락폭 70% 미만 (그 이상은 잘못된 originalPrice 케이스)
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
      WHERE lp.price < old.price
        AND lp.price >= 10000
        AND ((old.price - lp.price)::numeric / old.price::numeric) < 0.7
        AND p."imageUrl" IS NOT NULL
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

  const flashDrops = flashDropsRaw.map(mapRawItem);
  const trueDeals = trueDealsRaw.map(mapRawItem);
  const goldenLows = goldenLowsRaw.map(mapRawItem);
  const nearTargets = nearTargetsRaw.map(mapRawItem);

  // Hero 후보 우선순위: flash → true → golden (가장 임팩트 있는 변동을 머리에)
  const todaysPick = flashDrops[0] ?? trueDeals[0] ?? goldenLows[0] ?? null;

  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-3 text-amber-400">
            <BarChart3 size={18} />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Market</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter">Deals.</h1>
          <p className="text-zinc-500 text-base lg:text-lg max-w-2xl">
            지금 가격이 떨어진 상품, 30일 중앙값보다 싼 상품, 역대 최저가에 도달한 상품, 그리고 설정한 목표가에 임박한 상품을 한 화면에 모았습니다.
          </p>
        </header>

        <TodaysPick item={todaysPick} />

        <DealsSection
          title="Flash Drops"
          description="지난 48시간 안에 가격이 떨어진 상품"
          icon={<TrendingDown size={18} />}
          items={flashDrops}
          variant="flash"
        />

        <DealsSection
          title="True Deals"
          description="30일 중앙값보다 의미 있게 싼 상품"
          icon={<Flame size={18} />}
          items={trueDeals}
          variant="true"
        />

        <DealsSection
          title="역대 최저가"
          description="기록된 가격 중 가장 낮은 수준에 도달한 상품"
          icon={<Trophy size={18} />}
          items={goldenLows}
          variant="golden"
        />

        <DealsSection
          title="목표가 근접"
          description="내가 설정한 목표가까지 5% 이내로 들어온 상품"
          icon={<Target size={18} />}
          items={nearTargets}
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

