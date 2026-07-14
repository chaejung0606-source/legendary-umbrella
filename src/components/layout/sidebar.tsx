"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { VersionBadge } from "./version-badge";

export function Sidebar({ onNavigate, showClose, allowedHrefs }: { onNavigate?: () => void; showClose?: boolean; allowedHrefs?: string[] }) {
  const pathname = usePathname();
  // 아이콘 컴포넌트는 서버→클라이언트로 전달할 수 없으므로, 허용 href 목록만 받아 여기서 필터.
  const navItems = allowedHrefs ? NAV_ITEMS.filter((i) => allowedHrefs.includes(i.href)) : NAV_ITEMS;

  return (
    <div className="relative grain flex h-full w-[264px] flex-col border-r border-border bg-card text-foreground">
      {/* 로고 */}
      <div className="flex items-center justify-between px-5 h-[72px] shrink-0">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-300 text-brand-900">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">사업단 자산관리</span>
            <span className="block text-[11px] text-muted-foreground">Asset Platform</span>
          </span>
        </Link>
        {showClose && (
          <button onClick={onNavigate} className="rounded-lg p-1.5 hover:bg-muted lg:hidden" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pastel-scroll">
        {navItems.map((item) => {
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
                  ? "bg-brand-200 font-semibold text-brand-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-800" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={2.1} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <VersionBadge />
    </div>
  );
}
