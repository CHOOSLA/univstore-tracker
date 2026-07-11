export default function MarketLoading() {
  return (
    <div className="pb-24 bg-zinc-950 text-zinc-100 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 space-y-12">
        {/* 헤더 스켈레톤 */}
        <div className="border-b border-white/5 pb-8 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-500/30 animate-pulse" />
            <div className="h-3 w-40 rounded bg-zinc-800 animate-pulse" />
          </div>
          <div className="h-12 w-48 rounded-xl bg-zinc-800 animate-pulse" />
          <div className="h-4 w-full max-w-xl rounded bg-zinc-900 animate-pulse" />
        </div>

        {/* 로딩 인디케이터 */}
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative flex h-10 w-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500/40" />
            <span className="relative inline-flex rounded-full h-10 w-10 bg-amber-500/10 border border-amber-500/30 items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
            </span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">시장 데이터 분석 중…</p>
        </div>

        {/* 딜 그리드 스켈레톤 */}
        {[0, 1].map((s) => (
          <div key={s} className="space-y-4">
            <div className="h-5 w-32 rounded bg-zinc-800 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl border-white/[0.03] aspect-[3/4] bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
