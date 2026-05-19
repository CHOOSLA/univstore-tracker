# 👷 UnivWatch Background Worker

Redis 큐를 구독하며 수집된 데이터를 처리하고 DB에 반영하는 고성능 비동기 처리 노드입니다.

## 🏗️ Role & Responsibility
- **Data Ingestion**: 크롤러로부터 넘어온 원시 JSON 데이터를 파싱합니다.
- **Deduplication & Diff**: 기존 DB의 가격과 비교하여 변동이 있을 때만 새로운 이력을 기록합니다.
- **Persistence**: PostgreSQL(Prisma)을 사용하여 상품 정보 및 가격 타임라인을 관리합니다.
- **Health Tracking**: 수집 중 발생한 데이터 무결성 이슈(`INVALID_PRICE` 등)를 감지하여 별도의 테이블에 기록합니다.

## 🚀 Key Features
- **Price History Automation**: 가격 변동이 감지되면 자동으로 새로운 `PriceHistory` 레코드를 생성하여 그래프 시각화를 지원합니다.
- **Error Reporting**: 데이터 정합성 오류를 실시간으로 분류하여 대시보드의 'Data Quality' 섹션으로 전송합니다.
- **Concurrent Processing**: 여러 워커 노드를 띄워 대규모 트래픽 처리가 가능하도록 설계되었습니다.

## ⚙️ How to Run
```bash
# 워커 실행 (PM2: univ-worker)
node index.js
```
