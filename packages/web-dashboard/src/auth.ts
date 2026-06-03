import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js v5 설정.
 * - provider client id/secret은 env 자동 추론: AUTH_GOOGLE_ID/SECRET, AUTH_KAKAO_ID/SECRET
 * - 세션 암호화: AUTH_SECRET
 * - trustHost: duckdns 리버스 프록시 뒤에서 동작하므로 필요
 * - 세션 전략: database (Session 테이블 사용, adapter 기본값)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Kakao({
      // 카카오 프로필/이메일 동의항목 (콘솔에서 동의항목 활성화 필요)
      authorization: { params: { scope: "profile_nickname profile_image account_email" } },
    }),
  ],
  trustHost: true,
  session: { strategy: "database" },
  callbacks: {
    // database 세션: user(DB row)의 id를 세션에 노출 → 서버 액션에서 소유자 식별
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
