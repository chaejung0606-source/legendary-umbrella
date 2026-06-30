import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사업단 자산관리 플랫폼",
  description: "사업단 자산 원장 · 노트북 대여 · 좌석 배치 · 연구재료 재고 통합 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
