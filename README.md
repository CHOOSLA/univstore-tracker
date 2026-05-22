# UnivWatch

대학생 폐쇄몰의 약 33,000개 상품을 매일 한 차례 수집해 가격 추이를 기록하고, 목표가에 도달하면 텔레그램으로 알려주는 개인 학습용 프로젝트입니다. 핵심 관심사는 두 가지였습니다. 차단당하지 않고 안정적으로 수집을 유지하는 것, 그리고 33,000건 규모의 데이터를 부담 없이 다루는 백엔드를 짜는 것.

라이브 사이트는 운영하지 않습니다. 이 저장소는 코드와 설계 의사결정을 공개하기 위한 목적입니다.

## 무엇을 풀려고 했나

학생 할인가는 매일 자정마다 갱신되는 경우가 많은데, 한 사이트에서 좋은 제품을 놓치지 않으려면 수동으로 매일 확인해야 합니다. 추적할 상품이 늘어날수록 한계가 분명해졌고, 단순한 크론잡 + 텔레그램 알림 정도로 시작한 스크립트가 어느 순간 33,000개를 다루게 됐습니다.

## 시스템 구성

```
┌──────────┐    Redis(ZSET)     ┌──────────┐     ┌────────────┐
│ crawler  │ ──────────────────▶│  worker  │────▶│ PostgreSQL │
│ Playwright│   task_queue       │ blpop    │     │ (Prisma)   │
└──────────┘    price_updates    └──────────┘     └─────┬──────┘
     ▲                                                  │
     │                                                  ▼
     │              ┌────────────────────────────┐
     └──────────────│   web-dashboard (Next.js)   │
                    └────────────────────────────┘
```

- `packages/crawler` — Playwright 기반 수집기. ZSET을 작업 큐로 쓰고 PM2 cron으로 12시간에 한 번 새로 시작합니다.
- `packages/worker` — Redis 큐를 소비해서 DB에 상품 정보와 가격 히스토리를 저장합니다. 가격이 사용자 설정 목표가 아래로 떨어지면 텔레그램으로 알림을 보냅니다.
- `packages/web-dashboard` — Next.js 16(App Router)로 만든 대시보드. 카테고리 메가메뉴, 상품 가격 차트, 목표가 알림 설정 같은 화면을 제공합니다.

## 기술적으로 다뤘던 결정들

### 봇 탐지 우회는 점진적으로 풀었습니다

처음엔 `playwright`로 단순하게 페이지를 열고 DOM에서 가격을 긁어왔는데, 몇 시간 만에 HTTP 405가 떨어졌습니다. `puppeteer-extra-plugin-stealth`와 `playwright-extra`를 도입하고, 빌트인 Chromium 대신 정식 Google Chrome 바이너리를 `executablePath`로 지정하니까 차단 빈도가 현저히 줄었습니다. 요청 간격에는 2~6초 사이의 jitter를 넣어 사람과 비슷한 리듬을 흉내냈습니다.

그 다음 단계는 페이지를 굳이 다 그리지 말자는 발상이었습니다. 상세 페이지가 호출하는 내부 API(`/api/items/category/{slug}`, `/api/item/{id}`)를 sniff해보니 가격과 메타데이터가 그대로 JSON으로 나왔습니다. `browserContext.request.get()`을 쓰면 브라우저의 TLS fingerprint와 쿠키를 그대로 빌려서 API만 호출할 수 있었고, 한 건당 처리 시간이 약 8초에서 0.72초로 떨어졌습니다(전체 33k cycle 기준 73시간 → 6.6시간).

`Referer`, `Sec-Fetch-Site`, `X-Requested-With` 헤더는 잊지 않고 붙였습니다. 빠지면 WAF가 API endpoint를 별도로 감시할 가능성이 있어 보였기 때문입니다.

### 차단되면 알아서 보호 모드로

DirectApi 모드는 빠르지만, 어느 시점에 차단이 다시 시작될지 알 수 없습니다. 그래서 1시간 sliding window 안에서 차단이 3회 이상 발생하면 in-memory flag로 DirectApi를 끄고 페이지 모드로 폴백하는 `BlockGuard`를 만들었습니다. 추가 차단 없이 1시간이 지나면 자동으로 다시 켭니다. 차단 발생과 자동 OFF/ON은 텔레그램으로 알림이 가서 사람이 자고 있어도 시스템이 알아서 페이스를 조절합니다.

### ZSET 무한 순환 큐, 그리고 종료 모드로 다시 전환

Redis Sorted Set의 score를 timestamp로 두면 자연스럽게 "가장 오래된 작업부터" 처리하는 큐가 됩니다. 처음에는 `finishTask`에서 score만 갱신해 큐가 영원히 돌게 만들었는데, 막상 운영해보니 같은 날 두 번째 cycle은 거의 다 `오늘 수집됨`으로 skip 처리되어 큰 의미가 없었습니다.

그래서 `finishTask`에서 큐에 다시 넣지 않고(`zpopmin`이 이미 빼간 상태) 종료하는 방향으로 바꿨습니다. PM2의 `autorestart: false`와 `cron_restart: "0 */12 * * *"` 조합으로, 12시간마다 깨끗하게 새로 시작합니다. 매 cycle 끝나면 텔레그램으로 완료 알림이 옵니다.

연속 5회 실패하는 상품(존재하지 않거나 판매 중단된 상품)은 큐에서 영구 제외하는 안전망도 추가했습니다. 매핑 스크립트가 잘못된 ID를 무한 재시도하다 cycle이 멈추는 사고를 한 번 겪고 나서.

