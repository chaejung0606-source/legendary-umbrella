import * as React from "react";
import { cn } from "@/lib/utils";
import { RADIUS, SURFACE, type SurfaceVariant } from "./tokens";

interface SoftCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 세라믹 표면 변형 (기본: 아이보리 무광) */
  variant?: SurfaceVariant;
  /** hover 시 살짝 떠오름 */
  hover?: boolean;
  /** 큰 라운드(36px) 적용 */
  large?: boolean;
  padded?: boolean;
}

/** 공통 세라믹 카드 — 모든 표면의 기본 컨테이너. 무광 질감 + grain 내장. */
export function SoftCard({
  variant = "surface",
  hover = false,
  large = false,
  padded = true,
  className,
  children,
  ...props
}: SoftCardProps) {
  return (
    <div
      className={cn(
        SURFACE[variant],
        large ? RADIUS.cardLg : RADIUS.card,
        padded && "p-6",
        hover && "lift",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
