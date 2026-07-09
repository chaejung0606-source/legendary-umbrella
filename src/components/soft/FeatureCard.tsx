import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SoftCard } from "./SoftCard";
import { type SurfaceVariant } from "./tokens";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  accent?: "mint" | "sky" | "pink" | "sage";
}

const ICON_SURFACE: Record<NonNullable<FeatureCardProps["accent"]>, SurfaceVariant> = {
  mint: "mint",
  sky: "sky",
  pink: "pink",
  sage: "sage",
};
const ICON_COLOR: Record<NonNullable<FeatureCardProps["accent"]>, string> = {
  mint: "text-emerald-900/70",
  sky: "text-sky-900/70",
  pink: "text-rose-900/60",
  sage: "text-emerald-900/70",
};

// 기능 소개 카드 — 세라믹 아이콘 배지 + 제목 + 설명 + 상태 배지.
export function FeatureCard({ icon: Icon, title, description, badge, accent = "mint" }: FeatureCardProps) {
  return (
    <SoftCard hover large className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-12 w-12 place-items-center rounded-[18px]", ICON_SURFACE[accent], "grain")}>
          <Icon className={cn("h-5.5 w-5.5", ICON_COLOR[accent])} style={{ width: 22, height: 22 }} strokeWidth={2} />
        </span>
        {badge && (
          <span className="ceramic-inset rounded-full px-3 py-1 text-[11px] font-semibold text-ceramic-sub">{badge}</span>
        )}
      </div>
      <div>
        <h3 className="text-lg font-bold text-ceramic-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ceramic-sub">{description}</p>
      </div>
    </SoftCard>
  );
}
