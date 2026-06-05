import { redirect } from "next/navigation";

// 알림/목표가 기능은 상품 중심으로 통합되었다.
// - 목표가 설정/관리: 관심상품(/watchlist) 카드 + 상품 상세
// - 텔레그램 채널 연동: /settings
// - 전역 시스템 설정: /admin
// 기존 /alerts URL 진입은 관심상품 페이지로 일원화한다.
export default function AlertsPage() {
  redirect("/watchlist");
}
