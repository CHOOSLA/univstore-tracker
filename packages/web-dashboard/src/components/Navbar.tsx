"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/' },
  { name: 'Explorer', href: '/products' },
  { name: 'Market', href: '/market' },
  { name: 'Terminal', href: '/terminal' },
  { name: 'Alerts', href: '/alerts' },
  { name: 'Settings', href: '/settings/benefits' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 md:px-6 py-4 flex justify-between items-center mb-4" suppressHydrationWarning>
      <Link href="/" className="flex items-center space-x-2 relative z-[60]">
        <img src="/logo.svg" alt="UnivWatch" width={32} height={32} className="rounded-md" />
        <span className="text-xl font-black tracking-tighter text-white">UnivWatch.</span>
      </Link>
      
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
        {mounted && NAV_ITEMS.map((item) => {
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

      <div className="flex items-center space-x-4 relative z-[60]">
        {mounted && (
          <div className="hidden sm:flex px-3 py-1.5 bg-zinc-950 border border-white/5 rounded-full items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">System Online</span>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={cn(
        "fixed inset-x-0 bottom-0 top-[73px] bg-zinc-950/95 backdrop-blur-xl z-[50] transition-all duration-300 md:hidden flex flex-col justify-center items-center space-y-8 border-t border-white/5",
        isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      )}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "text-2xl font-black uppercase tracking-[0.2em] transition-all",
                isActive ? "text-blue-500" : "text-zinc-500 hover:text-white"
              )}
            >
              {item.name}
            </Link>
          );
        })}
        
        <div className="pt-8 border-t border-white/5 w-1/2 flex justify-center">
          <div className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-full flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
