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
    <div className="relative flex-1 group">
      <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isPending ? 'text-blue-500' : 'text-zinc-500'}`} size={18} />
      
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search by brand, name, or product ID..." 
        className="w-full bg-transparent border-none rounded-2xl py-4 pl-14 pr-12 text-sm focus:outline-none placeholder:text-zinc-600 font-medium text-white"
      />

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
        {query && !isPending && (
          <button 
            onClick={clearSearch}
            className="p-1 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
        
        {isPending && (
          <Loader2 className="text-blue-500 animate-spin" size={18} />
        )}
        
        <button 
          onClick={() => handleSearch(query)}
          className="hidden md:block px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
