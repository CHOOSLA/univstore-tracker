import React from 'react';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Redis from 'ioredis';
import TerminalView from "@/components/terminal/TerminalView";
import { getStorageMetrics } from "./actions";
import { isAdmin } from "@/lib/admin";

export const dynamic = 'force-dynamic';

export default async function TerminalPage() {
  // 관리자 전용. 비관리자는 홈으로 리다이렉트 (URL 직접 접근 차단)
  if (!(await isAdmin())) redirect('/');

  // 1. Redis 큐 사이즈 조회
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);
  
  const redis = new Redis({
    host: url.hostname,
    port: parseInt(url.port),
    password: url.password || undefined,
    username: url.username || undefined,
    db: parseInt(url.pathname.split('/')[1] || '0'),
    lazyConnect: true
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

  // 2. DB 메트릭 및 스토리지 메트릭 조회
  const [totalProducts, totalHistory, crawlerStatus, storage, dbStats] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.priceHistory.count().catch(() => 0),
    prisma.crawlerStatus.findUnique({ where: { id: 'singleton' } }),
    getStorageMetrics(),
    prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size('univstore')) as size`.catch(() => [{ size: '0 MB' }])
  ]);

  // 3. 최신 시스템 로그 조회
  const rawLogs = await prisma.systemLog.findMany({
    orderBy: { time: 'desc' },
    take: 20,
  }).catch(() => []);

  const formattedLogs = rawLogs.map(log => ({
    id: log.id,
    time: log.time.toLocaleTimeString('ko-KR', { hour12: false }),
    type: log.type,
    service: log.service,
    message: log.message
  }));

  // 4. 데이터 이슈 조회
  const rawIssues = await prisma.dataIssue.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
  }).catch(() => []);

  const formattedIssues = rawIssues.map(issue => ({
    id: issue.id,
    productId: issue.productId,
    type: issue.type,
    message: issue.message,
    timestamp: issue.timestamp.toISOString()
  }));

  return (
    <TerminalView 
      logs={formattedLogs}
      dataIssues={formattedIssues}
      queueSize={queueSize}
      totalProducts={totalProducts}
      totalHistory={totalHistory}
      crawlerStatus={crawlerStatus ? JSON.parse(JSON.stringify(crawlerStatus)) : null}
      storageMetrics={{
        diskUsed: storage.diskUsed || '0',
        diskTotal: storage.diskTotal || '0',
        diskPercent: storage.diskPercent || 0,
        dbSize: (dbStats as any)[0]?.size || '0 MB'
      }}
    />
  );
}
