"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

/** 로그인한 사용자 id 반환, 없으면 null */
async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * 목표가 알림 생성/수정 (계정 귀속).
 * 같은 상품에 이미 알림이 있으면 목표가만 갱신.
 */
export async function createPriceAlert(productId: string, targetPrice: number) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return { success: false, error: "목표가가 올바르지 않습니다." };
  }
  try {
    const existing = await prisma.priceAlert.findFirst({ where: { userId, productId } });
    if (existing) {
      await prisma.priceAlert.update({
        where: { id: existing.id },
        data: { targetPrice, isActive: true },
      });
    } else {
      await prisma.priceAlert.create({
        data: { productId, targetPrice, isActive: true, userId },
      });
    }
    // 목표가는 추적(찜) 상품의 속성이다. 단일 리스트 일관성을 위해 자동으로 관심상품에 담는다.
    await prisma.watchlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
    revalidatePath(`/product/${productId}`);
    revalidatePath("/watchlist");
    return { success: true };
  } catch (err: any) {
    console.error("❌ PriceAlert 생성 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function deletePriceAlert(id: number) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };
  try {
    // 소유자 검증 후 삭제 (deleteMany로 userId 조건 강제)
    const res = await prisma.priceAlert.deleteMany({ where: { id, userId } });
    if (res.count === 0) return { success: false, error: "알림을 찾을 수 없습니다." };
    revalidatePath("/watchlist");
    revalidatePath("/alerts");
    return { success: true };
  } catch (err: any) {
    console.error("❌ PriceAlert 삭제 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function togglePriceAlert(id: number, isActive: boolean) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };
  try {
    const res = await prisma.priceAlert.updateMany({ where: { id, userId }, data: { isActive } });
    if (res.count === 0) return { success: false, error: "알림을 찾을 수 없습니다." };
    revalidatePath("/alerts");
    return { success: true };
  } catch (err: any) {
    console.error("❌ PriceAlert 토글 실패:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 로그인 사용자의 텔레그램 연동 토큰 발급/조회.
 * userId에 귀속된 TelegramSubscriber를 find-or-create (chatId는 봇 /start 시 채워짐).
 * 반환: { token, linked } — linked는 chatId 연결 완료 여부.
 */
export async function getTelegramLinkToken() {
  const userId = await currentUserId();
  if (!userId) return null;
  let sub = await prisma.telegramSubscriber.findFirst({ where: { userId } });
  if (!sub) {
    const token = "UW-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    sub = await prisma.telegramSubscriber.create({ data: { token, chatId: "", userId } });
  }
  return { token: sub.token, linked: !!sub.chatId };
}

/** 내 목표가 알림 목록 (현재가 포함) */
export async function getMyPriceAlerts() {
  const userId = await currentUserId();
  if (!userId) return [];
  return prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productId: true,
      targetPrice: true,
      isActive: true,
      lastNotifiedAt: true,
      product: {
        select: { title: true, brand: true, imageUrl: true, currentPrice: true },
      },
    },
  });
}

export async function getSystemConfig() {
  const configs = await prisma.systemConfig.findMany();
  const configMap: Record<string, string> = {};
  configs.forEach(c => configMap[c.key] = c.value);
  
  return {
    TELEGRAM_ENABLED: configMap['TELEGRAM_ENABLED'] || 'true',
    MIN_DROP_RATE: configMap['MIN_DROP_RATE'] || '10',
    HEALTH_ALERTS_ENABLED: configMap['HEALTH_ALERTS_ENABLED'] || 'true',
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'UnivWatchBot'
  };
}

export async function updateSystemConfig(key: string, value: string) {
  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    revalidatePath('/alerts');
    return { success: true };
  } catch (err: any) {
    console.error("❌ SystemConfig 업데이트 실패:", err.message);
    return { success: false, error: err.message };
  }
}