### 카테고리 매핑은 N:M이 본질이었습니다

대시보드에 univstore와 동일한 8 × 65 × 444 메가메뉴를 만들고 싶었습니다. 메인 페이지의 SSR HTML에 카테고리 트리가 그대로 들어있어서 한 번의 GET 요청으로 `taxonomy.json`을 추출할 수 있었습니다.

문제는 상품을 그 트리에 매핑하는 단계였습니다. 카테고리 페이지가 호출하는 API를 찾아 `/api/items/category/{slug}?ctg_sub_code=X&ctg_third_code=Y`를 시도했는데, third_code가 무시되어 `"Ok"` 텍스트만 돌아왔습니다. 한참 헤맨 끝에 원인이 `sort=recommend` 파라미터에 있다는 것을 알아냈습니다. sort를 빼거나 `sort=latest`로 바꾸면 third_code 필터링이 정상 동작합니다.

매핑을 다 끝내고 보니 또 다른 문제가 보였습니다. 갤럭시 S26 같은 상품은 univstore에서 "삼성전자"와 "퀄컴" 두 third에 동시 노출되는데, 우리는 단일 컬럼이라 마지막 매핑이 이전 값을 덮어쓰고 있었습니다. PostgreSQL의 `text[]` 배열 컬럼으로 스키마를 바꾸고, 매핑 스크립트는 `array_append`로 누적하도록 고쳤습니다. 대시보드의 카테고리 필터는 `where: { thirdCategories: { has: '삼성전자' } }`로 변경했고, 카운트 표시는 `CROSS JOIN LATERAL UNNEST` + `COUNT(DISTINCT id)`로 처리합니다.

### Prisma 5.22의 한계도 마주쳤습니다

`/market` 페이지에서 `prisma.product.findMany({ select: { ..., priceHistory: { ... } } })`가 32,000건이 넘어가자 query engine이 `record.rs:69: no entry found for key`로 panic하기 시작했습니다. 알려진 5.22의 nested select 한계로 보입니다. `priceHistory`를 별도 쿼리로 분리해도 IN clause에 32k id가 들어가니 같은 panic이 발생했고, 결국 `$queryRaw`로 Postgres `DISTINCT ON`을 직접 쓰는 게 가장 안정적인 우회였습니다.

## 측정해본 수치들

| 지표 | 값 |
|------|---|
| 추적 상품 수 | 약 33,000개 |
| 한 건당 평균 처리 시간 (DirectApi) | 0.72초 |
| 전체 cycle 완료 시간 | 약 6.6시간 |
| 운영 주기 | 12시간 cron, 하루 2 cycle |
| 차단 발생 후 자동 복구 | 10분 쿨다운 + 1시간 안정기 자동 복귀 |
| N:M 매핑 정확도 | 90.1%가 3단계까지 완성, 5.0% 미매핑 |

## 주요 의사결정 인덱스

이 프로젝트에서 회고할 만한 결정들을 commit 메시지 단위로 따라갈 수 있습니다.

- ZSET 작업 큐 도입 (`feat(crawler): Redis ZSET 기반 Producer-Consumer (Daemon) 아키텍처 구현`)
- DirectApi 모드 (`feat(crawler): 페이지 로드를 건너뛰는 DirectApi 모드 도입`)
- BlockGuard 자동 보호 (`feat(crawler): 차단 발생 자동 보호를 위한 BlockGuard 모듈 추가`)
- 무한 순환에서 종료 모드로 전환 (`feat(crawler): 무한 순환에서 cycle 완료 시 종료 모드로 전환`)
- N:M 매핑 schema 확장 (`feat(db): 카테고리 컬럼을 N:M 매핑이 가능한 String[] 배열로 확장`)

## 기술 스택

- 수집: Playwright, playwright-extra, puppeteer-extra-plugin-stealth, 정식 Google Chrome
- 큐 / 캐시: Redis (Sorted Set 작업 큐, List 알림 큐, Hash retry counter)
- 데이터: PostgreSQL 15, Prisma 5.22
- 대시보드: Next.js 16, React 19, TailwindCSS, Recharts
- 인프라: Docker Compose, PM2, nginx-proxy + letsencrypt-companion
- 알림: Telegram Bot API

## 실행

전제 조건: Node.js 20+, Docker, 그리고 대상 사이트의 본인 계정.

```bash
cp .env.example .env
# .env를 자신의 환경에 맞게 채워야 합니다

docker compose up -d        # postgres, redis, dashboard 기동
cd packages/crawler
npx prisma migrate deploy   # DB 스키마 적용

pm2 start ecosystem.config.js
```

세부 기동 명령은 `ecosystem.config.js`와 각 패키지의 `package.json`을 참고하세요.

## ⚠️ 면책 / Legal Notice

이 코드는 학습·연구 목적의 기술 데모입니다.

- 본 코드를 사용해 실제 사이트에 접속하는 행위는 사용자 본인의 책임이며, 대상 서비스의 이용약관, robots.txt, 그리고 관련 법규(저작권법, 부정경쟁방지법, 정보통신망법 등)를 준수해야 합니다.
- 원작자는 본 코드의 사용으로 발생한 약관 위반, 계정 정지, 법적 분쟁, 서비스 차단 등 어떠한 결과에도 책임지지 않습니다.
- `.env`에 자격 증명을 입력하지 않으면 동작하지 않으며, 자격 증명을 입력해 실행하는 시점부터 모든 책임은 사용자에게 있습니다.

This project is provided for educational purposes only. The author assumes no liability for any misuse. By using this code, you agree to use it lawfully and at your own risk.

라이센스는 [MIT](./LICENSE).
