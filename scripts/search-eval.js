/**
 * 검색 품질 회귀 게이트 (골든 질의셋).
 *
 * 실서비스 /products?q= 를 헤드리스로 때려 top-N 상품명을 뽑고,
 * 질의별 기대 패턴(must: top3 안에 있어야 함 / ban: top5에 나오면 안 됨)을 검사한다.
 * 검색 로직(임베딩·스코프·디부스트·정렬)을 바꿀 때마다 before/after로 돌려 회귀를 잡는다.
 *
 * 사용: node scripts/search-eval.js [BASE_URL]
 * 종료코드: 실패 있으면 1 (CI 게이트 가능)
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const BASE = process.argv[2] || 'https://choouniv.duckdns.org';

// must: top3 중 하나라도 매칭해야 통과. ban: top5에 매칭 있으면 실패.
const GOLDEN = [
  { q: '에어팟',        must: /airpods\s*(pro|max|4)/i,            ban: /케이스|파우치|커버|필름/ },
  { q: 'airpods',      must: /airpods\s*(pro|max|4)/i,            ban: /케이스|파우치|커버|필름/ },
  { q: '에어팟 케이스',  must: /에어팟.*(케이스|범퍼)/,               ban: /애플워치|아이폰/ },
  { q: '노트북',        must: /노트북|그램|omnibook|elitebook/i,     ban: /거치대|스탠드|파우치|가방|필름/ },
  { q: '가벼운 노트북',  must: /노트북|그램|omnibook/i,              ban: /거치대|스탠드|파우치|가방/ },
  { q: '노트북 파우치',  must: /파우치|슬리브|sleeve/i,              ban: null },
  { q: '무선 마우스',    must: /마우스/,                             ban: /장패드|손목/ },
  { q: '기계식 키보드',  must: /기계식.*키보드|키보드.*(축|스위치)/,   ban: /키캡|손목/ },
  { q: '아이패드',      must: /아이패드|ipad/i,                     ban: /필름|강화유리|케이스/ },
  { q: '맥북',          must: /맥북|macbook/i,                     ban: /파우치|케이스|필름|허브/ },
  { q: '갤럭시 버즈',    must: /버즈|buds/i,                        ban: /케이스|이어팁/ },
  { q: '아이폰 케이스',  must: /아이폰.*케이스|iphone.*케이스/i,      ban: /에어팟|애플워치|아이패드/ },
  { q: '모니터',        must: /모니터|monitor/i,                    ban: /받침|암\b|스탠드|거치/ },
  { q: '충전기',        must: /충전기|충전 어댑터|어댑터/,            ban: null },
];

(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  let fail = 0;
  const lines = [];

  for (const { q, must, ban } of GOLDEN) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/products?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1800));
    const titles = await p.locator('a[href*="/product/"] p.line-clamp-2, a[href*="/product/"] p.font-black')
      .allTextContents().catch(() => []);
    await p.close();

    const top3 = titles.slice(0, 3), top5 = titles.slice(0, 5);
    const mustOk = top3.some(t => must.test(t));
    const banHit = ban ? top5.find(t => ban.test(t)) : undefined;
    const ok = mustOk && !banHit;
    if (!ok) fail++;
    lines.push(
      `${ok ? '✅' : '❌'} [${q}]` +
      (mustOk ? '' : ` must미충족(top3: ${top3.map(t => t.slice(0, 18)).join(' | ')})`) +
      (banHit ? ` ban검출("${banHit.slice(0, 30)}")` : '')
    );
  }

  await b.close();
  console.log(lines.join('\n'));
  console.log(`\n결과: ${GOLDEN.length - fail}/${GOLDEN.length} 통과`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(2); });
