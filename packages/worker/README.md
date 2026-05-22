# worker

크롤러가 Redis 큐에 넣은 가격 페이로드를 소비해 PostgreSQL에 저장하고, 가격 변동/목표가 도달을 텔레그램으로 알리는 단일 인스턴스 워커입니다.

## 역할

수집 단계와 영속화 단계를 분리하기 위한 인디렉션 레이어입니다. 크롤러가 빠르게 큐에 push하고 곧장 다음 ID로 넘어가게 두려면 DB write와 알림 발송은 다른 프로세스에서 책임지는 편이 낫습니다.

- `univstore:price_updates` (Redis List)에서 `blpop`으로 페이로드를 꺼냄
- 가격 변동이 있으면 `PriceHistory`에 새 row 기록, 상품 메타데이터는 `upsert`
- 사용자가 `PriceAlert`로 설정한 목표가 아래로 떨어지면 텔레그램 메시지 발송
- `SystemLog` 테이블에 알림 발송 이력 기록

## 알림 로직에서 신경 쓴 것

처음에는 가격이 떨어지면 무조건 알림을 보냈는데, 같은 상품의 사소한 변동에 알림이 폭주했습니다. 그래서 두 가지 조건을 도입했습니다.

첫째, 목표가 알림은 **하루 한 번**만 발송합니다. `PriceAlert.lastNotifiedAt`을 자정 기준으로 비교해서 같은 날 두 번 이상 안 가게 막았습니다. 둘째, 일반 가격 하락 알림은 사용자가 `SystemConfig`에서 설정한 `MIN_DROP_RATE` 이상일 때만 발송합니다(기본 10%). 5%, 3% 같은 노이즈는 차단.

텔레그램 봇 설정이 없는 환경에서도 시스템은 그대로 돌아갑니다(`bot`이 null일 때 메시지 단계만 skip). 개발 환경과 운영 환경 모두 같은 코드로 굴리기 위해서.

## 큰 결과셋에서 발견한 Prisma 5.22의 한계

대시보드 작업 중 부수적으로 알게 된 사실이지만 여기 적어둡니다. `prisma.product.findMany({ select: { ..., priceHistory: { ... } } })`에 nested select를 걸고 32,000+ row를 가져오면 query engine이 `record.rs:69: no entry found for key`로 panic합니다. 워커 자체는 단건 처리라 직접 영향은 없지만, 같은 Prisma 버전을 공유하는 대시보드 `/market` 페이지에서 한 차례 사고가 났습니다(루트 README의 의사결정 인덱스 참고).

## 안전한 종료

`SIGINT` / `SIGTERM` 핸들러로 Redis와 Prisma 연결을 모두 닫고 3초 안에 종료하지 못하면 강제 종료합니다. Docker compose나 PM2가 워커를 죽일 때 좀비 커넥션이 남지 않도록.

## 실행

```bash
# 환경 변수 (.env)에서 DATABASE_URL, REDIS_URL, TELEGRAM_BOT_TOKEN(선택)을 읽어옴
node index.js

# PM2로 (univ-worker)
pm2 start packages/worker/index.js --name univ-worker
```
