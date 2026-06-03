"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** 관심상품 토글. 반환: { watched } 최종 상태 */
export async function toggleWatchlist(productId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, watched: false, error: "로그인이 필요합니다." };
  try {
    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await prisma.watchlistItem.delete({ where: { id: existing.id } });
      revalidatePath("/watchlist");
      revalidatePath(`/product/${productId}`);
      return { success: true, watched: false };
    }
    await prisma.watchlistItem.create({ data: { userId, productId } });
    revalidatePath("/watchlist");
    revalidatePath(`/product/${productId}`);
    return { success: true, watched: true };
  } catch (err: any) {
    console.error("❌ Watchlist 토글 실패:", err.message);
    return { success: false, watched: false, error: err.message };
  }
}

/** 특정 상품 찜 여부 */
export async function isWatched(productId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const row = await prisma.watchlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  return !!row;
}

/** 내 관심상품 productId 목록 (목록/카드 하트 초기상태용) */
export async function getMyWatchlistIds(): Promise<string[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const rows = await prisma.watchlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}

/** 내 관심상품 목록 (가격/등급 포함) */
export async function getMyWatchlist() {
  const userId = await currentUserId();
  if (!userId) return [];
  return prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productId: true,
      createdAt: true,
      product: {
        select: {
          title: true,
          brand: true,
          imageUrl: true,
          currentPrice: true,
          originalPrice: true,
          priceScore: true,
          stockStatus: true,
        },
      },
    },
  });
}
