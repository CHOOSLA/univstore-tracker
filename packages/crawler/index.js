const { chromium } = require('playwright');
const fs = require('fs');

async function crawlUnivStore(itemIds) {
  const userDataDir = './user_data'; 
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, 
    args: ['--no-sandbox']
  });
  const page = await context.newPage();
  await page.goto('https://www.univstore.com/user/login');
  console.log("⚠️ 로그인이 필요합니다.");
  await context.close();
}
const targetItems = ['138746', '138929'];
crawlUnivStore(targetItems);
