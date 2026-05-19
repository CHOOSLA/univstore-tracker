import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const [status, logs, totalHistory] = await Promise.all([
            prisma.crawlerStatus.findUnique({ where: { id: 'singleton' } }),
            prisma.systemLog.findMany({ orderBy: { time: 'desc' }, take: 15 }),
            prisma.priceHistory.count() 
          ]);

          const data = JSON.stringify({
            crawlerStatus: status,
            logs: logs.map(l => ({
              id: l.id,
              time: l.time.toLocaleTimeString('ko-KR', { hour12: false }),
              type: l.type,
              service: l.service,
              message: l.message
            })),
            totalHistory
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (e) {
          console.error("SSE Stream Error:", e);
        }
      };

      const interval = setInterval(sendUpdate, 2000);
      await sendUpdate();

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
