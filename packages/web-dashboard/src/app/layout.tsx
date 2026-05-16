import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UnivWatch - Smart Price Tracker",
  description: "Next-gen price tracking dashboard for students",
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
