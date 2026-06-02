"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X, SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import taxonomyJson from "@/lib/taxonomy.json";

type Sub = { name: string; thirds: Record<string, string> };
type Main = { name: string; slug: string; subs: Record<string, Sub> };
type Taxonomy = Record<string, Main>;

const taxonomy = taxonomyJson as Taxonomy;

export type CategoryCounts = {
  byMain: Record<string, number>;
  bySub: Record<string, number>;   // key: `${mainName}|${subName}`
  byThird: Record<string, number>; // key: `${mainName}|${subName}|${thirdName}`
};

interface Props {
  counts: CategoryCounts;
}

export default function CategoryMenu({ counts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openSlug, setOpenSlug] = useState<string | null>(null); // 데스크톱 메가메뉴
  const [sheetOpen, setSheetOpen] = useState(false);             // 모바일 바텀시트
  const [mobileExpand, setMobileExpand] = useState<string | null>(null); // 모바일 아코디언
  const menuRef = useRef<HTMLDivElement>(null);

  const currentMain = searchParams.get("menuCategory");
  const currentSub = searchParams.get("menuSubCategory");
  const currentThird = searchParams.get("thirdCategory");

  // 메가메뉴 외부 클릭 시 닫기 (데스크톱)
  useEffect(() => {
    if (!openSlug) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenSlug(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openSlug]);

  // 모바일 시트 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const handleSelect = (mainName: string | null, subName: string | null, thirdName: string | null = null) => {
    const params = new URLSearchParams(searchParams);
    if (mainName) params.set("menuCategory", mainName);
    else params.delete("menuCategory");
    if (subName) params.set("menuSubCategory", subName);
    else params.delete("menuSubCategory");
    if (thirdName) params.set("thirdCategory", thirdName);
    else params.delete("thirdCategory");
    router.push(`/products?${params.toString()}`);
    setOpenSlug(null);
    setSheetOpen(false);
  };

  const slugs = Object.keys(taxonomy);

  // 모바일 트리거 라벨: 가장 깊은 선택 표시
  const triggerLabel = currentThird || currentSub || currentMain || "전체 카테고리";
  const hasFilter = Boolean(currentMain || currentSub);

  // 시트 열 때 현재 선택된 대분류를 자동 펼침
  const openSheet = () => {
    const activeSlug = currentMain ? slugs.find((s) => taxonomy[s].name === currentMain) ?? null : null;
    setMobileExpand(activeSlug);
    setSheetOpen(true);
  };

  return (
    <>
      {/* ===== 데스크톱: 메가메뉴 바 (md+) ===== */}
      <div className="relative hidden md:block" ref={menuRef}>
        <nav className="flex items-center gap-1.5 bg-zinc-900/30 p-2 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar py-2">
          <button
            onClick={() => handleSelect(null, null)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap",
              !currentMain
                ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
            )}
          >
            All
          </button>
          {slugs.map((slug) => {
            const m = taxonomy[slug];
            const cnt = counts.byMain[m.name] || 0;
            const isActive = currentMain === m.name;
            const isOpen = openSlug === slug;
            return (
              <button
                key={slug}
                onClick={() => setOpenSlug(isOpen ? null : slug)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-black tracking-wide transition-all border whitespace-nowrap flex items-center gap-2",
                  isActive
                    ? "bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                    : isOpen
                    ? "bg-white text-black border-white"
                    : "bg-zinc-950 text-zinc-300 border-white/5 hover:border-white/20 hover:text-white"
                )}
              >
                <span>{m.name}</span>
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    isActive ? "text-white/70" : isOpen ? "text-black/50" : "text-zinc-500"
                  )}
                >
                  {cnt.toLocaleString()}
                </span>
                <ChevronDown
                  size={12}
                  className={cn("transition-transform", isOpen && "rotate-180")}
                />
              </button>
            );
          })}
          {hasFilter && (
            <button
              onClick={() => handleSelect(null, null)}
              className="ml-auto text-zinc-600 hover:text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 px-3 whitespace-nowrap"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </nav>

        {openSlug && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-8 gap-y-8">
              {Object.entries(taxonomy[openSlug].subs).map(([code, sub]) => {
                const mainName = taxonomy[openSlug].name;
                const subCnt = counts.bySub[`${mainName}|${sub.name}`] || 0;
                const isActive = currentMain === mainName && currentSub === sub.name;
                return (
                  <div key={code}>
                    <button
                      onClick={() => handleSelect(mainName, sub.name)}
                      className={cn(
                        "block text-left text-base font-black mb-3 transition-colors w-full",
                        isActive ? "text-blue-400" : "text-white hover:text-blue-400"
                      )}
                    >
                      {sub.name}
                      <span className="text-zinc-500 font-mono text-xs ml-1.5">{subCnt}</span>
                    </button>
                    <ul className="space-y-2">
                      {Object.values(sub.thirds).map((thirdName, i) => {
                        const thirdCnt = counts.byThird?.[`${mainName}|${sub.name}|${thirdName}`] || 0;
                        const isThirdActive =
                          currentMain === mainName && currentSub === sub.name && currentThird === thirdName;
                        return (
                          <li key={i}>
                            <button
                              onClick={() => handleSelect(mainName, sub.name, thirdName)}
                              className={cn(
                                "text-sm transition-colors text-left flex items-center gap-1.5",
                                isThirdActive ? "text-blue-400 font-bold" : "text-zinc-400 hover:text-white"
                              )}
                            >
                              <span>{thirdName}</span>
                              {thirdCnt > 0 && (
                                <span className="font-mono text-[10px] text-zinc-600">{thirdCnt}</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== 모바일: 트리거 버튼 (< md) ===== */}
      <button
        onClick={openSheet}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-zinc-900/40 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-md"
      >
        <span className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-4 h-4 text-blue-400 shrink-0" />
          <span
            className={cn(
              "text-sm font-black truncate",
              hasFilter ? "text-white" : "text-zinc-400"
            )}
          >
            {triggerLabel}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {hasFilter && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null, null);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-red-400/80"
            >
              초기화
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </span>
      </button>

      {/* ===== 모바일: 바텀시트 ===== */}
      <div className={cn("fixed inset-0 z-[90] md:hidden", sheetOpen ? "visible" : "invisible")}>
        {/* 배경 */}
        <div
          onClick={() => setSheetOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            sheetOpen ? "opacity-100" : "opacity-0"
          )}
        />
        {/* 패널 */}
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 bg-zinc-900 border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out",
            sheetOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
          {/* 핸들 */}
          <div className="pt-3 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
          {/* 헤더 */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">카테고리</h3>
            <div className="flex items-center gap-3">
              {hasFilter && (
                <button
                  onClick={() => handleSelect(null, null)}
                  className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  초기화
                </button>
              )}
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          {/* 본문 */}
          <div className="overflow-y-auto px-3 py-3 space-y-1">
            {/* 전체 */}
            <button
              onClick={() => handleSelect(null, null)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                !currentMain ? "bg-blue-500/15 text-blue-300" : "text-zinc-200 hover:bg-white/5"
              )}
            >
              <span className="font-black text-sm">전체</span>
              {!currentMain && <Check size={16} className="text-blue-400" />}
            </button>

            {slugs.map((slug) => {
              const m = taxonomy[slug];
              const cnt = counts.byMain[m.name] || 0;
              const expanded = mobileExpand === slug;
              const mainActive = currentMain === m.name;
              return (
                <div key={slug}>
                  <button
                    onClick={() => setMobileExpand(expanded ? null : slug)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                      mainActive ? "bg-blue-500/15 text-blue-300" : "text-zinc-200 hover:bg-white/5"
                    )}
                  >
                    <span className="flex items-center gap-2 font-black text-sm">
                      {m.name}
                      <span className="font-mono text-[10px] text-zinc-500">{cnt.toLocaleString()}</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn("transition-transform text-zinc-500", expanded && "rotate-180")}
                    />
                  </button>

                  {expanded && (
                    <div className="px-2 pt-1 pb-3 space-y-3">
                      <button
                        onClick={() => handleSelect(m.name, null)}
                        className={cn(
                          "text-xs font-bold tracking-wide transition-colors",
                          mainActive && !currentSub ? "text-blue-400" : "text-zinc-500 hover:text-white"
                        )}
                      >
                        {m.name} 전체 보기
                      </button>
                      {Object.entries(m.subs).map(([code, sub]) => {
                        const subCnt = counts.bySub[`${m.name}|${sub.name}`] || 0;
                        const subActive = currentMain === m.name && currentSub === sub.name;
                        return (
                          <div key={code}>
                            <button
                              onClick={() => handleSelect(m.name, sub.name)}
                              className={cn(
                                "flex items-center gap-1.5 text-sm font-bold mb-2 transition-colors",
                                subActive ? "text-blue-400" : "text-white hover:text-blue-400"
                              )}
                            >
                              {sub.name}
                              <span className="font-mono text-[10px] text-zinc-500">{subCnt}</span>
                            </button>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.values(sub.thirds).map((thirdName, i) => {
                                const thirdCnt =
                                  counts.byThird?.[`${m.name}|${sub.name}|${thirdName}`] || 0;
                                const thirdActive = subActive && currentThird === thirdName;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => handleSelect(m.name, sub.name, thirdName)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-[11px] border transition-colors whitespace-nowrap",
                                      thirdActive
                                        ? "bg-blue-500 text-white border-blue-400"
                                        : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
                                    )}
                                  >
                                    {thirdName}
                                    {thirdCnt > 0 && (
                                      <span className="ml-1 font-mono text-[9px] opacity-60">{thirdCnt}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
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
