# crawler

상품 약 33,000개의 가격과 메타데이터를 수집하는 Playwright 기반 엔진입니다. 봇 탐지를 피하면서 cycle 한 번을 6.6시간 안에 끝내는 것이 목표였습니다.

## 어떻게 풀어왔는지

### 봇 탐지 우회는 한 번에 풀리지 않았습니다

가장 먼저 부딪힌 벽은 HTTP 405였습니다. Playwright 빌트인 Chromium이 곧바로 차단됐고, `puppeteer-extra-plugin-stealth`와 `playwright-extra`만으로는 부족했습니다. 결국 정식 Google Chrome 바이너리를 `executablePath`로 지정하고 `launchPersistentContext`로 쿠키·세션을 유지하니까 차단 빈도가 눈에 띄게 줄었습니다. 운영체제별 Chrome 경로 자동 감지 로직은 `lib/engine.js`의 `getExecutablePath()`에 모아두었습니다.

요청 간격은 2~6초 사이의 jitter를 넣어 사람의 리듬을 흉내냈습니다. 처음에는 더 짧은 jitter를 시도했는데 차단이 자주 발생해서 결국 보수적으로 잡았습니다.

### 페이지를 안 그리는 게 가장 빠른 길이었습니다

상세 페이지는 그 자체로 무겁고 차단 표면도 큽니다. 페이지 로드 흐름을 sniff해보니 `/api/item/{id}`가 가격과 메타데이터를 그대로 JSON으로 돌려주고 있었고, `browserContext.request.get()`을 쓰면 페이지 렌더링 없이도 브라우저의 TLS fingerprint와 쿠키를 그대로 빌려 호출할 수 있었습니다. `Referer`, `Sec-Fetch-Site`, `X-Requested-With` 같은 헤더는 빠뜨리지 않도록 신경 썼습니다.

이 방식이 `DirectApiFilter`입니다. `USE_DIRECT_API=true`로 켜면 가능한 한 페이지 로드 없이 API만 호출하고, 이미지를 별도로 얻어야 하는 복구 모드(recovery mode)에서만 페이지로 폴백합니다. JSON 파싱이 실패하면 fallback이 자동으로 트리거되도록 try/catch를 감쌌습니다. 이 가드를 처음에 잊었다가, ID 3개가 무한 재시도 루프에 갇히는 사고를 한 번 겪었습니다.

### 차단 발생 시 스스로 보호 모드로 들어갑니다

DirectApi 모드가 영원히 안전하다고 보장할 수 없습니다. `lib/blockGuard.js`의 `BlockGuard`는 1시간 sliding window 안에서 차단이 3회 이상 발생하면 in-memory flag로 DirectApi를 끄고, 1시간 동안 추가 차단이 없으면 자동으로 다시 켭니다. 차단 발생, 자동 OFF, 자동 복귀 세 시점 모두 텔레그램으로 알림이 갑니다.

연속 5회 이상 실패하는 ID는 큐에서 영구 제외합니다(`failTask`의 retry 카운터). 존재하지 않거나 판매 중단된 상품을 무한히 재시도하다 cycle이 멈추는 케이스를 막기 위한 안전망입니다.

### 큐는 ZSET, 운영은 12시간 cron

Redis Sorted Set(`univstore:task_queue`)을 작업 큐로 씁니다. `zpopmin`으로 가장 오래된 항목부터 꺼내고, 완료된 항목은 큐에 다시 넣지 않습니다. 32,000건이 모두 처리되면 `process.exit(0)`으로 깨끗하게 종료하고, PM2의 `cron_restart: "0 */12 * * *"`가 12시간 뒤에 새 프로세스를 띄웁니다.

처음에는 score만 갱신해서 큐가 영원히 도는 무한 순환 구조였는데, 같은 날 두 번째 cycle은 거의 모든 항목이 `DBStateFilter`에서 `오늘 수집됨`으로 skip되어 큰 의미가 없었습니다. 종료 모드로 바꾸면서 시스템이 훨씬 단순해졌습니다.

## 파이프라인 구성

수집 한 건은 다음 필터 체인을 거칩니다.

```
DBStateFilter      이미 오늘 수집한 항목인지 + 복구 모드 판단
DirectApiFilter    USE_DIRECT_API=true일 때 /api/item/{id} 직접 호출
NavigationFilter   apiHandled가 false면 page.goto로 폴백
SessionCheckFilter 학생 인증 만료 감지 → SessionExpiredError
ExtractionFilter   DOM에서 가격·이미지 추출 (페이지 모드 전용)
ValidationFilter   price가 NaN이거나 0이면 skip
StorageFilter      Redis 알림 큐(univstore:price_updates)에 push
```

## 측정값

| 지표 | 페이지 모드 | DirectApi 모드 |
|------|------------|---------------|
| item당 평균 | 약 8초 | **0.72초** |
| 33k cycle 환산 | 약 73시간 | **약 6.6시간** |
| 차단 발생 빈도 | 자주 (시간당 수회) | 거의 없음 (1시간당 0~1건) |

## 파일

- `lib/engine.js` — Pipeline, Context, Prisma/Redis 인스턴스, ZSET 큐 함수, 브라우저 런처 옵션, Chrome 경로 탐지
- `lib/filters.js` — DBState / DirectApi / Navigation / SessionCheck / Extraction / Validation / Storage 필터 정의
- `lib/blockGuard.js` — sliding window 기반 자동 보호 + 텔레그램 알림 헬퍼
- `index.js` — 메인 데몬 (PM2: `univ-crawler`)
- `sync-picks.js` — 추천 PICK 발굴 + 우선순위 큐 등록 (PM2: `univ-sync-picks`, daily)
- `extract-taxonomy.js` — univstore 메뉴 트리(8 × 65 × 444)를 `taxonomy.json`으로 추출
- `map-menu-categories.js` / `map-third-categories.js` — 상품을 메뉴 분류에 매핑 (N:M, `array_append`)
- `pipeline.test.mjs` — Vitest 단위 테스트 (20개)

## 실행

```bash
# 메인 데몬
node index.js

# 추천 PICK 동기화
node sync-picks.js

# 카테고리 트리 추출
node extract-taxonomy.js

# 상품 → 메뉴 분류 매핑 (taxonomy.json 필요)
node map-menu-categories.js
node map-third-categories.js

# 테스트
npm run test
```

옵션 환경 변수: `USE_DIRECT_API=true|false`, `CHROME_PATH=/usr/bin/google-chrome`, `DRY_RUN=true`, `ONLY_SLUG=digital`.
