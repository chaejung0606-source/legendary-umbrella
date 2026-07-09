"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, BellOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeaderNotification {
  id: string;
  tone: "info" | "warning" | "error";
  title: string;
  description: string;
  href: string;
}

const TONE_DOT: Record<HeaderNotification["tone"], string> = {
  info: "bg-pastel-skyInk",
  warning: "bg-pastel-apricotInk",
  error: "bg-pastel-coralInk",
};

export function TopHeader({ onMenu, notifications = [] }: { onMenu?: () => void; notifications?: HeaderNotification[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 알림 패널 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/assets?q=${encodeURIComponent(query)}` : "/assets");
  }

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-black/[0.04] bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-2xl bg-card shadow-soft lg:hidden" aria-label="메뉴">
        <Menu className="h-5 w-5" />
      </button>

      {/* 검색 — 제출 시 자산 원장 검색으로 이동 */}
      <form onSubmit={submitSearch} className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="자산·관리번호·사용자 검색 (Enter)"
          className="h-11 w-full rounded-2xl border-0 bg-card pl-10 pr-4 text-sm shadow-soft outline-none ring-1 ring-black/[0.03] placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
        />
      </form>

      <div className="flex flex-1 items-center justify-end gap-2.5 sm:flex-none">
        {/* 알림 */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-soft ring-1 ring-black/[0.03]"
            aria-label="알림"
            aria-expanded={open}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notifications.length > 0 && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-pastel-coralInk" />}
          </button>

          {open && (
            <div className="absolute right-0 top-[52px] w-[340px] overflow-hidden rounded-2xl bg-card shadow-soft-lg ring-1 ring-black/[0.06]">
              <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
                <span className="text-sm font-bold">알림</span>
                <span className="text-xs text-muted-foreground">{notifications.length}건</span>
              </div>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-muted-foreground">
                  <BellOff className="h-6 w-6" />
                  <span className="text-sm">확인할 알림이 없어요.</span>
                </div>
              ) : (
                <ul className="max-h-[320px] overflow-y-auto pastel-scroll">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition hover:bg-accent"
                      >
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[n.tone])} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{n.title}</span>
                          <span className="block text-xs text-muted-foreground">{n.description}</span>
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* 프로필 → 설정으로 이동 */}
        <Link href="/settings" className="flex items-center gap-2.5 rounded-2xl bg-card px-2.5 py-1.5 shadow-soft ring-1 ring-black/[0.03] transition hover:bg-accent">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-pastel-lavender text-sm font-bold text-pastel-lavenderInk">담</span>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold">자산관리 담당자</div>
            <div className="text-[11px] text-muted-foreground">manager@sadan.local</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
