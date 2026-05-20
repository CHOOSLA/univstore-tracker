require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const USER_DATA_DIR = './user_data';

async function mapCategoriesHierarchical() {
  console.log("🚀 [Hierarchical Scan] 계층형 카테고리 전수 조사 시작...");
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

  // 1. 메인 페이지에서 모든 카테고리 링크 추출
  console.log("🔗 카테고리 트리 추출 중...");
  await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });
  
  const categoryTree = await page.evaluate(() => {
    const results = [];
    const mainCategories = ['digital', 'computer', 'appliance', 'smartphone', 'beauty', 'fashion', 'fashionacc', 'lifestyle'];
    const mainNames = {
      'digital': '디지털', 'computer': '컴퓨터', 'appliance': '가전', 
      'smartphone': '스마트폰', 'beauty': '뷰티', 'fashion': '패션', 
      'fashionacc': '패션잡화', 'lifestyle': '라이프스타일'
    };

    const links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/category/'));
    
    links.forEach(a => {
      const url = new URL(a.href);
      const slug = url.pathname.split('/').pop();
      if (!mainCategories.includes(slug)) return;

      const subCode = url.searchParams.get('ctg_sub_code');
      const thirdCode = url.searchParams.get('ctg_third_code');
      
      results.push({
        text: a.innerText.trim(),
        href: a.href,
        mainSlug: slug,
        mainName: mainNames[slug],
        subCode,
        thirdCode
      });
    });
    return results;
  });

  console.log(`✅ 총 ${categoryTree.length}개의 카테고리 지점 발견.`);

  // 2. 각 지점 방문하여 상품 매핑
  for (const item of categoryTree) {
    // 텍스트가 없는 항목 패스
    if (!item.text) continue;

    console.log(`\n📂 [${item.mainName} > ${item.text}] 스캔 중...`);
    try {
      await page.goto(item.href, { waitUntil: 'networkidle', timeout: 60000 });
      
      // 상품 ID 추출 (스크롤 없이 일단 보이는 것만이라도 - 3만개를 다 돌기엔 부하가 큼)
      // 실제로는 여기서 무한 스크롤을 3-5회 정도 수행하는 것이 좋음
      let scrollCount = 0;
      while (scrollCount < 3) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        scrollCount++;
      }

      const itemIds = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/item/'));
        return Array.from(new Set(links.map(a => a.href.match(/\/item\/(\d+)/)?.[1]).filter(Boolean)));
      });

      if (itemIds.length > 0) {
        console.log(`   - ${itemIds.length}개의 상품 발견. DB 업데이트 중...`);
        
        // 데이터 정합성: 3차 분류인지 2차 분류인지 판단
        const isThird = !!item.thirdCode;
        
        const updateData = {
          category: item.mainName,
          [isThird ? 'thirdCategory' : 'subCategory']: item.text
        };

        const result = await prisma.product.updateMany({
          where: { id: { in: itemIds } },
          data: updateData
        });
        
        console.log(`   ✨ ${result.count}개 업데이트 완료.`);
      }

    } catch (err) {
      console.error(`   ❌ 스캔 실패:`, err.message);
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n🏁 계층형 카테고리 매핑 완료!");
}

mapCategoriesHierarchical();
