# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# 모노레포 구조 복사
COPY package*.json ./
COPY packages/web-dashboard/package*.json ./packages/web-dashboard/
COPY packages/crawler/prisma ./packages/crawler/prisma/

# 의존성 설치
RUN npm install

# 대시보드 소스 복사
COPY packages/web-dashboard ./packages/web-dashboard/

# Prisma 클라이언트 생성 (스키마 경로 주의)
WORKDIR /app/packages/web-dashboard
RUN npx prisma generate --schema=prisma/schema.prisma

# 빌드 실행
RUN npm run build

# --- Run Stage ---
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=packages/web-dashboard"]
