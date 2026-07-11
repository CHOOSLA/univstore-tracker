"use client";

import { useEffect } from "react";

/**
 * 다른 라우트에서 #앵커로 진입 시 Next App Router가 동적 콘텐츠 렌더 전에
 * 스크롤을 시도해 앵커로 이동하지 못하는 문제를 보정.
 * 마운트 후 해당 요소가 나타날 때까지 잠깐 재시도하며 스크롤한다.
 */
export default function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!id) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        clearInterval(timer);
      } else if (++tries > 25) {
        clearInterval(timer);
      }
    }, 120);
    return () => clearInterval(timer);
  }, []);

  return null;
}
