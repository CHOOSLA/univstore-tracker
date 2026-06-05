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
 * 회원 탈퇴 (soft delete).
 * deletedAt만 세팅해 데이터(관심상품·알림·연동)는 보존하고, 세션을 즉시 삭제해
 * 강제 로그아웃한다. 이후 로그인은 auth signIn 콜백에서 차단된다.
 */
export async function deleteMyAccount() {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "로그인이 필요합니다." };
  try {
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    await prisma.session.deleteMany({ where: { userId } });
    return { success: true };
  } catch (err: any) {
    console.error("❌ 회원 탈퇴 실패:", err.message);
    return { success: false, error: err.message };
  }
}
