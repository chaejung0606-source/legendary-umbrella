import { cn } from "@/lib/utils";
import { ACCENT, type AccentKey } from "./tokens";

interface MiniProgressProps {
  label?: string;
  /** 0~100 */
  value: number;
  color?: AccentKey;
  className?: string;
  showValue?: boolean;
}

// 오목한 세라믹 트랙 + 무광 파스텔 바. 강한 원색 사용 안 함.
export function MiniProgress({
  label,
  value,
  color = "mint",
  className,
  showValue = true,
}: MiniProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-ceramic-sub">{label}</span>}
          {showValue && <span className="tabular-nums font-semibold text-ceramic-ink">{pct}%</span>}
        </div>
      )}
      <div className="ceramic-inset h-3 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${ACCENT[color]}cc, ${ACCENT[color]})`,
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.5)",
          }}
        />
      </div>
    </div>
  );
}
