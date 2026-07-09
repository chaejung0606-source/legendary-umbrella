import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// 대시보드 상단 인사 카드 (그라데이션 + 빠른 액션).
export function HeroCard({
  greeting,
  subtitle,
  actions,
  className,
}: {
  greeting: string;
  subtitle: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grain relative overflow-hidden rounded-card p-7 text-brand-900 shadow-soft-lg",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 26% 16%, rgba(255,255,255,0.5), transparent 34%), linear-gradient(120deg, hsl(150 32% 82%) 0%, hsl(155 27% 72%) 55%, hsl(160 24% 64%) 100%)",
      }}
    >
      {/* 장식 요소 */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/35 blur-xl" />
      <div className="pointer-events-none absolute right-16 bottom-0 h-24 w-24 rounded-full bg-white/25 blur-md" />
      <div className="pointer-events-none absolute right-8 top-7 hidden md:block animate-float">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/40 backdrop-blur">
          <Sparkles className="h-8 w-8" />
        </div>
      </div>

      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-xs font-medium backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> 사업단 자산관리
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-[28px]">{greeting}</h1>
        <p className="mt-1.5 text-sm text-brand-900/75">{subtitle}</p>
        {actions && <div className="mt-5 flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
