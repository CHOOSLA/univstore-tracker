/**
 * 카테고리 페이지가 어떤 API를 호출하는지 sniff하여 상품 매핑 경로를 발견하는 스크립트.
 * /tmp/sniff-user-data에 복사된 로그인 세션을 사용 (메인 crawler와 lock 충돌 회피).
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const SNIFF_USER_DATA = '/tmp/sniff-user-data';

// 가장 작은 third category(차량용 충전기, 2개 상품)부터 검증
const TARGET = 'https://www.univstore.com/category/digital?ctg_sub_code=120700&ctg_third_code=120701';

async function sniff() {
  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();

  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('univstore.com/api/') || url.match(/\.(json|xml)(\?|$)/)) {
      apiCalls.push({ method: req.method(), url: url.replace(/^https?:\/\/[^/]+/, '') });
    }
  });

  const responseBodies = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('univstore.com/api/')) {
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if (ct.includes('json')) {
        try {
          const body = await res.json();
          responseBodies.push({
            url: url.replace(/^https?:\/\/[^/]+/, ''),
            status: res.status(),
            shape: shapeOf(body),
          });
        } catch (e) {}
      }
    }
  });

  console.log(`📡 sniffing ${TARGET}\n`);
  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 90000 });

  // lazy load API 트리거를 위해 가벼운 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  // 페이지 내 상품 ID
  const itemIds = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
    return [...new Set(links.map(a => a.href.match(/\/item\/(\d+)/)?.[1]).filter(Boolean))];
  });

  console.log(`📋 캡처된 API 호출 ${apiCalls.length}건:`);
  for (const c of apiCalls) {
    console.log(`  [${c.method}] ${c.url}`);
  }

  console.log(`\n📦 JSON 응답 ${responseBodies.length}건의 응답 형태:`);
  for (const b of responseBodies) {
    console.log(`  [${b.status}] ${b.url}`);
    console.log(`     shape: ${b.shape}`);
  }

  console.log(`\n🛒 페이지에서 발견된 상품 ID ${itemIds.length}개`);
  if (itemIds.length > 0) {
    console.log(`     ${itemIds.slice(0, 10).join(', ')}${itemIds.length > 10 ? ' ...' : ''}`);
  }

  await browser.close();
}

function shapeOf(obj, depth = 0) {
  if (depth > 2) return '...';
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return `[${shapeOf(obj[0], depth + 1)}] (len=${obj.length})`;
  }
  if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj);
    return `{ ${keys.slice(0, 8).map(k => `${k}: ${typeofShort(obj[k])}`).join(', ')}${keys.length > 8 ? ', ...' : ''} }`;
  }
  return typeofShort(obj);
}

function typeofShort(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `array[${v.length}]`;
  return typeof v;
}

sniff().catch(e => { console.error('❌', e); process.exit(1); });
