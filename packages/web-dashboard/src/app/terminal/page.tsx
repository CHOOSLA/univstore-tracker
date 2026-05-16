import React from 'react';
import { prisma } from "@/lib/prisma";
import Redis from 'ioredis';
import TerminalView from "@/components/terminal/TerminalView";

export const dynamic = 'force-dynamic';

export default async function TerminalPage() {
  // 1. Redis 큐 사이즈 조회
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  let queueSize = 0;
  try {
    queueSize = await redis.llen('univstore:price_updates');
  } catch (err) {
    console.error("Redis LLEN error:", err);
  } finally {
    await redis.quit();
  }

  // 2. DB 메트릭 조회
  const totalProducts = await prisma.product.count();
  const totalHistory = await prisma.priceHistory.count();

  // 3. 최신 시스템 로그 20개 조회
  const rawLogs = await prisma.systemLog.findMany({
    orderBy: { time: 'desc' },
    take: 20,
  });

  const formattedLogs = rawLogs.map(log => ({
    id: log.id,
    time: log.time.toLocaleTimeString('ko-KR', { hour12: false }),
    type: log.type,
    service: log.service,
    message: log.message
  }));

  return (
    <TerminalView 
      logs={formattedLogs}
      queueSize={queueSize}
      totalProducts={totalProducts}
      totalHistory={totalHistory}
    />
  );
}
