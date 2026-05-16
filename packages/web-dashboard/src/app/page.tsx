import { prisma } from "@/lib/prisma";
import { TrendingDown, Award, Package, Clock } from "lucide-react";

export default async function HomePage() {
  // 실제 데이터는 나중에 Phase 5.3에서 연결하겠습니다.
  const stats = [
    { title: "오늘의 급락", value: "12건", icon: TrendingDown, color: "text-red-400" },
    { title: "역대 최저가", value: "5건", icon: Award, color: "text-amber-400" },
    { title: "추적 상품", value: "1,240개", icon: Package, color: "text-blue-400" },
    { title: "마지막 업데이트", value: "방금 전", icon: Clock, color: "text-emerald-400" },
  ];

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">UnivWatch</h1>
        <p className="text-zinc-400">학생복지스토어 실시간 가격 분석 대시보드</p>
      </header>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-zinc-950 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Bento Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Large Card: Today's Top Drops */}
        <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 min-h-[400px]">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            🔥 실시간 가격 급락 상품
          </h2>
          <div className="space-y-4">
            {/* Mock Rows */}
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-xs">IMG</div>
                  <div>
                    <p className="font-bold">Apple iPad Air 11 (M4)</p>
                    <p className="text-xs text-zinc-500 italic">ID: 138746</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-400">-12%</p>
                  <p className="text-sm font-semibold">863,000원</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smaller Card: All Time Lows */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
          <h2 className="text-2xl font-bold mb-6">🏆 역대 최저가</h2>
          <div className="space-y-4 text-sm text-zinc-400">
            데이터가 쌓이면 여기에 가장 저렴한 상품들이 표시됩니다.
          </div>
        </div>
      </div>
    </main>
  );
}
