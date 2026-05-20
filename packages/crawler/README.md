# 🕷️ UnivWatch Crawler Engine

Playwright 기반의 수집 엔진입니다. 봇 탐지 우회 기술과 모듈화된 필터 체인 아키텍처를 특징으로 합니다.

## 🏗️ Architecture: Pipeline Pattern
모든 수집 공정은 `lib/engine.js`에 정의된 **Pipeline** 클래스를 통해 실행됩니다.

- **`DBStateFilter`**: 현재 DB 상태를 조회하여 오늘 이미 수집된 항목은 스킵하고, 정보가 부족한 항목은 정밀 복구 모드로 표시합니다.
- **`NavigationFilter`**: 2~6초 무작위 지터(Jitter) 후 대상 페이지로 이동하며 HTTP 403/405/429 및 Verification 페이지를 차단으로 감지합니다.
- **`SessionCheckFilter`**: '학생인증 후 가격 확인' 마커를 검사하여 세션 만료 시 `SessionExpiredError`를 발생시킵니다.
- **`ExtractionFilter`**: 내부 API(`/api/item/{id}`)를 우선 호출하고 DOM 셀렉터로 fallback하여 상품 정보를 추출합니다.
- **`ValidationFilter`**: 추출된 가격의 유효성을 검증합니다.
- **`StorageFilter`**: 검증된 페이로드를 Redis 큐(`univstore:price_updates`)로 전송합니다.

## 🚀 Key Features
- **Stealth Engine**: `playwright-extra` + `puppeteer-extra-plugin-stealth`로 자동화 흔적을 은닉하고, 정식 Google Chrome 바이너리와 `launchPersistentContext`로 실제 사용자에 가까운 fingerprint를 유지합니다. (`CHROME_PATH` 환경 변수로 수동 지정 가능)
- **ZSET 무한 순환 큐**: Redis Sorted Set(`univstore:task_queue`)으로 작업을 관리합니다. score=0이면 최우선, 현재 timestamp이면 일반 등록입니다. 완료된 항목은 `finishTask`로 큐 맨 뒤로 이동하여 자연스럽게 다음 사이클을 만듭니다.
- **Priority Interrupt**: `sync-picks.js`가 발견한 추천 상품을 `enqueueTasks(ids, true)`로 score=0에 push하면 메인 크롤러가 다음 `getNextTasks` 호출에서 최우선으로 처리합니다.
- **Block Cooldown**: 차단 감지 시 브라우저를 닫고 10분간 대기 후 새 컨텍스트로 복귀합니다.
- **Memory Hygiene**: 500개 처리마다 브라우저를 재시작하여 메모리 누수를 방지합니다.
- **Telemetry**: 진행률과 하트비트를 DB(`CrawlerStatus`)에 실시간 기록하여 대시보드와 동기화합니다.

## 📂 File Structure
- `lib/engine.js`: Pipeline, Context, 큐 함수, 브라우저 옵션, Chrome 경로 탐지 등 공용 프레임워크
- `lib/filters.js`: 재사용 가능한 수집 단계별 필터
- `index.js`: 전체 상품 무한 순환 수집 데몬 (PM2: `univ-crawler`)
- `sync-picks.js`: 추천 PICK 발굴 및 우선순위 큐 푸시 (PM2: `univ-sync-picks`, daily)
- `pipeline.test.mjs`: Vitest 단위 테스트

## ⚙️ How to Run
```bash
# 전체 스캔 시작
node index.js

# 추천 상품 동기화
node sync-picks.js

# 테스트
npm run test
```
