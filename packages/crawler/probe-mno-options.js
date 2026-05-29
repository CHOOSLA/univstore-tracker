/**
 * 통신사(mno) 상품의 옵션 구조 진단.
 * - /api/mno/item/{id} 응답에서 옵션이 어떻게 표현되는지 확인
 * - 색상/용량/통신사/약정/요금제 같은 다축 옵션이 가격 차이를 만드는지
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function probe() {
  const browser = await chromium.launchPersistentContext('/tmp/sniff-user-data', {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const headers = { Referer: 'https://www.univstore.com/', 'X-Requested-With': 'XMLHttpRequest' };

  for (const id of ['94538']) {
    console.log(`\n========== mno item ${id} ==========`);
    const res = await browser.request.get(`https://www.univstore.com/api/mno/item/${id}`, { headers });
    const json = await res.json();

    // 상위 키 출력
    console.log('top-level keys:');
    Object.keys(json).sort().forEach(k => {
      const v = json[k];
      const t = Array.isArray(v) ? `array[${v.length}]` : typeof v;
      console.log(`  ${k}: ${t}`);
    });

    // option/spec/plan/carrier 관련 필드 추출
    console.log('\nrelevant fields:');
    for (const k of Object.keys(json)) {
      if (/option|plan|carrier|telecom|spec|variant|color|capacity|sku/i.test(k)) {
        const v = json[k];
        const preview = JSON.stringify(v).slice(0, 200);
        console.log(`  ${k}: ${preview}`);
      }
    }

    // 가격 관련 필드
    console.log('\nprice-ish fields:');
    for (const k of Object.keys(json)) {
      if (/price|amount|cost|discount/i.test(k)) {
        console.log(`  ${k}: ${JSON.stringify(json[k]).slice(0,150)}`);
      }
    }

    // 1단계 깊이로 객체/배열을 살짝 들여다보기
    console.log('\nnested option-like structures (depth 1):');
    for (const k of Object.keys(json)) {
      const v = json[k];
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
        console.log(`  ${k}[0] keys: ${Object.keys(v[0]).join(', ')}`);
      }
    }
  }

  await browser.close();
}

probe().catch(e => { console.error(e); process.exit(1); });
