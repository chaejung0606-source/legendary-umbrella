import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface SoftButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// 무광 세라믹 pill 버튼 — 광택 없이 hover 시 살짝 떠오르고 active 시 눌림.
const VARIANT: Record<Variant, string> = {
  primary: "ceramic-btn ceramic-btn-primary grain text-ceramic-ink",
  secondary: "ceramic-btn grain text-ceramic-ink",
  ghost: "bg-transparent text-ceramic-sub hover:text-ceramic-ink border border-ceramic-line",
};

export function SoftButton({
  variant = "primary",
  className,
  children,
  ...props
}: SoftButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold",
        "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ceramic-mintDark/50",
        variant !== "ghost" && "active:shadow-neu-inset",
        VARIANT[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
