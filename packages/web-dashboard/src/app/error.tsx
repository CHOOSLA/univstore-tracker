"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 bg-zinc-950 text-zinc-100">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">문제가 발생했어요</h1>
          <p className="text-zinc-500 text-sm md:text-base font-medium leading-relaxed">
            페이지를 불러오는 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.
            {error?.digest && <span className="block mt-2 text-[11px] font-mono text-zinc-700">ref: {error.digest}</span>}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          >
            <RotateCw size={16} /> 다시 시도
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-300 font-black text-sm uppercase tracking-wider hover:border-white/25 transition-colors"
          >
            <Home size={16} /> 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
