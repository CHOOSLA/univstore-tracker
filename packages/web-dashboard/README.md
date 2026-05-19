# 📊 UnivWatch Web Dashboard

데이터를 시각적 가치로 변환하는 UnivWatch의 사용자 인터페이스 플랫폼입니다.

## 🏗️ Technical Highlights
- **Framework**: Next.js 15 (App Router)
- **Real-time Engine**: 
  - **SSE (Server-Sent Events)**: 서버의 로그와 수집 진행률을 브라우저로 실시간 스트리밍합니다.
  - **Optimistic UI**: 터미널 명령 실행 시 즉각적인 피드백을 제공합니다.
- **Visualization**: 
  - **Bento Grid**: 정보 밀도가 높은 최신 대시보드 레이아웃.
  - **Recharts**: Area, Radar, Pie 차트를 활용한 다각도 데이터 분석.

## 🚀 Key Pages
- **`/ (Landing)`**: 웅장한 히어로 섹션과 에브리유니브 추천 PICK(24개) 및 실시간 가격 트렌드 그래프 노출.
- **`/terminal`**: 서버의 심박수를 관측하는 관제실. PM2 상태 제어, 실시간 로그 피드, 스토리지/DB 용량 모니터링 지원.
- **`/market`**: 시장의 전반적인 건강 상태 리포트. 브랜드 점유율(Top 5 vs Others) 및 할인 효율 분석.

## 📡 Live Telemetry
대시보드는 `/api/terminal/stream` 엔드포인트를 통해 서버 노드의 모든 상태를 2초 주기로 동기화합니다. 이는 별도의 새로고침 없이도 대시보드가 '살아있는' 느낌을 주게 합니다.

## ⚙️ How to Run
```bash
# 개발 서버 실행
npm run dev

# 빌드 및 서비스 실행
npm run build
npm start
```
