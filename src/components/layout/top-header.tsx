"use client";
import { Menu, Search, Bell } from "lucide-react";

export function TopHeader({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-black/[0.04] bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-2xl bg-card shadow-soft lg:hidden" aria-label="메뉴">
        <Menu className="h-5 w-5" />
      </button>

      {/* 검색 */}
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="자산·관리번호·사용자 검색"
          className="h-11 w-full rounded-2xl border-0 bg-card pl-10 pr-4 text-sm shadow-soft outline-none ring-1 ring-black/[0.03] placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2.5 sm:flex-none">
        <button className="relative grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-soft ring-1 ring-black/[0.03]" aria-label="알림">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-pastel-coralInk" />
        </button>
        <div className="flex items-center gap-2.5 rounded-2xl bg-card px-2.5 py-1.5 shadow-soft ring-1 ring-black/[0.03]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-pastel-lavender text-sm font-bold text-pastel-lavenderInk">담</span>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold">자산관리 담당자</div>
            <div className="text-[11px] text-muted-foreground">manager@sadan.local</div>
          </div>
        </div>
      </div>
    </header>
  );
}
