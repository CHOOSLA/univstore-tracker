#!/bin/bash

# --- UnivWatch 원클릭 자동 배포 스크립트 ---
echo "🚀 [Deploy] 배포 프로세스를 시작합니다..."

# 1. 최신 코드 가져오기
echo "📥 [1/5] Git 최신 소스 코드를 가져오는 중..."
git pull origin main

# 2. 의존성 설치
echo "📦 [2/5] 전체 패키지 의존성을 설치합니다..."
npm install

# 3. 데이터베이스 마이그레이션 및 Prisma 갱신
echo "🗄️ [3/5] DB 스키마 동기화 및 클라이언트 생성 중..."
npx dotenv-cli -e .env -- npx prisma migrate dev --schema=packages/crawler/prisma/schema.prisma
cp packages/crawler/prisma/schema.prisma packages/worker/prisma/schema.prisma
cp packages/crawler/prisma/schema.prisma packages/web-dashboard/prisma/schema.prisma
npx prisma generate --schema=packages/crawler/prisma/schema.prisma

# 4. 대시보드 도커 컨테이너 재빌드 및 재시작
echo "🐳 [4/5] 대시보드 도커 컨테이너를 재빌드하고 실행합니다..."
docker compose up -d --build dashboard

# 5. PM2 프로세스(크롤러, 워커) 재시작
echo "🔄 [5/5] PM2 관리 프로세스를 재시작합니다..."
pm2 restart ecosystem.config.js

echo "✨ [Success] 모든 배포 공정이 완료되었습니다!"
echo "🌐 접속 주소: https://choouniv.duckdns.org"
