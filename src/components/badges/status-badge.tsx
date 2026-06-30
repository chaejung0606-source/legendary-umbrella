import * as React from "react";
import { cn } from "@/lib/utils";
import {
  toneClasses, assetStatusTone, tagStatusTone, usageTone, loanTone, consumableTone, type Tone,
} from "@/lib/status";

// 공통 pill 배지. 작은 점 + 라벨.
export function StatusBadge({
  label,
  tone = "slate",
  dot = true,
  className,
}: {
  label: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}

export function AssetStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={assetStatusTone[status as keyof typeof assetStatusTone] ?? "slate"} />;
}

export function UsageBadge({ usage }: { usage: string }) {
  return <StatusBadge label={usage} tone={usageTone[usage as keyof typeof usageTone] ?? "slate"} dot={false} />;
}

export function LoanStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={loanTone[status as keyof typeof loanTone] ?? "slate"} />;
}

export function ConsumableStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={consumableTone[status as keyof typeof consumableTone] ?? "slate"} />;
}

// 태그 상태 (부착/미부착/미발급/손상/미지정)
export function TagStatusBadge({ status }: { status: string }) {
  const tone = tagStatusTone[status as keyof typeof tagStatusTone] ?? "slate";
  return <StatusBadge label={status === "미지정" ? "태그 미지정" : status} tone={tone} dot={false} />;
}

// RFID 등록/미등록
export function RfidStatusBadge({ rfid }: { rfid?: string | null }) {
  return rfid ? (
    <StatusBadge label="등록" tone="mint" />
  ) : (
    <StatusBadge label="미등록" tone="coral" />
  );
}
