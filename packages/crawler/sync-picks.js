const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function scrapeDailyPicks() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 EveryUniv 추천 PICK 수집 시작...');
    await page.goto('https://www.univstore.com/', { waitUntil: 'networkidle' });

    // 추천 PICK 섹션의 상품 ID 추출
    // EveryUniv 메인 페이지 구조 분석 기반 (a태그의 href="/item/ID" 형식)
    const pickIds = await page.evaluate(() => {
      // "추천 PICK" 텍스트를 포함한 섹션을 찾거나, 특정 클래스/구조 활용
      // 현재 EveryUniv 메인은 상품 카드들이 특정 그리드에 나열됨
      const links = Array.from(document.querySelectorAll('a[href*="/item/"]'));
      // 중복 제거 및 ID 추출 (href에서 숫자만 추출)
      const ids = links
        .map(a => a.href.split('/item/')[1]?.split('?')[0])
        .filter(id => id && /^\d+$/.test(id));
      
      // 상위 10개 정도가 보통 추천 섹션에 해당함
      return [...new Set(ids)].slice(0, 12);
    });

    console.log(`✅ ${pickIds.length}개의 추천 상품 ID 발견:`, pickIds);

    if (pickIds.length === 0) {
      console.error('❌ 추천 상품을 찾을 수 없습니다. 셀렉터를 확인하세요.');
      return;
    }

    // 기존 추천 PICK 초기화 (오늘 것만 유지하기 위함)
    await prisma.dailyPick.deleteMany({});

    // 새로운 추천 PICK 등록
    for (const id of pickIds) {
      // 상품이 DB에 있는지 먼저 확인 (없으면 더미 데이터라도 생성하거나 스킵)
      const product = await prisma.product.findUnique({ where: { id } });
      
      if (product) {
        await prisma.dailyPick.create({
          data: { productId: id }
        }).catch(() => {}); // 중복 방지
      } else {
        console.log(`⚠️ 상품 ${id}가 DB에 없습니다. 크롤링 큐에 추가가 필요할 수 있습니다.`);
        // 임시로 상품 껍데기 생성 (그래프를 보여주기 위해)
        await prisma.product.create({
          data: { 
            id, 
            title: `수집 대기 중인 상품 (${id})`,
            brand: 'EveryUniv'
          }
        }).catch(() => {});
        await prisma.dailyPick.create({
          data: { productId: id }
        }).catch(() => {});
      }
    }

    console.log('✨ DailyPick 동기화 완료');

  } catch (err) {
    console.error('❌ 수집 실패:', err.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

scrapeDailyPicks();
