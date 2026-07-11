import { unstable_cache } from "next/cache";

// 본품이 아닌 액세서리/호환품을 최저가에서 배제
const ACCESSORY = /케이스|필름|커버|키스킨|이어팁|이어캡|보호|스킨|파우치|거치대|스트랩|강화유리|그립|악세|액세|충전기|케이블|어댑터|받침|프로텍|호환|리퍼|중고|정품기/;

export type MallPrice = { mall: string; price: number; link: string; title: string };
export type PriceComparison = { matched: boolean; items: MallPrice[]; lowest: number | null };

const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();

async function fetchNaver(query: string): Promise<any[]> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret || !query) return [];
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=40&sort=sim`,
      { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret } }
    );
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return [];
  }
}

// 정가 밴드 + 액세서리 제외 + 몰별 최저가 dedup → 저렴한순 상위 N
function build(items: any[], price1: number): MallPrice[] {
  const lo = price1 * 0.5, hi = price1 * 1.35;
  const filtered = items
    .map((it) => ({ mall: it.mallName, price: Number(it.lprice), link: it.link, title: strip(it.title) }))
    .filter((m) => m.price >= lo && m.price <= hi && !ACCESSORY.test(m.title));

  const byMall = new Map<string, MallPrice>();
  for (const m of filtered) {
    const ex = byMall.get(m.mall);
    if (!ex || m.price < ex.price) byMall.set(m.mall, m);
  }
  return [...byMall.values()].sort((a, b) => a.price - b.price).slice(0, 6);
}

/**
 * 네이버 쇼핑 최저가 비교. code(모델번호) 우선, 부족하면 상품명 폴백.
 * 신뢰도 게이팅: 밴드 내 본품이 2개 몰 이상일 때만 matched=true (오답 방지).
 * 상품별 1일 캐시.
 */
export const getPriceComparison = unstable_cache(
  async (code: string, title: string, price1: number): Promise<PriceComparison> => {
    if (!price1 || price1 <= 0) return { matched: false, items: [], lowest: null };

    let malls = build(await fetchNaver(code), price1);
    if (malls.length < 2) {
      const alt = build(await fetchNaver(title.slice(0, 40)), price1);
      if (alt.length > malls.length) malls = alt;
    }

    return { matched: malls.length >= 2, items: malls, lowest: malls[0]?.price ?? null };
  },
  ["naver-price-comparison"],
  { revalidate: 86400 }
);
