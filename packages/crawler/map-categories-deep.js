require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const USER_DATA_DIR = './user_data';

async function mapCategoriesDeep() {
  console.log("🚀 [Deep Scan] 카테고리 전수 조사 시작...");
  
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
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
    { name: '식품', slug: 'food' },
    { name: '스포츠', slug: 'sports' },
  ];

  for (const ctg of CATEGORIES) {
    console.log(`\n📂 [${ctg.name}] 스캔 중...`);
    try {
      await page.goto(`https://www.univstore.com/category/${ctg.slug}`, { waitUntil: 'networkidle', timeout: 60000 });
      
      // 무한 스크롤 수행 (모든 상품을 로드할 때까지)
      let prevCount = 0;
      let sameCountRetries = 0;
      
      while (sameCountRetries < 3) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        
        const currentCount = await page.evaluate(() => document.querySelectorAll('a[href*="/item/"]').length);
        console.log(`   - 로드된 링크 수: ${currentCount}`);
        
        if (currentCount === prevCount) {
          sameCountRetries++;
        } else {
          sameCountRetries = 0;
          prevCount = currentCount;
        }
        
        // 너무 많으면(예: 500개 이상) 일단 끊어줌 (성능 및 차단 방지)
        if (currentCount > 1000) break; 
      }

      const itemIds = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/item/'));
        return Array.from(new Set(links.map(a => a.href.match(/\/item\/(\d+)/)?.[1]).filter(Boolean)));
      });

      console.log(`✅ ${itemIds.length}개의 상품 발견. DB 매핑 중...`);

      const result = await prisma.product.updateMany({
        where: { id: { in: itemIds } },
        data: { category: ctg.name }
      });

      console.log(`✨ ${result.count}개의 상품에 '${ctg.name}' 카테고리 적용 완료.`);

    } catch (err) {
      console.error(`❌ ${ctg.name} 스캔 실패:`, err.message);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 카테고리 전수 조사 완료!");
}

mapCategoriesDeep();
