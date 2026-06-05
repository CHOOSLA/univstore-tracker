"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Monitor, ShieldCheck } from "lucide-react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 페이지 이동 시 메뉴 닫기 및 스크롤 고정 해제
  useEffect(() => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'unset';
  }, [pathname]);

  // 메뉴 열림/닫힘에 따른 스크롤 제어
  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    if (newState) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  if (!mounted) return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 md:px-6 py-4 flex justify-between items-center mb-4">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-zinc-900 rounded-md animate-pulse" />
        <span className="text-xl font-black tracking-tighter text-white">UnivWatch.</span>
      </div>
    </nav>
  );

  return (
    <nav className={cn(
      "sticky top-0 z-[100] border-b border-white/5 px-4 md:px-6 h-20 flex justify-between items-center mb-4 transition-all duration-300",
      isMenuOpen ? "bg-zinc-950" : "glass"
    )}>
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-2 relative z-[110]">
        <img src="/logo.svg" alt="UnivWatch" width={32} height={32} className="rounded-md" />
        <span className="text-xl font-black tracking-tighter text-white">UnivWatch.</span>
      </Link>
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
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

      {/* Right Actions */}
      <div className="flex items-center space-x-4 relative z-[110]">
        <div className="hidden sm:flex px-3 py-1.5 bg-zinc-950 border border-white/5 rounded-full items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-tighter">System Online</span>
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:block">
          <AuthButton variant="desktop" />
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={cn(
        "fixed inset-0 top-20 bg-zinc-950 z-[90] transition-all duration-500 md:hidden flex flex-col items-center justify-start pt-20 space-y-8 border-t border-white/10",
        isMenuOpen 
          ? "opacity-100 translate-y-0 visible" 
          : "opacity-0 -translate-y-4 invisible"
      )}>
        {NAV_ITEMS.map((item, i) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "text-3xl font-black uppercase tracking-[0.2em] transition-all duration-300",
                isActive ? "text-blue-500 scale-110" : "text-zinc-600 hover:text-white",
                isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              )}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              {item.name}
            </Link>
          );
        })}
        
        <div className={cn(
          "pt-12 border-t border-white/5 w-2/3 flex flex-col items-center space-y-6 transition-all duration-700 delay-300",
          isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <div className="w-full">
            <AuthButton variant="mobile" />
          </div>
          <div className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-full flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">System Online</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.4em]">UnivWatch Intel Engine</p>
        </div>
      </div>
    </nav>
  );
}
