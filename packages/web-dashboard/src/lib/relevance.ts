/**
 * 검색 결과 relevance 점수 계산.
 *
 * 신호별 가중치 (높을수록 위에 노출):
 *   +120  title에 query phrase 그대로 포함
 *   +80   title이 query phrase로 시작 (prefix)
 *   +90   brand 완전 일치
 *   +40   brand에 query phrase 포함
 *   +60   query의 모든 token이 title에 포함
 *   +15   query token 1개가 title에 포함 (per token)
 *   +5    query token 1개가 brand에 포함 (per token)
 *   +3    synonym이 title에 포함 (per synonym, 가중치 낮음)
 *   +50   priceScore 80+ (역대 최저권 → 우선 노출 bonus)
 *   +20   현재가 originalPrice 대비 할인 중
 */

export interface Scoreable {
  title: string | null;
  brand: string | null;
  priceScore?: number | null;
  currentPrice?: number | null;
  originalPrice?: number | null;
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase();

export function relevanceScore(item: Scoreable, query: string, synonyms: string[]): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const title = norm(item.title);
  const brand = norm(item.brand);

  let score = 0;

  if (title.includes(q)) score += 120;
  if (title.startsWith(q)) score += 80;
  if (brand === q) score += 90;
  else if (brand && brand.includes(q)) score += 40;

  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  const allInTitle = tokens.length > 0 && tokens.every(t => title.includes(t));
  if (allInTitle) score += 60;

  tokens.forEach(t => {
    if (title.includes(t)) score += 15;
    if (brand.includes(t)) score += 5;
  });

  // 동의어는 낮은 가중치 (noise 방지)
  synonyms.forEach(syn => {
    const s = syn.toLowerCase();
    if (s && s !== q && !tokens.includes(s) && title.includes(s)) score += 3;
  });

  // 가격 등급 + 할인 신호 (적당한 가중치, 동률일 때 영향)
  if (typeof item.priceScore === 'number' && item.priceScore >= 80) score += 50;
  if (
    typeof item.currentPrice === 'number' &&
    typeof item.originalPrice === 'number' &&
    item.originalPrice > item.currentPrice
  ) {
    score += 20;
  }

  return score;
}
