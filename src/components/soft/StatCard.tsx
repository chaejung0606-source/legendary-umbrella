import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SoftCard } from "./SoftCard";
import { type SurfaceVariant } from "./tokens";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  /** 아이콘 배지 색 */
  accent?: "mint" | "sky" | "pink" | "sage";
  className?: string;
}

const ICON_SURFACE: Record<NonNullable<StatCardProps["accent"]>, SurfaceVariant> = {
  mint: "mint",
  sky: "sky",
  pink: "pink",
  sage: "sage",
};
const ICON_COLOR: Record<NonNullable<StatCardProps["accent"]>, string> = {
  mint: "text-emerald-900/70",
  sky: "text-sky-900/70",
  pink: "text-rose-900/60",
  sage: "text-emerald-900/70",
};

// 작은 통계 카드 — 수치는 또렷하게, 전체 톤은 차분하게.
export function StatCard({ label, value, description, icon: Icon, accent = "mint", className }: StatCardProps) {
  return (
    <SoftCard hover padded={false} className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-ceramic-sub">{label}</span>
        {Icon && (
          <span className={cn("grid h-9 w-9 place-items-center rounded-[14px]", ICON_SURFACE[accent], "grain")}>
            <Icon className={cn("h-4.5 w-4.5", ICON_COLOR[accent])} style={{ width: 18, height: 18 }} strokeWidth={2.1} />
          </span>
        )}
      </div>
      <div className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-ceramic-ink tabular-nums">{value}</div>
      {description && <div className="mt-1.5 text-xs text-ceramic-sub">{description}</div>}
    </SoftCard>
  );
}
