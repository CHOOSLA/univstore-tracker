export default function ProductsLoading() {
  return (
    <div className="pb-20 bg-zinc-950 text-zinc-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 space-y-8">
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-zinc-800 animate-pulse" />
          <div className="h-12 w-44 rounded-xl bg-zinc-800 animate-pulse" />
        </div>
        <div className="h-14 rounded-2xl bg-zinc-900/40 animate-pulse" />
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="relative flex h-9 w-9">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500/40" />
            <span className="relative inline-flex rounded-full h-9 w-9 bg-blue-500/10 border border-blue-500/30 items-center justify-center">
              <span className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
            </span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">상품 불러오는 중…</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl border-white/[0.03] aspect-[3/4] bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}
