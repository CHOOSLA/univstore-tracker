"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 로그인/로그아웃 UI.
 * - desktop: 컴팩트 버튼 + provider 드롭다운
 * - mobile: 드로어용 풀폭 버튼
 */
export default function AuthButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const isMobile = variant === "mobile";

  // 로딩 스켈레톤
  if (status === "loading") {
    return <div className={cn("rounded-full bg-zinc-800 animate-pulse", isMobile ? "h-12 w-40" : "h-9 w-24")} />;
  }

  // 로그인 상태
  if (session?.user) {
    const name = session.user.name || session.user.email || "User";
    const img = session.user.image;
    if (isMobile) {
      return (
        <div className="flex flex-col items-center space-y-4 w-full">
          <div className="flex items-center gap-3">
            {img ? (
              <img src={img} alt="" width={40} height={40} className="rounded-full border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-black">
                {name[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-lg font-black text-white truncate max-w-[180px]">{name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 font-black text-sm uppercase tracking-widest"
          >
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      );
    }
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-zinc-900 border border-white/5 hover:border-white/20 transition-colors"
        >
          {img ? (
            <img src={img} alt="" width={28} height={28} className="rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-black">
              {name[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-xs font-black text-zinc-200 max-w-[100px] truncate">{name}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[120]">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  // 로그아웃 상태 → provider 선택
  const providers = (
    <>
      <button
        onClick={() => signIn("kakao", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#FEE500] text-black font-black text-sm hover:brightness-95 transition-all"
      >
        <span>카카오로 시작</span>
      </button>
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-black font-black text-sm hover:brightness-95 transition-all"
      >
        <span>Google로 시작</span>
      </button>
    </>
  );

  if (isMobile) {
    return <div className="flex flex-col w-full gap-3">{providers}</div>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-400 transition-colors"
      >
        <LogIn size={14} /> 로그인
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-2 space-y-2 z-[120]">
          {providers}
        </div>
      )}
    </div>
  );
}
