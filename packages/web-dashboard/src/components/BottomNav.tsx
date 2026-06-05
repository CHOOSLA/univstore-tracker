"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { LayoutDashboard, Compass, BarChart3, Heart, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { name: "홈", href: "/", icon: LayoutDashboard },
  { name: "탐색", href: "/products", icon: Compass },
  { name: "마켓", href: "/market", icon: BarChart3 },
  { name: "관심", href: "/watchlist", icon: Heart },
];

/**
 * 모바일 전용 하단 탭바. 데스크탑(md+)은 상단 Navbar가 담당하므로 md:hidden.
 * 로그인/계정은 마지막 "프로필" 탭이 담당(설정 페이지로 이동 또는 로그인).
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !!pathname?.startsWith(href);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-zinc-950/90 backdrop-blur-lg border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-blue-400" : "text-zinc-500"
              )}
            >
              <Icon size={20} fill={t.href === "/watchlist" && active ? "currentColor" : "none"} />
              <span className="text-[10px] font-black tracking-tight">{t.name}</span>
            </Link>
          );
        })}

        {/* 프로필 / 로그인 */}
        {status === "authenticated" ? (
          <Link
            href="/settings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              isActive("/settings") ? "text-blue-400" : "text-zinc-500"
            )}
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt="" className="w-5 h-5 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-[9px] font-black text-blue-200">
                {(session?.user?.name || "U")[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-black tracking-tight">프로필</span>
          </Link>
        ) : (
          <button
            onClick={() => signIn()}
            className="flex flex-col items-center justify-center gap-1 text-zinc-500"
          >
            <UserIcon size={20} />
            <span className="text-[10px] font-black tracking-tight">로그인</span>
          </button>
        )}
      </div>
    </nav>
  );
}
