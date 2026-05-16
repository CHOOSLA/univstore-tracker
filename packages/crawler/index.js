require('dotenv').config();
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const context = await chromium.launchPersistentContext('./user_data', { headless: true });
  const page = await context.newPage();
  // ... (로그인 및 수집 로직 중략 - 현재 완성된 index.js의 핵심 로직 반영)
  console.log("🚀 최종 데이터베이스 연동 버전 실행 중...");
  await prisma.$disconnect();
  await context.close();
}
run();
