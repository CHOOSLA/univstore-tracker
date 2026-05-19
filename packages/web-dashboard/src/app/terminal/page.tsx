import React from 'react';
import { prisma } from "@/lib/prisma";
import Redis from 'ioredis';
import TerminalView from "@/components/terminal/TerminalView";

export const dynamic = 'force-dynamic';

export default async function TerminalPage() {
  // 1. Redis 큐 사이즈 조회 (객체 기반 연결로 url.parse 경고 원천 차단)
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);
  
  const redis = new Redis({
    host: url.hostname,
    port: parseInt(url.port),
    password: url.password || undefined,
    username: url.username || undefined,
    db: parseInt(url.pathname.split('/')[1] || '0'),
    lazyConnect: true // 연결 실패 시 서버가 죽지 않도록 설정
  });
  
  let queueSize = 0;
  try {
    await redis.connect();
    queueSize = await redis.llen('univstore:price_updates');
  } catch (err) {
    console.error("Redis connection error:", err);
  } finally {
    await redis.disconnect();
  }

  // 2. DB 메트릭 조회 (모델 존재 여부 안전하게 확인)
  const totalProducts = await prisma.product.count().catch(() => 0);
  const totalHistory = await prisma.priceHistory.count().catch(() => 0);

  // 3. 최신 시스템 로그 조회
  let rawLogs = [];
  try {
    rawLogs = await prisma.systemLog.findMany({
      orderBy: { time: 'desc' },
      take: 20,
    });
  } catch (err) {
    console.error("Prisma SystemLog Query Error:", err);
  }

  const formattedLogs = rawLogs.map(log => ({
    id: log.id,
    time: log.time.toLocaleTimeString('ko-KR', { hour12: false }),
    type: log.type,
    service: log.service,
    message: log.message
  }));

  // 4. 데이터 이슈 조회
  let rawIssues = [];
  try {
    rawIssues = await prisma.dataIssue.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
  } catch (err) {
    console.error("Prisma DataIssue Query Error:", err);
  }

  const formattedIssues = rawIssues.map(issue => ({
    id: issue.id,
    productId: issue.productId,
    type: issue.type,
    message: issue.message,
    timestamp: issue.timestamp.toISOString()
  }));

  // 5. 크롤러 상태 조회 (신설)
  const crawlerStatus = await prisma.crawlerStatus.findUnique({
    where: { id: 'singleton' }
  });

  return (
    <TerminalView 
      logs={formattedLogs}
      dataIssues={formattedIssues}
      queueSize={queueSize}
      totalProducts={totalProducts}
      totalHistory={totalHistory}
      crawlerStatus={crawlerStatus ? JSON.parse(JSON.stringify(crawlerStatus)) : null}
    />
  );
}
