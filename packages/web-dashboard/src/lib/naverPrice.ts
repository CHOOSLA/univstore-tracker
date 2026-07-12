import { unstable_cache } from "next/cache";

export type MallPrice = { mall: string; price: number; link: string; title: string; sim?: number };
export type PriceComparison = { matched: boolean; items: MallPrice[]; lowest: number | null };

const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();

// 상품명에서 마케팅 접두/괄호문구 제거 ([리뷰 이벤트]/(사은품 증정)/【단독】 등) → 쿼리·임베딩 오염 방지
const cleanTitle = (s: string) =>
  s.replace(/[\[\(【][^\]\)】]*[\]\)】]/g, " ").replace(/\s+/g, " ").trim();

// 검색어에서 빼는 일반명사·색상(핵심 모델 토큰만 남겨 recall↑). 매칭 판정은 임베딩이 담당.
const GENERIC = new Set([
  "블루투스", "무선", "유선", "이어폰", "헤드폰", "이어버드", "노트북", "태블릿", "스마트폰",
  "모니터", "키보드", "마우스", "충전기", "케이블", "스피커", "정품", "공식", "모델", "단품", "세트",
  "블랙", "화이트", "실버", "골드", "그레이", "그라파이트", "블루", "레드", "퍼플", "핑크",
  "그린", "네이비", "베이지", "브라운", "옐로우", "로즈", "미드나이트", "박스", "1박스",
]);

function tokenize(s: string): string[] {
  return s.replace(/[^0-9A-Za-z가-힣]+/g, " ").split(/\s+/).map((t) => t.toLowerCase()).filter((t) => t.length >= 2);
}

// 진짜 모델번호처럼 생겼는지(문자 포함 필수). "40130" 같은 순수 숫자는 무의미.
function isRealCode(code: string): boolean {
  return !!code && /[A-Za-z]/.test(code) && code.replace(/[^0-9A-Za-z]/g, "").length >= 4;
}

// 브랜드 + 핵심 모델 토큰(색상/일반명사 제거) → 짧은 검색어
function buildQuery(title: string, brand?: string): string {
  const toks = tokenize(title).filter((t) => !GENERIC.has(t)).slice(0, 5);
  const parts = [(brand || "").toLowerCase(), ...toks].filter(Boolean);
  return [...new Set(parts)].join(" ").trim();
}

