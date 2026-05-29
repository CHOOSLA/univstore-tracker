/**
 * menuSubCategories에 '통신사'가 포함된 모든 Product에 대해
 * /api/mno/item/{id}를 호출하여 MnoOption 메타데이터를 일괄 백필.
 *
 * crawler의 DirectApiFilter에 mno 옵션 추출 로직이 들어갔으므로
 * 신규 상품은 cycle 진행 중 자동 저장됨. 이 스크립트는 기존 데이터용 1회성.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const { PrismaClient } = require('@prisma/client');
const { extractMnoOption } = require('./lib/mnoExtract');

const SNIFF_USER_DATA = '/tmp/sniff-user-data';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const prisma = new PrismaClient();
  const browser = await chromium.launchPersistentContext(SNIFF_USER_DATA, {
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  // 통신사 상품 전체 조회
  const products = await prisma.$queryRaw`
    SELECT id, title FROM "Product"
    WHERE '통신사' = ANY("menuSubCategories")
    ORDER BY id
  `;
  console.log(`🎯 통신사 상품 ${products.length}건 백필 시작\n`);

  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const p of products) {
    await sleep(400 + Math.floor(Math.random() * 500));
    try {
      const res = await browser.request.get(`https://www.univstore.com/api/mno/item/${p.id}`, {
        headers: {
          Referer: `https://www.univstore.com/mno/item/${p.id}`,
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
        timeout: 15000,
      });
      if (res.status() !== 200) {
        console.log(`  ⚠️ [${p.id}] HTTP ${res.status()}`);
        failCount++;
        continue;
      }
      const text = await res.text();
      if (!text || text.length === 0) {
        console.log(`  · [${p.id}] 빈 응답`);
        skipCount++;
        continue;
      }
      const json = JSON.parse(text);
      const meta = extractMnoOption(json);
      if (!meta) {
        console.log(`  · [${p.id}] mno 옵션 신호 없음`);
        skipCount++;
        continue;
      }
      await prisma.mnoOption.upsert({
        where: { productId: p.id },
        create: { productId: p.id, ...meta },
        update: meta,
      });
      okCount++;
      console.log(`  ✓ [${p.id}] ${p.title.slice(0, 30)} → 색상 ${meta.deviceColors.length}, 용량 ${meta.deviceCapacities.length}, 요금제 ${meta.phonePlans.length}`);
    } catch (e) {
      console.log(`  ❌ [${p.id}] ${e.message.slice(0, 80)}`);
      failCount++;
    }
  }

  console.log(`\n🏁 백필 완료: 성공 ${okCount} · skip ${skipCount} · 실패 ${failCount}`);
  await browser.close();
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
