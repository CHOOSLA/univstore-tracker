/**
 * third_code 매핑 방법을 찾기 위한 확장 sniffing 스크립트.
 *
 * 가설들:
 *  (1) third_code URL로 진입했을 때 client-side가 다른 API endpoint를 호출할 수 있다
 *  (2) SSR HTML(__NEXT_DATA__, window.__INITIAL_STATE__)에 third별 정보가 embed될 수 있다
 *  (3) 페이지 진입 후 third 메뉴 클릭 시 동적 API 호출이 발생할 수 있다
 *  (4) /api/items/category의 다른 query 형태에서 third가 작동할 수 있다 (sort 변경 등)
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const SNIFF_USER_DATA = '/tmp/sniff-user-data';

// 디지털 > 태블릿PC > 케이스 (third_code=120104) — 항목 다수 예상
const SUB_URL = 'https://www.univstore.com/category/digital?ctg_sub_code=120100';
const THIRD_URL = 'https://www.univstore.com/category/digital?ctg_sub_code=120100&ctg_third_code=120104';

async function sniff() {
  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const captureRequests = (page) => {
    const calls = [];
    page.on('request', req => {
      const u = req.url();
      if (u.includes('univstore.com') && (u.includes('/api/') || u.match(/\.(json|xml)(\?|$)/))) {
        calls.push({ method: req.method(), url: u.replace(/^https?:\/\/[^/]+/, '') });
      }
    });
    return calls;
  };

  // ===========================================
  // Scenario 1: third_code 포함 URL로 진입
  // ===========================================
  console.log('=== Scenario 1: third_code 포함 URL 진입 ===');
  const page1 = await browser.newPage();
  const calls1 = captureRequests(page1);
  await page1.goto(THIRD_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page1.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await page1.waitForTimeout(2000);

  console.log(`API 호출 ${calls1.length}건:`);
  calls1.forEach(c => console.log(`  [${c.method}] ${c.url}`));

  // HTML 안에 third 관련 데이터 검색
  const html1 = await page1.content();
  console.log(`\nHTML 크기: ${html1.length} bytes`);

  // SSR data (__NEXT_DATA__, __INITIAL_STATE__ 등) 추출
  const initialData = await page1.evaluate(() => {
    const keys = ['__NEXT_DATA__', '__INITIAL_STATE__', '__APOLLO_STATE__', '__INITIAL_PROPS__'];
    const found = {};
    for (const k of keys) {
      if (window[k]) found[k] = typeof window[k];
    }
    // <script id="__NEXT_DATA__">에서 직접 추출
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData) {
      try {
        const parsed = JSON.parse(nextData.textContent || '{}');
        found.__NEXT_DATA__parsed_keys = Object.keys(parsed);
        if (parsed.props) found.__NEXT_DATA__props_keys = Object.keys(parsed.props);
      } catch (e) { found.__NEXT_DATA__parseError = e.message; }
    }
    return found;
  });
  console.log(`\nSSR data hooks:`, JSON.stringify(initialData, null, 2));

  // HTML 안에 ctg_third_code 패턴이 데이터로 embed되어 있는지
  const thirdRefs = (html1.match(/ctg_third_code/g) || []).length;
  const itemRefs = (html1.match(/\/item\/\d+/g) || []).length;
  console.log(`\nHTML 내 ctg_third_code 등장: ${thirdRefs}회`);
  console.log(`HTML 내 /item/ 링크: ${itemRefs}개`);

  await page1.close();

  // ===========================================
  // Scenario 2: sub_code only vs third_code 응답 차이
  // ===========================================
  console.log('\n=== Scenario 2: sub vs third URL 응답 상품 비교 ===');
  const subPage = await browser.newPage();
  await subPage.goto(SUB_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await subPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await subPage.waitForTimeout(2000);
  const subIds = await subPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
    return [...new Set(links.map(a => a.href.match(/\/item\/(\d+)/)?.[1]).filter(Boolean))];
  });
  await subPage.close();

  const thirdPage = await browser.newPage();
  await thirdPage.goto(THIRD_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await thirdPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
  await thirdPage.waitForTimeout(2000);
  const thirdIds = await thirdPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
    return [...new Set(links.map(a => a.href.match(/\/item\/(\d+)/)?.[1]).filter(Boolean))];
  });
  await thirdPage.close();

  console.log(`sub만:        ${subIds.length}개`);
  console.log(`third까지:    ${thirdIds.length}개`);
  console.log(`교집합:       ${thirdIds.filter(x => subIds.includes(x)).length}개`);
  console.log(`third만 (sub에 없음): ${thirdIds.filter(x => !subIds.includes(x)).length}개`);
  console.log(`sub에서 third 페이지에 없어진 것: ${subIds.length - thirdIds.length}개`);

  if (thirdIds.length > 0 && thirdIds.length < subIds.length) {
    console.log('\n→ third 페이지는 sub의 부분집합. URL 기반 SSR 필터링이 작동 중!');
  }

  // ===========================================
  // Scenario 3: API의 다른 호출 형태들 시도
  // ===========================================
  console.log('\n=== Scenario 3: 다른 API 호출 변종 시도 ===');
  const variants = [
    'https://www.univstore.com/api/items/category/digital?ctg_third_code=120104&sort=recommend&offset=0&limit=10',
    'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120100&ctg_third_code=120104&offset=0&limit=10',
    'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120100&ctg_third_code=120104&sort=latest&offset=0&limit=10',
    'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120100&ctg_third_code=120104',
    'https://www.univstore.com/api/items?ctg_sub_code=120100&ctg_third_code=120104&limit=10',
    'https://www.univstore.com/api/items/third/120104?limit=10',
  ];
  for (const url of variants) {
    const res = await browser.request.get(url, {
      headers: {
        'Referer': THIRD_URL,
        'Sec-Fetch-Site': 'same-origin',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    let body;
    try { body = await res.text(); } catch (e) { body = '[parse fail]'; }
    let summary;
    try {
      const json = JSON.parse(body);
      if (Array.isArray(json)) summary = `Array(${json.length}) firstId=${json[0]?.id}`;
      else if (json && typeof json === 'object') summary = `Object keys=[${Object.keys(json).slice(0,6).join(',')}]`;
      else summary = `Other: ${JSON.stringify(json).slice(0, 80)}`;
    } catch (e) {
      summary = `text: ${body.slice(0, 60)}`;
    }
    console.log(`  [${res.status()}] ${url.replace(/^https?:\/\/[^/]+/, '')}`);
    console.log(`         → ${summary}`);
  }

  await browser.close();
}

sniff().catch(e => { console.error('❌', e); process.exit(1); });
