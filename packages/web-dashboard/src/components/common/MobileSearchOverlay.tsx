"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowLeft, Clock } from "lucide-react";

const LS_KEY = "recentSearches";

/**
 * 모바일 전용 검색: navbar의 돋보기 아이콘 → 전체화면 검색 시트.
 * 좁은 화면에서 검색바가 nav 아래 한 줄을 더 먹지 않도록,
 * 검색 진입을 아이콘 한 개로 접고 실제 입력은 전체화면에서 처리한다.
 */
export default function MobileSearchOverlay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      setRecent(JSON.parse(localStorage.getItem(LS_KEY) || "[]"));
    } catch {}
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  const submit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    try {
      const next = [t, ...recent.filter((r) => r !== t)].slice(0, 8);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
    setOpen(false);
    setQ("");
    router.push(`/products?q=${encodeURIComponent(t)}`);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-1 text-zinc-300 hover:text-white transition-colors"
        aria-label="검색"
      >
        <Search size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] bg-zinc-950 flex flex-col md:hidden">
          {/* 상단 입력 바 */}
          <div className="flex items-center gap-2 px-3 h-16 border-b border-white/5 shrink-0">
            <button
              onClick={() => setOpen(false)}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit(q);
                }}
                enterKeyHint="search"
                placeholder="상품·브랜드 검색..."
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-3 pl-10 pr-10 text-sm text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
              />
              {q && (
                <button
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                  aria-label="지우기"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* 최근 검색 */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {recent.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">최근 검색</span>
                  <button
                    onClick={() => {
                      setRecent([]);
                      try { localStorage.removeItem(LS_KEY); } catch {}
                    }}
                    className="text-[11px] font-bold text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recent.map((term) => (
                    <div key={term} className="flex items-center justify-between rounded-xl hover:bg-white/[0.03] transition-colors">
                      <button
                        onClick={() => submit(term)}
                        className="flex items-center gap-3 flex-1 min-w-0 py-3 px-2 text-left"
                      >
                        <Clock size={15} className="text-zinc-600 shrink-0" />
                        <span className="text-sm font-medium text-zinc-200 truncate">{term}</span>
                      </button>
                      <button
                        onClick={() => removeRecent(term)}
                        className="p-2 text-zinc-600 hover:text-white shrink-0"
                        aria-label="삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 pb-20">
                <Search size={28} className="text-zinc-800" />
                <p className="text-xs font-bold text-zinc-600">상품명이나 브랜드로 검색해보세요</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
