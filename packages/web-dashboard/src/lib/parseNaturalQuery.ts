/**
 * 자연어 검색 파서.
 *
 * 입력 예시:
 *   "10만원 이하 무선 이어폰" → { maxPrice: 100000, keywords: "무선 이어폰" }
 *   "5~10만 의자"              → { minPrice: 50000, maxPrice: 100000, keywords: "의자" }
 *   "Apple 30% 할인"           → { minDropPercent: 30, keywords: "Apple" }
 *   "역대최저 키보드"           → { onlyGoldenLow: true, keywords: "키보드" }
 *
 * regex 토큰을 우선 추출 후 남은 텍스트를 keyword query로 위임.
 */

export interface ParsedQuery {
  minPrice?: number;
  maxPrice?: number;
  minDropPercent?: number;
  onlyGoldenLow?: boolean;
  /** 잔여 키워드(공백 정리). 없으면 빈 문자열 */
  keywords: string;
  /** 사용자에게 보여줄 인식된 필터 라벨 */
  detected: string[];
}

const NUM = (s: string) => parseInt(s.replace(/[, ]/g, ''), 10);

/**
 * "10만", "10만원", "100000원" 등을 정수로.
 * 단위가 만이면 ×10000. 원 단위는 그대로.
 */
function tokenToWon(numStr: string, unit: string | undefined): number {
  const n = NUM(numStr);
  if (unit && unit.includes('만')) return n * 10000;
  return n;
}

export function parseNaturalQuery(input: string): ParsedQuery {
  let text = ' ' + input.trim() + ' ';
  const detected: string[] = [];
  const out: ParsedQuery = { keywords: '', detected };

  // 1. 가격 범위 "5~10만", "5만 ~ 10만", "5-10만" → minPrice + maxPrice
  text = text.replace(
    /\s(\d[\d,]*)\s*(만)?\s*(?:[~–\-])\s*(\d[\d,]*)\s*(만원?|원)?\s/g,
    (_, a, ua, b, ub) => {
      const unitA = ua || (ub && ub.includes('만') ? '만' : '');
      const unitB = ub || (ua ? '만' : '');
      out.minPrice = tokenToWon(a, unitA);
      out.maxPrice = tokenToWon(b, unitB);
      detected.push(`₩${out.minPrice.toLocaleString()} ~ ₩${out.maxPrice.toLocaleString()}`);
      return ' ';
    }
  );

  // 2. "N만원 이하/미만/아래" → maxPrice
  if (out.maxPrice === undefined) {
    text = text.replace(
      /\s(\d[\d,]*)\s*(만원?|원)\s*(이하|미만|아래)\s/g,
      (_, n, unit) => {
        out.maxPrice = tokenToWon(n, unit);
        detected.push(`₩${out.maxPrice.toLocaleString()} 이하`);
        return ' ';
      }
    );
  }

  // 3. "N만원 이상/초과/위" → minPrice
  if (out.minPrice === undefined) {
    text = text.replace(
      /\s(\d[\d,]*)\s*(만원?|원)\s*(이상|초과|위)\s/g,
      (_, n, unit) => {
        out.minPrice = tokenToWon(n, unit);
        detected.push(`₩${out.minPrice.toLocaleString()} 이상`);
        return ' ';
      }
    );
  }

  // 4. "N% 할인/하락/드롭" → minDropPercent
  text = text.replace(
    /\s(\d+)\s*%\s*(?:할인|하락|드롭|세일|off)\s/gi,
    (_, n) => {
      out.minDropPercent = parseInt(n, 10);
      detected.push(`${out.minDropPercent}%↓`);
      return ' ';
    }
  );

  // 5. "역대최저", "역대최고가", "최저가" → onlyGoldenLow
  if (/\s(역대\s*최저|역대급|최저가|역대\s*최저가)\s/.test(text)) {
    out.onlyGoldenLow = true;
    detected.push('역대 최저');
    text = text.replace(/\s(역대\s*최저|역대급|최저가|역대\s*최저가)\s/g, ' ');
  }

  out.keywords = text.replace(/\s+/g, ' ').trim();
  return out;
}
