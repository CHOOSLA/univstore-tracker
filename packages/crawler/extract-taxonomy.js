/**
 * univstore.com 메인 페이지에서 공식 8 × N × M 카테고리 트리를 추출하여
 * taxonomy.json으로 저장합니다.
 *
 * 사용법: node extract-taxonomy.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MAIN_SLUGS = ['digital', 'computer', 'electronic', 'smartphone', 'beauty', 'fashion', 'fashionacc', 'lifestyle'];
const MAIN_NAMES = {
  digital: '디지털',
  computer: '컴퓨터',
  electronic: '가전',
  smartphone: '스마트폰',
  beauty: '뷰티',
  fashion: '패션',
  fashionacc: '패션잡화',
  lifestyle: '라이프스타일',
};

async function extractTaxonomy() {
  console.log('🌳 univstore.com 메뉴 트리 추출 시작...');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await ctx.newPage();

  await page.goto('https://www.univstore.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 메가메뉴가 hover 시에만 렌더링되는 경우를 대비해 모든 a 태그를 즉시 수확
  const tree = await page.evaluate(({ MAIN_SLUGS, MAIN_NAMES }) => {
    const result = {};
    for (const slug of MAIN_SLUGS) {
      result[slug] = { name: MAIN_NAMES[slug], slug, subs: {} };
    }

    const anchors = Array.from(document.querySelectorAll('a[href*="/category/"]'));
    for (const a of anchors) {
      let url;
      try {
        url = new URL(a.href);
      } catch (e) { continue; }
      const pathSlug = url.pathname.replace(/^\/category\//, '').replace(/\/$/, '');
      if (!result[pathSlug]) continue;

      const subCode = url.searchParams.get('ctg_sub_code');
      const thirdCode = url.searchParams.get('ctg_third_code');
      const text = (a.innerText || a.textContent || '').trim();

      if (!subCode) continue; // 메인 자체 링크는 무시
      if (!text) continue;    // 텍스트 없는 링크는 무시 (이미지 only 등)

      if (!result[pathSlug].subs[subCode]) {
        result[pathSlug].subs[subCode] = { name: '', thirds: {} };
      }

      if (thirdCode) {
        if (!result[pathSlug].subs[subCode].thirds[thirdCode]) {
          result[pathSlug].subs[subCode].thirds[thirdCode] = text;
        }
      } else {
        // 같은 subCode를 가진 무자식 링크 → 2차 분류 자체 텍스트
        if (!result[pathSlug].subs[subCode].name) {
          result[pathSlug].subs[subCode].name = text;
        }
      }
    }
    return result;
  }, { MAIN_SLUGS, MAIN_NAMES });

  await browser.close();

  // 통계 출력
  let totalSubs = 0;
  let totalThirds = 0;
  console.log('\n📊 추출 결과');
  for (const slug of MAIN_SLUGS) {
    const m = tree[slug];
    const subCount = Object.keys(m.subs).length;
    let thirdCount = 0;
    for (const sc in m.subs) thirdCount += Object.keys(m.subs[sc].thirds).length;
    totalSubs += subCount;
    totalThirds += thirdCount;
    console.log(`  ${m.name.padEnd(8)} (${slug.padEnd(12)}) → sub ${String(subCount).padStart(3)}개, third ${String(thirdCount).padStart(3)}개`);
  }
  console.log(`\n  total: 8 main / ${totalSubs} sub / ${totalThirds} third\n`);

  const outPath = path.join(__dirname, 'taxonomy.json');
  fs.writeFileSync(outPath, JSON.stringify(tree, null, 2));
  console.log(`💾 저장 완료: ${outPath}`);
}

extractTaxonomy().catch(err => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
