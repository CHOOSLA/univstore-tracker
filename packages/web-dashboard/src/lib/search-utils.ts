/**
 * 검색어에 대한 유사어/동의어 매핑 사전입니다.
 * 브랜드명, 제품군, 영문/한글 혼용 대응을 위해 사용합니다.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Apple 제품군
  '아이패드': ['ipad', 'tablet'],
  'ipad': ['아이패드', 'tablet'],
  '아이폰': ['iphone', 'mobile'],
  'iphone': ['아이폰', 'mobile'],
  '맥북': ['macbook', 'laptop'],
  'macbook': ['맥북', 'laptop'],
  '에어팟': ['airpods', 'earphone'],
  'airpods': ['에어팟', 'earphone'],
  '맥': ['mac', 'apple'],
  '워치': ['watch', 'apple watch'],
  
  // 삼성 제품군
  '갤럭시': ['galaxy', 'samsung'],
  'galaxy': ['갤럭시', 'samsung'],
  '버즈': ['buds', 'galaxy buds'],
  'buds': ['버즈', 'galaxy buds'],
  '탭': ['tab', 'tablet'],
  'tab': ['탭', 'tablet'],
  '지플립': ['z flip', 'flip'],
  'z flip': ['지플립', 'flip'],
  '지폴드': ['z fold', 'fold'],
  'z fold': ['지폴드', 'fold'],

  // 카테고리/기타
  '노트북': ['laptop', 'notebook'],
  'laptop': ['노트북', 'notebook'],
  '모니터': ['monitor', 'display'],
  'monitor': ['모니터', 'display'],
  '청소기': ['vacuum', 'cleaner'],
  '헤드폰': ['headphone', 'headset'],
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
