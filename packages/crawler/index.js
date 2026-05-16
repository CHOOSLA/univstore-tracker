require('dotenv').config();
const { chromium } = require('playwright');

async function loginWithEverytime(page) {
  await page.goto('https://www.univstore.com/user/login');
  await page.click('.usEverytimeLoginTitle');
  // [Fix] 셀렉터 'id'로 수정 및 User-Agent 우회 적용
  await page.waitForSelector('input[name="id"]', { timeout: 30000 });
  await page.fill('input[name="id"]', process.env.EVERYTIME_ID);
  await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
  await page.click('input[type="submit"]');
  // 리다이렉트 대기 시간 확보
  await page.waitForTimeout(5000);
  await page.waitForURL(url => url.href.includes('univstore.com'), { timeout: 60000 });
}

async function run() {
  const context = await chromium.launchPersistentContext('./user_data', { 
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const page = await context.newPage();
  await loginWithEverytime(page);
  console.log("✅ 로그인 성공 및 세션 확보");
  await context.close();
}
run();
