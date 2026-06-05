"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import AuthButton from "@/components/AuthButton";

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/' },
  { name: 'Explorer', href: '/products' },
  { name: 'Market', href: '/market' },
  { name: 'Terminal', href: '/terminal' },
  { name: 'Watchlist', href: '/watchlist' },
  { name: 'Settings', href: '/settings' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 md:px-6 py-4 flex justify-between items-center mb-4">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-zinc-900 rounded-md animate-pulse" />
        <span className="text-xl font-black tracking-tighter text-white">UnivWatch.</span>
      </div>
    </nav>
  );

  return (
    <nav className="sticky top-0 z-[100] relative glass border-b border-white/5 px-4 md:px-6 h-20 flex justify-between items-center mb-4">
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-2 relative z-[110]">
        <img src="/logo.svg" alt="UnivWatch" width={32} height={32} className="rounded-md" />
        <span className="text-xl font-black tracking-tighter text-white">UnivWatch.</span>
      </Link>

      {/* Desktop Navigation — 좌측 로고/우측 액션 폭과 무관하게 화면 정중앙 고정 */}
      <div className="hidden md:flex items-center space-x-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                isActive
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-200"
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Right Actions — 데스크탑만. 모바일 네비/로그인은 하단 탭바(BottomNav)가 담당 */}
      <div className="flex items-center space-x-4 relative z-[110]">
        <div className="hidden md:block">
          <AuthButton variant="desktop" />
        </div>
      </div>
    </nav>
  );
}
