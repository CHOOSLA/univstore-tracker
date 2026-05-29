/**
 * 단종/삭제 상품의 /api/item/{id} 응답 패턴을 식별하기 위한 1회성 진단.
 *
 * 셀린느 토트백(122490)은 univstore 홈으로 redirect되는 것이 확인됨.
 * 정상 상품(138746 iPad)과 응답을 비교해 어떤 신호로 'Discontinued'를 감지할 수 있는지 본다.
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const SNIFF_USER_DATA = '/tmp/sniff-user-data';

async function probe() {
  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const targets = [
    { label: '단종 추정 (셀린느 토트백)', id: '122490' },
    { label: '정상 (iPad Air)', id: '138746' },
  ];

  for (const t of targets) {
    console.log(`\n=== ${t.label} - id=${t.id} ===`);
    const res = await browser.request.get(`https://www.univstore.com/api/item/${t.id}`, {
      headers: {
        Referer: `https://www.univstore.com/item/${t.id}`,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    const status = res.status();
    const headers = res.headers();
    let body;
    try { body = await res.text(); } catch (e) { body = '[read fail]'; }

    console.log(`  status: ${status}`);
    console.log(`  content-type: ${headers['content-type'] || 'n/a'}`);
    console.log(`  body length: ${body.length}`);
    console.log(`  body preview: ${body.slice(0, 200)}`);

    try {
      const json = JSON.parse(body);
      if (json && typeof json === 'object') {
        console.log(`  json keys: ${Object.keys(json).slice(0, 15).join(', ')}`);
        if ('price2' in json) console.log(`  price2: ${json.price2}`);
        if ('has_stock' in json) console.log(`  has_stock: ${json.has_stock}`);
        if ('is_deleted' in json) console.log(`  is_deleted: ${json.is_deleted}`);
        if ('status' in json) console.log(`  status field: ${json.status}`);
      }
    } catch (e) {
      console.log(`  (not valid JSON)`);
    }
  }

  await browser.close();
}

probe().catch(e => { console.error('❌', e); process.exit(1); });
