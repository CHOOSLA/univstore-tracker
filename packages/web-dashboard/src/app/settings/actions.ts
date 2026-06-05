"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** 표시 이름 변경 (1~30자) */
export async function updateMyName(name: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 30) {
    return { success: false, error: "이름은 1~30자로 입력해 주세요." };
  }
  try {
    await prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
    revalidatePath("/settings");
    return { success: true, name: trimmed };
  } catch (err: any) {
    console.error("❌ 이름 변경 실패:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 회원 탈퇴 (완전 삭제).
 * User를 삭제하면 Account/Session/WatchlistItem/PriceAlert가 전부 cascade 삭제된다.
 * 같은 소셜 계정으로 재로그인하면 adapter가 새 User를 생성해 새 계정처럼 시작된다.
 */
export async function deleteMyAccount() {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };
  try {
    // 텔레그램 연동행은 onDelete: SetNull이라 떠도는 익명행이 남으므로 먼저 제거
    await prisma.telegramSubscriber.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  } catch (err: any) {
    console.error("❌ 회원 탈퇴 실패:", err.message);
    return { success: false, error: err.message };
  }
}