async function fetchNaver(query: string): Promise<any[]> {
  const id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret || !query) return [];
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=30&sort=sim`,
      { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret } });
    if (!res.ok) return [];
    return (await res.json()).items || [];
  } catch { return []; }
}

// 임베딩 서비스로 상품명 의미 유사도 리랭크
async function rerank(query: string, candidates: string[]): Promise<number[]> {
  const url = process.env.EMBED_URL;
  if (!url || candidates.length === 0) return [];
  try {
    const res = await fetch(`${url}/rerank`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, candidates }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return (await res.json()).scores || [];
  } catch { return []; }
}

const MIN_SIM = 0.62;   // 최고 유사도가 이보다 낮으면 매칭 실패(숨김)
const MARGIN = 0.12;    // 최고점 대비 이 안쪽만 같은 상품으로 인정(3 vs 4 세대 오염 방지)

// 가격을 크게 바꾸는 사양 토큰(용량/화면크기/RAM 등)을 정규화 추출. 변형(256 vs 512) 구분용.
function specTokens(title: string): string[] {
  const specs: string[] = [];
  const up = title.toUpperCase();
  for (const m of up.matchAll(/(\d+)\s?(TB|GB)\b/g)) specs.push(m[1] + m[2]);          // 256GB, 1TB
  for (const m of title.matchAll(/(\d+(?:\.\d+)?)\s?(인치|INCH|"|cm)/gi)) {
    const unit = /인치|inch|"/i.test(m[2]) ? "IN" : "CM";
    specs.push(m[1].replace(/\.0$/, "") + unit);                                        // 13인치→13IN
  }
  return [...new Set(specs)];
}

export const getPriceComparison = unstable_cache(
  async (code: string, rawTitle: string, currentPrice: number, originalPrice: number, brand?: string): Promise<PriceComparison> => {
    const base = Math.max(currentPrice || 0, originalPrice || 0);
    if (base <= 0) return { matched: false, items: [], lowest: null };
    const lo = Math.min(currentPrice || base, originalPrice || base) * 0.5;
    const hi = base * 1.4;
    const title = cleanTitle(rawTitle); // 마케팅 접두/괄호 제거한 상품명으로 쿼리·임베딩

    // 후보 수집: 진짜 모델코드가 있으면 코드 쿼리 우선(가장 특이적). 부족하면 상품명 쿼리로 보강.
    const codeQuery = isRealCode(code) ? [(brand || "").toLowerCase(), code].filter(Boolean).join(" ") : "";
    const raw = await fetchNaver(codeQuery || buildQuery(title, brand));
    if (raw.length < 8) raw.push(...(await fetchNaver(buildQuery(title, brand))));

    // 가격 밴드로 1차 축소(액세서리·엉뚱 가격 제거)
    const seen = new Set<string>();
    const cands = raw
      .map((it) => ({ mall: it.mallName, price: Number(it.lprice), link: it.link, title: strip(it.title) }))
      .filter((m) => m.price >= lo && m.price <= hi)
      .filter((m) => { const k = m.title + m.mall; if (seen.has(k)) return false; seen.add(k); return true; });

    if (cands.length === 0) return { matched: false, items: [], lowest: null };

    // 임베딩 유사도 리랭크
    const scores = await rerank(title, cands.map((c) => c.title));
    if (scores.length !== cands.length) return { matched: false, items: [], lowest: null };
    cands.forEach((c, i) => (c.sim = scores[i]));

    const topSim = Math.max(...scores);
    if (topSim < MIN_SIM) return { matched: false, items: [], lowest: null };

    // 최고점 근접(같은 상품 클러스터)만 유지
    const keepThreshold = Math.max(MIN_SIM, topSim - MARGIN);
    let kept = cands.filter((c) => (c.sim ?? 0) >= keepThreshold);

    // 사양 게이팅: 상품에 용량/크기 스펙이 있으면 후보도 동일 스펙만(256 vs 512 등 변형 오염 방지).
    // 단, 스펙을 명시한 후보가 하나도 없으면(리콜 0) 게이팅 생략.
    const wantSpecs = specTokens(title);
    if (wantSpecs.length > 0) {
      const specMatched = kept.filter((c) => {
        const cs = specTokens(c.title);
        return cs.length > 0 && wantSpecs.every((s) => cs.includes(s));
      });
      if (specMatched.length > 0) kept = specMatched;
    }

    // 코드 게이팅: 진짜 모델코드가 후보 타이틀에 그대로 있으면 그것만(정확 모델/변형 확정).
    // 코드 색상/용량 suffix(예 NJ0200-50L)까지 일치시켜 -50M/-50X 등 변형 오염 차단.
    if (isRealCode(code)) {
      const norm = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, "");
      const nc = norm(code);
      const codeMatched = kept.filter((c) => norm(c.title).includes(nc));
      if (codeMatched.length > 0) kept = codeMatched;
    }

    // 몰별 최저가 dedup → 저렴한순
    const byMall = new Map<string, MallPrice>();
    for (const c of kept) {
      const ex = byMall.get(c.mall);
      if (!ex || c.price < ex.price) byMall.set(c.mall, c);
    }
    const items = [...byMall.values()].sort((a, b) => a.price - b.price).slice(0, 6);

    return { matched: items.length >= 1, items, lowest: items[0]?.price ?? null };
  },
  ["naver-price-embed-v4"],
  { revalidate: 86400 }
);
