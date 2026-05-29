/**
 * 검색어에 대한 유사어/동의어 매핑 사전입니다.
 * 브랜드명, 제품군, 영문/한글 혼용 대응을 위해 사용합니다.
 */
/**
 * 한↔영 1:1 매핑만 유지. 'laptop', 'tablet', 'mobile', 'earphone' 같은
 * 광범위 단어는 brand·액세서리 카드까지 다 잡혀서 검색 noise를 만들기 때문에 제거.
 * (이전: '맥북' → 'laptop' 매칭으로 모든 노트북 액세서리가 첫 페이지에 올라옴)
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Apple
  '아이패드': ['ipad'],
  'ipad': ['아이패드'],
  '아이폰': ['iphone'],
  'iphone': ['아이폰'],
  '맥북': ['macbook'],
  'macbook': ['맥북'],
  '에어팟': ['airpods'],
  'airpods': ['에어팟'],
  '애플워치': ['apple watch'],
  'apple watch': ['애플워치'],

  // 삼성
  '갤럭시': ['galaxy'],
  'galaxy': ['갤럭시'],
  '버즈': ['buds'],
  'buds': ['버즈'],
  '지플립': ['z flip', 'flip7', 'flip6'],
  'z flip': ['지플립'],
  '지폴드': ['z fold', 'fold7', 'fold6'],
  'z fold': ['지폴드'],

  // 카테고리 (한↔영만, 일반 단어 매칭 회피)
  '노트북': ['notebook'],
  '모니터': ['monitor'],
  '청소기': ['vacuum'],
  '헤드폰': ['headphone'],
  '키보드': ['keyboard'],
  '마우스': ['mouse'],
};

/**
 * 입력된 검색어와 연관된 모든 키워드 리스트를 반환합니다.
 */
export function getSearchKeywords(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const keywords = [normalized];
  
  // 1. 단어 단위로 쪼개서 분석 (예: "삼성 갤럭시" -> ["삼성", "갤럭시"])
  const tokens = normalized.split(/\s+/);
  
  tokens.forEach(token => {
    // 각 토큰에 대해 동의어 탐색
    if (SYNONYM_MAP[token]) {
      keywords.push(...SYNONYM_MAP[token]);
    }
    
    // 부분 일치 탐색
    Object.keys(SYNONYM_MAP).forEach(key => {
      if (token.includes(key) || key.includes(token)) {
        keywords.push(...SYNONYM_MAP[key]);
      }
    });
  });

  // 중복 제거 및 너무 짧은 토큰 제외
  return Array.from(new Set(keywords)).filter(k => k.length >= 1);
}
