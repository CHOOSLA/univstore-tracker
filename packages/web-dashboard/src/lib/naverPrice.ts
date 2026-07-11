import { unstable_cache } from "next/cache";

// 본품이 아닌 액세서리/호환품을 최저가에서 배제
const ACCESSORY = /케이스|필름|커버|키스킨|이어팁|이어캡|보호|스킨|파우치|거치대|스트랩|강화유리|그립|악세|액세|충전기|케이블|어댑터|받침|프로텍|호환|리퍼|중고|정품기/;

export type MallPrice = { mall: string; price: number; link: string; title: string };
export type PriceComparison = { matched: boolean; items: MallPrice[]; lowest: number | null };

const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();

// 매칭 무의미 토큰(수량/포장/공용어)
const STOP = new Set(["박스", "1박스", "세트", "정품", "본품", "무료배송", "공식", "국내", "당일", "new", "단품", "구성", "브랜드", "정품기"]);

// 상품명/브랜드 → 의미있는 토큰 집합 (2자 이상, 스톱워드 제외)
function tokenize(s: string): string[] {
  return s
    .replace(/[^0-9A-Za-z가-힣]+/g, " ")
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

// code가 진짜 모델번호처럼 생겼는지 (문자 포함 필수). "40130" 같은 순수 숫자는 무의미.
function isRealCode(code: string): boolean {
  return !!code && /[A-Za-z]/.test(code) && code.replace(/[^0-9A-Za-z]/g, "").length >= 4;
}

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

// 정가 밴드 + 액세서리 제외 + 상품명 토큰 겹침 검증 + 몰별 최저가 dedup → 저렴한순 상위 N
function build(items: any[], price1: number, prodTokens: Set<string>): MallPrice[] {
  const lo = price1 * 0.5, hi = price1 * 1.35;
  const filtered = items
    .map((it) => ({ mall: it.mallName, price: Number(it.lprice), link: it.link, title: strip(it.title) }))
    .filter((m) => {
      if (m.price < lo || m.price > hi) return false;
      if (ACCESSORY.test(m.title)) return false;
      // 결과 타이틀이 상품명과 최소 1개 의미 토큰을 공유해야 함 (엉뚱한 상품 배제)
      return tokenize(m.title).some((t) => prodTokens.has(t));
    });

  const byMall = new Map<string, MallPrice>();
  for (const m of filtered) {
    const ex = byMall.get(m.mall);
    if (!ex || m.price < ex.price) byMall.set(m.mall, m);
  }
  return [...byMall.values()].sort((a, b) => a.price - b.price).slice(0, 6);
}

/**
 * 네이버 쇼핑 최저가 비교. 진짜 모델코드면 우선, 아니면(숫자뿐 등) 상품명으로.
 * 신뢰도 게이팅: 정가 밴드 + 액세서리 제외 + 상품명 토큰 겹침 + 2개 몰 이상일 때만 matched.
 * brand는 토큰 세트에 포함해 매칭 정확도 보강. 상품별 1일 캐시.
 */
export const getPriceComparison = unstable_cache(
  async (code: string, title: string, price1: number, brand?: string): Promise<PriceComparison> => {
    if (!price1 || price1 <= 0) return { matched: false, items: [], lowest: null };

    const prodTokens = new Set(tokenize(`${title} ${brand || ""}`));
    if (prodTokens.size === 0) return { matched: false, items: [], lowest: null };

    // 진짜 코드일 때만 코드 쿼리 시도, 부족하면 상품명 폴백
    let malls: MallPrice[] = isRealCode(code) ? build(await fetchNaver(code), price1, prodTokens) : [];
    if (malls.length < 2) {
      const alt = build(await fetchNaver(title.slice(0, 40)), price1, prodTokens);
      if (alt.length > malls.length) malls = alt;
    }

    return { matched: malls.length >= 2, items: malls, lowest: malls[0]?.price ?? null };
  },
  ["naver-price-comparison-v2"],
  { revalidate: 86400 }
);
