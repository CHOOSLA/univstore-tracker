"use client";

import React, { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { toggleWatchlist } from "@/app/watchlist/actions";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  initialWatched?: boolean;
  variant?: "detail" | "icon";
  className?: string;
}

export default function WatchlistButton({ productId, initialWatched = false, variant = "detail", className }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    // 카드 내부 Link 오버레이로의 전파/내비게이션 차단
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      signIn();
      return;
    }
    const prev = watched;
    setWatched(!prev); // 낙관적 업데이트
    setLoading(true);
    const res = await toggleWatchlist(productId);
    setLoading(false);
    if (!res.success) {
      setWatched(prev);
    } else {
      setWatched(res.watched);
      router.refresh();
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        aria-label={watched ? "관심상품 해제" : "관심상품 추가"}
        className={cn(
          "z-20 flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md border transition-all",
          watched
            ? "bg-red-500/90 border-red-400 text-white"
            : "bg-black/40 border-white/10 text-white/70 hover:text-white hover:border-white/30",
          className
        )}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} fill={watched ? "currentColor" : "none"} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center gap-2 h-12 md:h-14 px-5 rounded-xl md:rounded-2xl font-black text-sm md:text-base border transition-all",
        watched
          ? "bg-red-500/10 border-red-500/30 text-red-400"
          : "bg-zinc-900 border-white/5 text-white hover:bg-zinc-800",
        className
      )}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Heart size={18} fill={watched ? "currentColor" : "none"} />
      )}
      <span>{watched ? "관심상품" : "관심상품 추가"}</span>
    </button>
  );
}
