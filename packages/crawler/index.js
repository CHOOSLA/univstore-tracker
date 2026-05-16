require('dotenv').config();
const { chromium } = require('playwright');

async function loginWithEverytime(page) {
  await page.goto('https://www.univstore.com/user/login');
  await page.click('.usEverytimeLoginTitle');
  // [Bug] 'userid' 셀렉터를 찾지 못해 TimeoutError 발생
  await page.waitForSelector('input[name="userid"]', { timeout: 10000 });
  await page.fill('input[name="userid"]', process.env.EVERYTIME_ID);
  await page.fill('input[name="password"]', process.env.EVERYTIME_PW);
  await page.click('input[type="submit"]');
}

async function run() {
  const context = await chromium.launchPersistentContext('./user_data', { headless: true });
  const page = await context.newPage();
  await loginWithEverytime(page);
  await context.close();
}
run();
