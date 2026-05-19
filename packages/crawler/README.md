# 🕷️ UnivWatch Crawler Engine

Playwright 기반의 고성능/저위험 수집 엔진입니다. 봇 감지 우회 기술과 모듈화된 필터 체인 아키텍처를 특징으로 합니다.

## 🏗️ Architecture: Pipeline Pattern
모든 수집 공정은 `lib/engine.js`에 정의된 **Pipeline** 클래스를 통해 실행됩니다. 수집 작업의 성격에 따라 필터를 자유롭게 조립할 수 있습니다.

- **`DBStateFilter`**: 현재 DB 상태를 조회하여 중복 수집을 방지하고 유실된 데이터를 복구 모드로 전환합니다.
- **`NavigationFilter`**: 봇 감지를 피하기 위해 무작위 지연(Jitter)을 삽입하고 대상 URL로 안전하게 이동합니다.
- **`ExtractionFilter`**: `window.__INITIAL_STATE__` 파싱 및 DOM 분석을 병행하여 정밀하게 상품 데이터를 추출합니다.
- **`ValidationFilter`**: 추출된 데이터의 유효성(가격, 필수 정보 등)을 검증합니다.
- **`StorageFilter`**: 검증된 데이터를 Redis 큐(`univstore:price_updates`)로 전송합니다.

## 🚀 Key Features
- **Stealth Mode**: `AutomationControlled` 비활성화, 랜덤 사용자 에이전트, 가상 스크롤링을 통해 봇 검사를 회피합니다.
- **Priority Sync**: `sync-picks.js`는 에디터 추천 상품을 발견 즉시 상세 페이지까지 수집하며, 메인 크롤러의 수집 대기열 맨 앞으로 배치합니다.
- **Telemetry**: 수집 진행률과 하트비트를 DB(`CrawlerStatus`)에 실시간 기록하여 대시보드와 동기화합니다.

## 📂 File Structure
- `lib/engine.js`: 수집 엔진의 핵심 프레임워크 (Pipeline, Context, Utils).
- `lib/filters.js`: 재사용 가능한 수집 단계별 필터 뭉치.
- `index.js`: 3.3만 개 전체 상품 스캔 태스크 (PM2: `univ-crawler`).
- `sync-picks.js`: 매일 업데이트되는 추천 상품 전용 수집 태스크 (PM2: `univ-sync-picks`).

## ⚙️ How to Run
```bash
# 전체 스캔 시작
node index.js

# 추천 상품 동기화
node sync-picks.js
```
