import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ alerts: [] });
  }

  try {
    const alerts = await prisma.priceAlert.findMany({
      where: {
        subscriberToken: token,
      },
      include: {
        product: {
          select: {
            title: true,
            brand: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ alerts });
  } catch (err: any) {
    console.error("❌ Alerts API 조회 실패:", err.message);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
