/**
 * /api/items/category/{slug} 가 third_code 필터링과 limit 변경을 지원하는지 검증.
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const SNIFF_USER_DATA = '/tmp/sniff-user-data';

async function verify() {
  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const tests = [
    { label: 'sub만 (차량용 디지털 전체)',
      url: 'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120700&sort=recommend&offset=0&limit=12' },
    { label: 'third 추가 (차량용 거치대)',
      url: 'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120700&ctg_third_code=120701&sort=recommend&offset=0&limit=12' },
    { label: 'third 추가 (차량용 충전기)',
      url: 'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120700&ctg_third_code=120702&sort=recommend&offset=0&limit=12' },
    { label: 'limit=100 가능?',
      url: 'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120700&sort=recommend&offset=0&limit=100' },
    { label: 'limit=500 가능?',
      url: 'https://www.univstore.com/api/items/category/digital?ctg_sub_code=120700&sort=recommend&offset=0&limit=500' },
    { label: '큰 카테고리 (뷰티 sub 150100, limit=100)',
      url: 'https://www.univstore.com/api/items/category/beauty?ctg_sub_code=150100&sort=recommend&offset=0&limit=100' },
  ];

  console.log('🧪 API 검증 결과\n');
  for (const t of tests) {
    const res = await browser.request.get(t.url, {
      headers: {
        'Referer': 'https://www.univstore.com/',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 15000,
    });
    const status = res.status();
    let summary = 'N/A';
    if (status === 200) {
      try {
        const body = await res.json();
        if (Array.isArray(body)) {
          summary = `Array(${body.length}) first ids=${body.slice(0, 5).map(x => x.id).join(',')}`;
        } else if (body && typeof body === 'object') {
          summary = `Object keys=[${Object.keys(body).join(',')}]`;
          if (Array.isArray(body.items)) summary += ` items.len=${body.items.length} firstIds=${body.items.slice(0,5).map(x=>x.id).join(',')}`;
          if (Array.isArray(body.data)) summary += ` data.len=${body.data.length} firstIds=${body.data.slice(0,5).map(x=>x.id).join(',')}`;
          if (typeof body.total === 'number') summary += ` total=${body.total}`;
        } else {
          summary = `Other: ${JSON.stringify(body).slice(0, 200)}`;
        }
      } catch (e) {
        summary = `JSON parse fail: ${e.message}`;
      }
    }
    console.log(`  [${status}] ${t.label}`);
    console.log(`         ${summary}`);
  }

  await browser.close();
}

verify().catch(e => { console.error('❌', e); process.exit(1); });
