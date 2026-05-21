import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'UnivWatch — Real-Time Price Intelligence',
    template: '%s | UnivWatch',
  },
  description: '33,000+ 대학생 전용 폐쇄몰 상품의 가격 변동을 실시간 추적하는 마켓 인텔리전스 플랫폼.',
  openGraph: {
    type: 'website',
    siteName: 'UnivWatch',
    title: 'UnivWatch — Real-Time Price Intelligence',
    description: '33,000+ 대학생 전용 폐쇄몰 상품의 가격 변동을 실시간 추적하는 마켓 인텔리전스 플랫폼.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UnivWatch — Real-Time Price Intelligence',
    description: '33,000+ 대학생 전용 폐쇄몰 상품의 가격 변동을 실시간 추적하는 마켓 인텔리전스 플랫폼.',
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body className={cn(inter.className, "bg-zinc-950 text-zinc-50 antialiased min-h-screen")} suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
