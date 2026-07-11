"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X, SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatNode } from "@/lib/categoryTree";

interface Props {
  tree: CatNode[];
}

// 선택된 code의 조상 code 집합(활성 하이라이트용) + 최심 노드 이름
function findPath(tree: CatNode[], code: string | null): CatNode[] {
  if (!code) return [];
  const dfs = (nodes: CatNode[], trail: CatNode[]): CatNode[] | null => {
    for (const n of nodes) {
      const next = [...trail, n];
      if (n.code === code) return next;
      const hit = dfs(n.children, next);
      if (hit) return hit;
    }
    return null;
  };
  return dfs(tree, []) || [];
}

export default function CategoryMenu({ tree }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("category");
  const [openCode, setOpenCode] = useState<string | null>(null); // 데스크톱 메가메뉴 (depth1 code)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobileExpand, setMobileExpand] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const path = useMemo(() => findPath(tree, current), [tree, current]);
  const activeCodes = useMemo(() => new Set(path.map((n) => n.code)), [path]);
  const triggerLabel = path.length ? path[path.length - 1].name : "전체 카테고리";
  const hasFilter = Boolean(current);

  useEffect(() => {
    if (!openCode) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenCode(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openCode]);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  const select = (code: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (code) params.set("category", code);
    else params.delete("category");
    router.push(`/products?${params.toString()}`);
    setOpenCode(null);
    setSheetOpen(false);
  };

  const openSheet = () => {
    setMobileExpand(path[0]?.code ?? null);
    setSheetOpen(true);
  };

  return (
    <>
      {/* ===== 데스크톱: 메가메뉴 ===== */}
      <div className="relative hidden md:block" ref={menuRef}>
        <nav className="flex items-center gap-1.5 bg-zinc-900/30 p-2 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar py-2">
          <button
            onClick={() => select(null)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap",
              !current ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
            )}
          >
            All
          </button>
          {tree.map((d1) => {
            const isActive = activeCodes.has(d1.code);
            const isOpen = openCode === d1.code;
            return (
              <button
                key={d1.code}
                onClick={() => setOpenCode(isOpen ? null : d1.code)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-black tracking-wide transition-all border whitespace-nowrap flex items-center gap-2",
                  isActive ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                    : isOpen ? "bg-white text-black border-white"
                    : "bg-zinc-950 text-zinc-300 border-white/5 hover:border-white/20 hover:text-white"
                )}
              >
                <span>{d1.name}</span>
                <span className={cn("font-mono text-[11px]", isActive ? "text-white/70" : isOpen ? "text-black/50" : "text-zinc-500")}>
                  {d1.count.toLocaleString()}
                </span>
                <ChevronDown size={12} className={cn("transition-transform", isOpen && "rotate-180")} />
              </button>
            );
          })}
          {hasFilter && (
            <button onClick={() => select(null)} className="ml-auto text-zinc-600 hover:text-red-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-1 px-3 whitespace-nowrap">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </nav>

        {openCode && (() => {
          const d1 = tree.find((n) => n.code === openCode);
          if (!d1) return null;
          return (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-8 gap-y-8">
                {d1.children.map((d2) => (
                  <div key={d2.code}>
                    <button
                      onClick={() => select(d2.code)}
                      className={cn("block text-left text-base font-black mb-3 transition-colors w-full",
                        activeCodes.has(d2.code) ? "text-blue-400" : "text-white hover:text-blue-400")}
                    >
                      {d2.name}
                      <span className="text-zinc-500 font-mono text-xs ml-1.5">{d2.count}</span>
                    </button>
                    <ul className="space-y-2">
                      {d2.children.map((d3) => (
                        <li key={d3.code}>
                          <button
                            onClick={() => select(d3.code)}
                            className={cn("text-sm transition-colors text-left flex items-center gap-1.5",
                              current === d3.code ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-white")}
                          >
                            <span>{d3.name}</span>
                            {d3.count > 0 && <span className="font-mono text-[11px] text-zinc-600">{d3.count}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ===== 모바일: 트리거 ===== */}
      <button
        onClick={openSheet}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-zinc-900/40 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-md"
      >
        <span className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-4 h-4 text-blue-400 shrink-0" />
          <span className={cn("text-sm font-black truncate", hasFilter ? "text-white" : "text-zinc-400")}>{triggerLabel}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {hasFilter && (
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); select(null); }}
              className="text-[11px] font-black uppercase tracking-widest text-red-400/80">초기화</span>
          )}
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </span>
      </button>

      {/* ===== 모바일: 바텀시트 ===== */}
      <div className={cn("fixed inset-0 z-[90] md:hidden", sheetOpen ? "visible" : "invisible")}>
        <div onClick={() => setSheetOpen(false)}
          className={cn("absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300", sheetOpen ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute bottom-0 inset-x-0 bg-zinc-900 border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out",
          sheetOpen ? "translate-y-0" : "translate-y-full")}>
          <div className="pt-3 pb-1 flex justify-center shrink-0"><div className="w-10 h-1 rounded-full bg-zinc-700" /></div>
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">카테고리</h3>
            <div className="flex items-center gap-3">
              {hasFilter && (
                <button onClick={() => select(null)} className="text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                  <X className="w-3 h-3" /> 초기화
                </button>
              )}
              <button onClick={() => setSheetOpen(false)} className="p-1 text-zinc-400 hover:text-white transition-colors" aria-label="닫기"><X size={20} /></button>
            </div>
          </div>
          <div className="overflow-y-auto px-3 py-3 space-y-1">
            <button onClick={() => select(null)}
              className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors", !current ? "bg-blue-500/15 text-blue-300" : "text-zinc-200 hover:bg-white/5")}>
              <span className="font-black text-sm">전체</span>
              {!current && <Check size={16} className="text-blue-400" />}
            </button>

            {tree.map((d1) => {
              const expanded = mobileExpand === d1.code;
              const d1Active = activeCodes.has(d1.code);
              return (
                <div key={d1.code}>
                  <button onClick={() => setMobileExpand(expanded ? null : d1.code)}
                    className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors", d1Active ? "bg-blue-500/15 text-blue-300" : "text-zinc-200 hover:bg-white/5")}>
                    <span className="flex items-center gap-2 font-black text-sm">
                      {d1.name}<span className="font-mono text-[11px] text-zinc-500">{d1.count.toLocaleString()}</span>
                    </span>
                    <ChevronDown size={16} className={cn("transition-transform text-zinc-500", expanded && "rotate-180")} />
                  </button>
                  {expanded && (
                    <div className="px-2 pt-1 pb-3 space-y-3">
                      <button onClick={() => select(d1.code)}
                        className={cn("text-xs font-bold tracking-wide transition-colors", current === d1.code ? "text-blue-400" : "text-zinc-500 hover:text-white")}>
                        {d1.name} 전체 보기
                      </button>
                      {d1.children.map((d2) => (
                        <div key={d2.code}>
                          <button onClick={() => select(d2.code)}
                            className={cn("flex items-center gap-1.5 text-sm font-bold mb-2 transition-colors", activeCodes.has(d2.code) ? "text-blue-400" : "text-white hover:text-blue-400")}>
                            {d2.name}<span className="font-mono text-[11px] text-zinc-500">{d2.count}</span>
                          </button>
                          <div className="flex flex-wrap gap-1.5">
                            {d2.children.map((d3) => (
                              <button key={d3.code} onClick={() => select(d3.code)}
                                className={cn("px-2.5 py-1 rounded-lg text-xs border transition-colors",
                                  current === d3.code ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/20")}>
                                {d3.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
