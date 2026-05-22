/**
 * taxonomy.json의 444개 third 카테고리 전체에 대해
 * /api/items/category/{slug}?ctg_sub_code=X&ctg_third_code=Y 호출하여
 * Product.thirdCategory 컬럼을 채웁니다.
 *
 * 핵심: sort=recommend는 third를 무시함. sort 파라미터를 생략해야 third 필터링 작동.
 *
 * 사용법: node map-third-categories.js
 * 옵션 (env):
 *   DRY_RUN=true              DB 업데이트 없이 시뮬레이션
 *   ONLY_SLUG=digital         특정 main만 처리
 *   LIMIT_THIRDS=2            sub당 처리할 third 개수 제한
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
const LIMIT_THIRDS = process.env.LIMIT_THIRDS ? parseInt(process.env.LIMIT_THIRDS) : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function map() {
  console.log(`🚀 third 카테고리 매핑 시작 (DRY_RUN=${DRY_RUN}, ONLY_SLUG=${ONLY_SLUG || 'all'}, LIMIT_THIRDS=${LIMIT_THIRDS || 'none'})\n`);

  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const prisma = new PrismaClient();

  let totalThirds = 0;
  let totalApiHits = 0;
  let totalDbMatched = 0;
  const failures = [];

  const mainSlugs = ONLY_SLUG ? [ONLY_SLUG] : Object.keys(taxonomy);

  for (const slug of mainSlugs) {
    const mainData = taxonomy[slug];
    if (!mainData) { console.warn(`⚠️ taxonomy에 ${slug} 없음`); continue; }

    console.log(`\n📂 [${mainData.name}]`);

    for (const [subCode, subInfo] of Object.entries(mainData.subs)) {
      const subName = subInfo.name;
      let thirdEntries = Object.entries(subInfo.thirds);
      if (LIMIT_THIRDS) thirdEntries = thirdEntries.slice(0, LIMIT_THIRDS);

      if (thirdEntries.length === 0) continue;

      console.log(`  └ ${subName} (${thirdEntries.length} thirds)`);

      for (const [thirdCode, thirdName] of thirdEntries) {
        totalThirds++;
        await sleep(500 + Math.floor(Math.random() * 700));

        // 핵심: sort 파라미터 생략 → third_code가 무시되지 않음
        // limit 생략하면 한 번에 다 받음
        const url = `https://www.univstore.com/api/items/category/${slug}?ctg_sub_code=${subCode}&ctg_third_code=${thirdCode}`;

        let body;
        try {
          const res = await browser.request.get(url, {
            headers: {
              'Referer': `https://www.univstore.com/category/${slug}?ctg_sub_code=${subCode}&ctg_third_code=${thirdCode}`,
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Dest': 'empty',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 30000,
          });
          if (res.status() !== 200) {
            failures.push({ slug, sub: subName, third: thirdName, reason: `HTTP ${res.status()}` });
            console.log(`     ❌ ${thirdName.padEnd(18)} HTTP ${res.status()}`);
            continue;
          }
          body = await res.json();
        } catch (e) {
          failures.push({ slug, sub: subName, third: thirdName, reason: e.message });
          console.log(`     ❌ ${thirdName.padEnd(18)} ${e.message.slice(0, 50)}`);
          continue;
        }

        if (!Array.isArray(body)) {
          failures.push({ slug, sub: subName, third: thirdName, reason: 'non-array' });
          console.log(`     ❌ ${thirdName.padEnd(18)} non-array response`);
          continue;
        }

        const ids = body.map(x => String(x.id)).filter(Boolean);
        totalApiHits += ids.length;

        if (ids.length === 0) {
          console.log(`     · ${thirdName.padEnd(18)} (빈 카테고리)`);
          continue;
        }

        if (DRY_RUN) {
          console.log(`     ➤ ${thirdName.padEnd(18)} API=${String(ids.length).padStart(4)}건 (dry-run)`);
          continue;
        }

        // N:M 매핑: array_append으로 중복 없이 추가
        const result = await prisma.$executeRawUnsafe(`
          UPDATE "Product"
          SET
            "thirdCategories" = (
              CASE WHEN $1::text = ANY("thirdCategories") THEN "thirdCategories"
                   ELSE array_append("thirdCategories", $1::text)
              END
            ),
            "thirdCategory" = $1::text
          WHERE id = ANY($2::text[])
        `, thirdName, ids);
        totalDbMatched += result;
        console.log(`     ✓ ${thirdName.padEnd(18)} API=${String(ids.length).padStart(4)}, DB matched=${String(result).padStart(4)}`);
      }
    }
  }

  console.log(`\n🏁 third 매핑 완료`);
  console.log(`   처리한 third 카테고리: ${totalThirds}/${Object.values(taxonomy).reduce((s, m) => s + Object.values(m.subs).reduce((s2, sub) => s2 + Object.keys(sub.thirds).length, 0), 0)}`);
  console.log(`   API에서 받은 ID 총합: ${totalApiHits.toLocaleString()}건`);
  console.log(`   DB matched: ${totalDbMatched.toLocaleString()}건`);
  if (failures.length > 0) {
    console.log(`\n   ❌ 실패 ${failures.length}건:`);
    for (const f of failures.slice(0, 10)) console.log(`      - ${f.slug} > ${f.sub} > ${f.third}: ${f.reason}`);
    if (failures.length > 10) console.log(`      ... 외 ${failures.length - 10}건`);
  }

  await browser.close();
  await prisma.$disconnect();
}

map().catch(e => { console.error('❌', e); process.exit(1); });
