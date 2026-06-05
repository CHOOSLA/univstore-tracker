import { auth } from "@/auth";

/** 콤마 구분 ADMIN_EMAILS env → 소문자 배열로 정규화 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 현재 세션 사용자가 관리자 화이트리스트에 포함되는지 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return getAdminEmails().includes(email);
}
