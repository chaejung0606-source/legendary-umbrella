"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";

// 전체 레이아웃: 좌측 고정 사이드바(데스크톱) + 모바일 드로어 + 상단 헤더 + 본문.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn("absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMobileOpen(false)}
        />
        <div className={cn("absolute left-0 top-0 h-full transition-transform duration-300", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          <Sidebar showClose onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1280px] animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
