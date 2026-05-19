# 🏛️ UnivWatch: Intelligent Market Intelligence Platform

**UnivWatch**는 전국 대학생 전용 폐쇄몰(EveryUniv)의 가격 변동을 실시간으로 추적하고, 데이터 기반의 구매 통찰을 제공하는 엔지니어링 프로젝트입니다. 33,000개 이상의 상품을 정밀 분석하며, 자체 구축한 분산 수집 파이프라인을 통해 시장의 무결성을 증명합니다.

## 🚀 Key Achievements
- **Terminal 3.0**: SSE(Server-Sent Events) 기반의 리얼타임 서버 관제 시스템.
- **Market 4.0**: Bento Grid 레이아웃과 Recharts를 활용한 고도화된 데이터 시각화 리포트.
- **Stealth Engine**: 봇 탐지를 회피하는 가상 스크롤링 및 인간 미 패턴(Jitter) 수집 엔진.
- **Smart Curation**: 에디터 추천 상품과 실시간 가격 추이 그래프를 결합한 지능형 랜딩 페이지.

## 🏗️ Monorepo Architecture
본 프로젝트는 관심사 분리(SoC)를 위해 모노레포 구조로 설계되었습니다.

- **`packages/crawler`**: Playwright 기반의 고성능 수집 엔진. 필터 체인(Pipeline) 패턴을 적용하여 Stealth, Validation, Storage 로직을 모듈화했습니다.
- **`packages/worker`**: Redis 큐를 통해 전달된 수집 데이터를 처리하고 PostgreSQL(Prisma)에 영속화하는 비동기 처리 노드.
- **`packages/web-dashboard`**: Next.js 15(App Router) 기반의 데이터 시각화 플랫폼. ShadcnUI와 TailwindCSS를 사용하여 프리미엄 대시보드 UX를 구현했습니다.

## 🛠️ Tech Stack
- **Frontend**: Next.js 15, TailwindCSS, Lucide Icons, Recharts, Framer Motion
- **Backend**: Node.js, Prisma ORM, PostgreSQL, Redis
- **Infra**: Docker Compose, PM2 (Process Management), Ubuntu Server
- **Scraping**: Playwright (Chromium), Stealth Plugin, XML Sitemap Parsing

## 📡 Data Flow
1. **Crawler**: EveryUniv 사이트맵 및 메인 홈 분석 -> 상품 상세 정보 추출 -> Redis 큐(`price_updates`)로 전송.
2. **Worker**: Redis 큐 구독 -> 가격 변동 감지 및 DB 저장 -> 필요시 알림 발송.
3. **Dashboard**: DB 조회 및 SSE 스트림 생성 -> 실시간 터미널 및 인텔리전스 리포트 렌더링.

## ⚙️ Operation Commands
```bash
# 전체 시스템 가동
docker compose up -d

# 크롤러 수동 실행 (PM2 관리)
pm2 restart univ-crawler       # 전체 스캔
pm2 restart univ-sync-picks    # 추천 PICK 우선 수집 (Daily)

# 개발 모드 실행
npm run dev
```

---
*이 문서는 차세대 AI 엔지니어가 프로젝트의 맥락을 즉시 파악하고 고도화할 수 있도록 작성되었습니다.*
