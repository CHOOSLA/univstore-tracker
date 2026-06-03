import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'UnivWatch — 대학생 폐쇄몰 실시간 가격 트래커',
    template: '%s | UnivWatch',
  },
  description: '33,000개 이상의 대학생 전용 폐쇄몰 상품 가격을 자동 수집하고, 가격 하락 알림과 구매 타이밍 분석을 제공하는 마켓 인텔리전스 플랫폼.',
  openGraph: {
    type: 'website',
    siteName: 'UnivWatch',
    title: 'UnivWatch — 대학생 폐쇄몰 실시간 가격 트래커',
    description: '33,000개 이상의 대학생 전용 폐쇄몰 상품 가격을 자동 수집하고, 가격 하락 알림과 구매 타이밍 분석을 제공하는 마켓 인텔리전스 플랫폼.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UnivWatch — 대학생 폐쇄몰 실시간 가격 트래커',
    description: '33,000개 이상의 대학생 전용 폐쇄몰 상품 가격을 자동 수집하고, 가격 하락 알림과 구매 타이밍 분석을 제공하는 마켓 인텔리전스 플랫폼.',
  },
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body className={cn("bg-zinc-950 text-zinc-50 antialiased min-h-screen font-sans")} suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
