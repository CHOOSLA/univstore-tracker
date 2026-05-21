/**
 * taxonomy.json에 정의된 8 main × 65 sub 트리를 순회하며
 * /api/items/category/{slug}?ctg_sub_code=X 로 상품 ID 목록을 받아
 * Product.menuCategory / menuSubCategory를 업데이트합니다.
 *
 * 사용법: node map-menu-categories.js
 *
 * 옵션 (env):
 *   DRY_RUN=true              DB 업데이트 안 함, 결과만 출력
 *   ONLY_SLUG=digital         특정 main만 처리
 *   LIMIT_SUBS=1              main 당 처리할 sub 개수 제한
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const taxonomy = require('./taxonomy.json');
const SNIFF_USER_DATA = '/tmp/sniff-user-data';

const DRY_RUN = process.env.DRY_RUN === 'true';
const ONLY_SLUG = process.env.ONLY_SLUG || null;
const LIMIT_SUBS = process.env.LIMIT_SUBS ? parseInt(process.env.LIMIT_SUBS) : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function map() {
  console.log(`🚀 메뉴 카테고리 매핑 시작 (DRY_RUN=${DRY_RUN}, ONLY_SLUG=${ONLY_SLUG || 'all'}, LIMIT_SUBS=${LIMIT_SUBS || 'none'})\n`);

  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const prisma = new PrismaClient();

  let totalApiHits = 0;
  let totalDbMatched = 0;
  const failures = [];

  const mainSlugs = ONLY_SLUG ? [ONLY_SLUG] : Object.keys(taxonomy);

  for (const slug of mainSlugs) {
    const mainData = taxonomy[slug];
    if (!mainData) { console.warn(`⚠️ taxonomy에 ${slug} 없음`); continue; }

    let subEntries = Object.entries(mainData.subs);
    if (LIMIT_SUBS) subEntries = subEntries.slice(0, LIMIT_SUBS);

    console.log(`\n📂 [${mainData.name}] (${subEntries.length} subs)`);

    for (const [subCode, subInfo] of subEntries) {
      const subName = subInfo.name;
      if (!subName) { console.warn(`  ⚠️ sub_code=${subCode} 이름 없음, skip`); continue; }

      // 자연스러운 페이스 (메인 크롤러보다 보수적으로)
      await sleep(500 + Math.floor(Math.random() * 1000));

      // 페이지네이션 (limit=10000으로 보통 한 번에 끝나지만 그 이상 분량 안전망)
      const PAGE_LIMIT = 10000;
      const headers = {
        'Referer': `https://www.univstore.com/category/${slug}?ctg_sub_code=${subCode}`,
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };

      const ids = [];
      let offset = 0;
      let pageFailure = null;

      while (true) {
        const url = `https://www.univstore.com/api/items/category/${slug}?ctg_sub_code=${subCode}&sort=recommend&offset=${offset}&limit=${PAGE_LIMIT}`;
        let body;
        try {
          const res = await browser.request.get(url, { headers, timeout: 30000 });
          if (res.status() !== 200) { pageFailure = `HTTP ${res.status()}`; break; }
          body = await res.json();
        } catch (e) { pageFailure = e.message; break; }

        if (!Array.isArray(body)) { pageFailure = 'non-array response'; break; }
        if (body.length === 0) break;

        ids.push(...body.map(x => String(x.id)).filter(Boolean));
        if (body.length < PAGE_LIMIT) break; // 마지막 페이지
        offset += PAGE_LIMIT;
        await sleep(300 + Math.floor(Math.random() * 400));
      }

      if (pageFailure) {
        failures.push({ main: mainData.name, sub: subName, reason: pageFailure });
        console.log(`  ❌ ${subName.padEnd(20)} ${pageFailure}`);
        continue;
      }

      totalApiHits += ids.length;

      if (ids.length === 0) {
        console.log(`  · ${subName.padEnd(20)} (빈 카테고리)`);
        continue;
      }

      if (DRY_RUN) {
        console.log(`  ➤ ${subName.padEnd(20)} API=${String(ids.length).padStart(4)}건 (dry-run)`);
        continue;
      }

      const result = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { menuCategory: mainData.name, menuSubCategory: subName },
      });
      totalDbMatched += result.count;
      console.log(`  ✓ ${subName.padEnd(20)} API=${String(ids.length).padStart(4)}건, DB matched=${String(result.count).padStart(4)}건`);
    }
  }

  console.log(`\n🏁 매핑 완료`);
  console.log(`   API 호출로 받은 ID 총합: ${totalApiHits.toLocaleString()}건`);
  console.log(`   DB에서 매칭된 상품: ${totalDbMatched.toLocaleString()}건`);
  if (failures.length > 0) {
    console.log(`\n   ❌ 실패 ${failures.length}건:`);
    for (const f of failures) console.log(`      - ${f.main} > ${f.sub}: ${f.reason}`);
  }

  await browser.close();
  await prisma.$disconnect();
}

map().catch(e => { console.error('❌', e); process.exit(1); });
