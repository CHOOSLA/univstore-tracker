# web-dashboard

수집된 약 33,000개 상품의 가격 추이를 살펴보고 목표가 알림을 설정하는 Next.js 16 (App Router) 대시보드입니다.

## 화면 구성

- `/` — 랜딩. 추천 PICK 24개 + 최근 갱신된 상품 카드.
- `/products` — Explorer. univstore와 동일한 8 × 65 × 444 메가메뉴, 무한 스크롤, 검색·정렬·브랜드/카테고리 필터.
- `/product/[id]` — 상품 상세. 가격 차트(Recharts), 목표가 알림 설정.
- `/market` — 브랜드 점유율, 평균 할인율, 누적 절약 금액.
- `/alerts` — 활성/비활성 알림 목록과 트리거 이력.
- `/terminal` — 서버 상태 SSE 스트림(PM2 프로세스, Redis 큐 길이, DB 크기).
- `/specials` — 래플과 플래시 세일 정보.
- `/settings` — Telegram 알림 토글, `MIN_DROP_RATE` 같은 시스템 설정.

## 카테고리 메뉴는 처음 생각보다 까다로웠습니다

univstore의 메인 페이지를 한 번 GET하면 SSR로 렌더된 8 × 65 × 444 메뉴 트리가 그대로 HTML에 들어있습니다. 이걸 `taxonomy.json`으로 추출해 `src/lib/taxonomy.json`에 두고, `CategoryMenu.tsx` 컴포넌트가 hover 메가메뉴를 그립니다.

매핑 단계에서 한 가지 문제가 드러났습니다. 갤럭시 S26 같은 상품은 univstore의 "삼성전자"와 "퀄컴" 두 third 카테고리에 동시 등록되어 있는데, 처음 schema는 `thirdCategory String?` 단일 컬럼이라 매핑 스크립트의 마지막 처리가 이전 값을 덮어쓰고 있었습니다. 결과적으로 "삼성전자" 카테고리에서 갤럭시 S26이 사라지는 현상이 발생.

해결: `menuCategories`, `menuSubCategories`, `thirdCategories` 세 컬럼을 모두 `String[]` 배열(`text[]`)로 바꿨습니다. 매핑 스크립트는 `array_append`로 누적하고, 필터링은 `where: { thirdCategories: { has: '삼성전자' } }`로 변경. 카운트 표시는 `CROSS JOIN LATERAL UNNEST(...) + COUNT(DISTINCT id)`로 raw SQL. 단순 `unnest`를 SELECT 절에 여러 개 쓰니 배열 길이가 다른 row에서 NULL pad가 일어나 카운트가 부풀려지는 함정이 있었습니다.

## Prisma 5.22 query engine 패닉

`/market` 페이지가 어느 날부터 500을 뱉기 시작했습니다. 로그에 `PrismaClientRustPanicError: no entry found for key (query-engine/query-structure/src/record.rs:69)`. 재현해보니 `prisma.product.findMany({ select: { ..., priceHistory: { ... } } })`가 결과셋이 32,000건을 넘어가면 panic합니다. priceHistory를 분리한 `findMany`로 옮겨도 IN clause에 32k id가 들어가 같은 panic. 결국 `$queryRaw`로 Postgres `DISTINCT ON`을 직접 쓰는 게 가장 안정적인 우회였습니다.

```ts
const latestPrices = await prisma.$queryRaw<{ productId: string; price: number }[]>`
  SELECT DISTINCT ON (ph."productId") ph."productId", ph.price
  FROM "PriceHistory" ph
  INNER JOIN "Product" p ON p.id = ph."productId"
  WHERE p."originalPrice" > 0
  ORDER BY ph."productId", ph.timestamp DESC
`;
```

## OG image도 한 번 깨졌습니다

`/opengraph-image`가 502를 뱉어서 카카오톡 미리보기가 안 떴습니다. Next.js의 `ImageResponse`(satori 기반)는 자식 노드가 2개 이상인 모든 `<div>`에 명시적 `display`를 요구하는데, `Real-Time <span>Insights</span><br/>From UnivStore.` 구조가 위반이었습니다. 그 부분을 두 줄 div로 분리해서 해결. 로고는 빌드 시 `fs.readFileSync`로 `public/logo.svg`를 base64 data URL로 인라인합니다(runtime이 `nodejs`로 바뀐 이유).

## 실시간 관제: SSE 스트림

`/terminal`은 `/api/terminal/stream` 엔드포인트에서 2초 간격으로 PM2 프로세스 상태, Redis 큐 길이, DB 크기, 최근 SystemLog를 스트리밍합니다. SSE는 양방향이 아니라 서버 → 클라이언트 단방향이지만 이 용도엔 충분합니다.

## 기술 스택

- Next.js 16 (App Router), React 19
- TailwindCSS, Lucide Icons, Recharts
- Prisma 5.22 (PostgreSQL 15)
- nginx-proxy + letsencrypt-companion (Docker 환경)

## 실행

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드 + 실행
npm run build
npm start

# Docker로 통째로 (docker-compose.yml의 dashboard 서비스)
docker compose build dashboard
docker compose up -d dashboard
```

`.env`에 `DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_SITE_URL`이 필요합니다.

## 주의

`AGENTS.md`에 적어둔 대로, **Next.js 16은 이전 버전과 일부 API가 달라요**. `node_modules/next/dist/docs/`의 가이드를 먼저 확인하지 않으면 deprecated 경고를 만나기 쉽습니다.
