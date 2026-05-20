require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const USER_DATA_DIR = './user_data';

async function mapCategories() {
  const fs = require('fs');
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined;

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    executablePath,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--use-gl=desktop',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    ]
  });
  const page = await browser.newPage();

  const CATEGORIES = [
    { name: '디지털', slug: 'digital' },
    { name: '컴퓨터', slug: 'computer' },
    { name: '가전', slug: 'appliance' },
    { name: '스마트폰', slug: 'smartphone' },
    { name: '뷰티', slug: 'beauty' },
    { name: '패션', slug: 'fashion' },
    { name: '라이프', slug: 'life' },
  ];

  console.log("🚀 카테고리 매핑 시작...");

  for (const ctg of CATEGORIES) {
    console.log(`\n📂 [${ctg.name}] 카테고리 스캔 중...`);
    const url = `https://www.univstore.com/category/${ctg.slug}`;
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // 무한 스크롤이 있을 수 있으므로 끝까지 내림 (혹은 페이지네이션 처리)
      // 여기서는 일단 첫 페이지에 있는 것만이라도 매핑
      const itemIds = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/item/'));
        return Array.from(new Set(links.map(a => a.href.match(/\/item\/(\d+)/)?.[1]).filter(Boolean)));
      });

      console.log(`✅ ${itemIds.length}개의 상품 발견. DB 업데이트 중...`);

      const result = await prisma.product.updateMany({
        where: { id: { in: itemIds } },
        data: { category: ctg.name }
      });

      console.log(`✨ ${result.count}개의 상품에 '${ctg.name}' 카테고리 적용 완료.`);

    } catch (err) {
      console.error(`❌ ${ctg.name} 수집 실패:`, err.message);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 모든 카테고리 매핑 완료!");
}

mapCategories();
