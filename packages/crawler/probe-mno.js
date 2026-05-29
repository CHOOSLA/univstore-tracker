/**
 * mno 카테고리 상품의 API endpoint 패턴 진단.
 * 94538은 /item/{id}에서는 redirect되지만 /mno/item/{id}에서는 정상 표시됨.
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

  const tests = [
    { label: '단종 추정 일반 /api/item/94538', url: 'https://www.univstore.com/api/item/94538' },
    { label: 'mno API /api/mno/item/94538',    url: 'https://www.univstore.com/api/mno/item/94538' },
    { label: 'mno API /api/mno/items/94538',   url: 'https://www.univstore.com/api/mno/items/94538' },
    { label: '단종 추정 일반 /api/item/122490', url: 'https://www.univstore.com/api/item/122490' },
    { label: 'mno API /api/mno/item/122490 (정말 단종인지)', url: 'https://www.univstore.com/api/mno/item/122490' },
  ];

  for (const t of tests) {
    const res = await browser.request.get(t.url, {
      headers: {
        Referer: 'https://www.univstore.com/',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 15000,
    });
    let body;
    try { body = await res.text(); } catch (e) { body = '[read fail]'; }
    let summary = `len=${body.length}`;
    try {
      const json = JSON.parse(body);
      if (json && typeof json === 'object') {
        summary += ` keys=[${Object.keys(json).slice(0, 6).join(',')}]`;
        if ('is_mno_item' in json) summary += ` is_mno=${json.is_mno_item}`;
        if ('price2' in json) summary += ` price2=${json.price2}`;
      }
    } catch (e) {
      summary += ` body="${body.slice(0, 80)}"`;
    }
    console.log(`[${res.status()}] ${t.label}\n    → ${summary}\n`);
  }

  // 추가: /mno/item/94538 페이지에서 어떤 API 호출되는지 sniff
  console.log('=== /mno/item/94538 페이지 API 호출 sniff ===');
  const page = await browser.newPage();
  const calls = [];
  page.on('request', req => {
    const u = req.url();
    if (u.includes('univstore.com/api/')) calls.push(`${req.method()} ${u.replace(/^https?:\/\/[^/]+/, '')}`);
  });
  await page.goto('https://www.univstore.com/mno/item/94538', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  calls.forEach(c => console.log(`  ${c}`));

  await browser.close();
}

probe().catch(e => { console.error(e); process.exit(1); });
