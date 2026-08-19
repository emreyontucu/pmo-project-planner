import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PMO Project Planner",
  description: "Proje planlama ve zamanlama aracı",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-[15px]" style={{ color: "var(--foreground)" }}>
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-300">
                <LayoutGrid size={17} strokeWidth={2.25} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                PMO Project Planner
              </span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
