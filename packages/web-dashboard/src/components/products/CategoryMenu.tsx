"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
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
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentMain = searchParams.get("menuCategory");
  const currentSub = searchParams.get("menuSubCategory");
  const currentThird = searchParams.get("thirdCategory");

  // 메가메뉴 외부 클릭 시 닫기
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
  };

  const slugs = Object.keys(taxonomy);

  return (
    <div className="relative" ref={menuRef}>
      <nav className="flex items-center gap-1.5 bg-zinc-900/30 p-2 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto scrollbar-hide">
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
        {(currentMain || currentSub) && (
          <button
            onClick={() => handleSelect(null, null)}
            className="ml-auto text-zinc-600 hover:text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 px-3 whitespace-nowrap"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </nav>

      {openSlug && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-8 gap-y-8">
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
                    <span className="text-zinc-500 font-mono text-xs ml-1.5">
                      {subCnt}
                    </span>
                  </button>
                  <ul className="space-y-2">
                    {Object.values(sub.thirds).map((thirdName, i) => {
                      const thirdCnt = counts.byThird?.[`${mainName}|${sub.name}|${thirdName}`] || 0;
                      const isThirdActive = currentMain === mainName && currentSub === sub.name && currentThird === thirdName;
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
  );
}
