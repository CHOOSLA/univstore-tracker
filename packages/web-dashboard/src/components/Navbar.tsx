"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/' },
  { name: 'Explorer', href: '/products' },
  { name: 'Market', href: '/market' },
  { name: 'Specials', href: '/specials' },
  { name: 'Terminal', href: '/terminal' },
  { name: 'Alerts', href: '/alerts' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center mb-4">
      <Link href="/" className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">U</div>
        <span className="text-xl font-black tracking-tighter text-white">UnivWatch.</span>
      </Link>
      
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

      <div className="flex items-center space-x-4">
        <div className="px-3 py-1.5 bg-zinc-950 border border-white/5 rounded-full flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">System Online</span>
        </div>
      </div>
    </nav>
  );
}
