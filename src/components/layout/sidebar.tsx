"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar({ onNavigate, showClose }: { onNavigate?: () => void; showClose?: boolean }) {
  const pathname = usePathname();

  return (
    <div
      className="flex h-full w-[264px] flex-col text-white"
      style={{ backgroundImage: "linear-gradient(180deg, hsl(252 62% 64%) 0%, hsl(258 56% 56%) 55%, hsl(266 52% 50%) 100%)" }}
    >
      {/* 로고 */}
      <div className="flex items-center justify-between px-5 h-[72px] shrink-0">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">사업단 자산관리</span>
            <span className="block text-[11px] text-white/70">Asset Platform</span>
          </span>
        </Link>
        {showClose && (
          <button onClick={onNavigate} className="rounded-lg p-1.5 hover:bg-white/15 lg:hidden" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pastel-scroll">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white text-brand-700 shadow-pill"
                  : "text-white/85 hover:bg-white/12 hover:text-white"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-600" : "text-white/85 group-hover:text-white")} strokeWidth={2.1} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-white/55">v0.1 · MVP 시안</div>
    </div>
  );
}
