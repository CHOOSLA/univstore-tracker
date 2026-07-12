"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Loader2, X } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');

  // URL 파라미터와 동기화
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // 엔터 키 입력 시 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery('');
    handleSearch('');
  };

  return (
    <div
      style={{ viewTransitionName: 'main-search' }}
      className="relative w-full flex items-center rounded-2xl border border-white/10 bg-zinc-900/60 transition-all duration-200 focus-within:border-blue-500/60 focus-within:bg-zinc-900 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.12)]">
      <Search className={`absolute left-5 transition-colors ${isPending ? 'text-blue-400' : 'text-zinc-500'}`} size={20} />

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="상품·브랜드 검색..."
        className="w-full bg-transparent border-none rounded-2xl py-3.5 md:py-5 pl-12 md:pl-14 pr-24 md:pr-36 text-sm md:text-base focus:outline-none placeholder:text-zinc-600 font-medium text-white"
      />

      <div className="absolute right-2.5 md:right-3 flex items-center gap-1.5 md:gap-2">
        {query && !isPending && (
          <button onClick={clearSearch} className="p-1.5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
        {isPending && <Loader2 className="text-blue-400 animate-spin" size={18} />}
        <button
          onClick={() => handleSearch(query)}
          disabled={isPending}
          aria-label="검색"
          className="flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-600/20"
        >
          <Search size={16} className="md:hidden" />
          <span className="hidden md:inline">검색</span>
        </button>
      </div>
    </div>
  );
}
