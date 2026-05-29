"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLACEHOLDERS = [
  'MacBook Air M3 검색...',
  '10만원 이하 무선 이어폰',
  '5만 ~ 20만 가방',
  '역대최저 키보드',
  '갤럭시 S25 검색...',
  '30% 할인 Apple',
  'iPad 검색...',
];

export default function HomeSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayPlaceholder, setDisplayPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const charIdx = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 타이핑 애니메이션
  useEffect(() => {
    if (focused) return;
    const target = PLACEHOLDERS[placeholderIdx];

    if (isTyping) {
      if (charIdx.current <= target.length) {
        setDisplayPlaceholder(target.slice(0, charIdx.current));
        charIdx.current++;
        timeoutRef.current = setTimeout(() => {}, 60);
      } else {
        timeoutRef.current = setTimeout(() => setIsTyping(false), 1800);
        return;
      }
    } else {
      if (charIdx.current > 0) {
        charIdx.current--;
        setDisplayPlaceholder(target.slice(0, charIdx.current));
      } else {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
        setIsTyping(true);
        return;
      }
    }
  });

  useEffect(() => {
    if (focused) return;
    const target = PLACEHOLDERS[placeholderIdx];
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (isTyping) {
        if (charIdx.current <= target.length) {
          setDisplayPlaceholder(target.slice(0, charIdx.current));
          charIdx.current++;
          timeoutRef.current = setTimeout(tick, 65);
        } else {
          timeoutRef.current = setTimeout(() => {
            if (!cancelled) setIsTyping(false);
          }, 1800);
        }
      } else {
        if (charIdx.current > 0) {
          charIdx.current--;
          setDisplayPlaceholder(target.slice(0, charIdx.current));
          timeoutRef.current = setTimeout(tick, 35);
        } else {
          setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
          setIsTyping(true);
        }
      }
    };

    charIdx.current = 0;
    tick();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [placeholderIdx, isTyping, focused]);

  // "/" 단축키로 포커스
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  }, [query, router]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={cn(
        'relative flex items-center rounded-[28px] border transition-all duration-300',
        focused
          ? 'border-blue-500/60 bg-zinc-900/80 shadow-[0_0_40px_rgba(59,130,246,0.12)]'
          : 'border-white/8 bg-zinc-900/40 hover:border-white/15'
      )}>

        {/* 검색 아이콘 */}
        <Search
          size={18}
          className={cn(
            'absolute left-6 transition-colors duration-200 shrink-0',
            focused ? 'text-blue-400' : 'text-zinc-600'
          )}
        />

        {/* 입력창 */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={displayPlaceholder}
          className="w-full bg-transparent py-5 pl-14 pr-40 text-white text-lg font-medium placeholder:text-zinc-600 focus:outline-none"
        />

        {/* 우측: 단축키 힌트 + 버튼 */}
        <div className="absolute right-3 flex items-center space-x-3">
          {!focused && !query && (
            <kbd className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-zinc-800 border border-white/10 rounded-lg text-[10px] font-black text-zinc-500 uppercase tracking-wider">
              <span>/</span>
            </kbd>
          )}
          <button
            type="submit"
            disabled={!query.trim()}
            className={cn(
              'flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200',
              query.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            <span>Search</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </form>
  );
}
