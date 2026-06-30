import * as React from "react";
import { SoftCard } from "@/components/cards/soft-card";
import { cn } from "@/lib/utils";

export interface DetailRow {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  strong?: boolean;
  full?: boolean;
}

// 자산 상세를 섹션별 soft card 로 표시.
export function AssetDetailCard({
  title,
  icon,
  rows,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  rows?: DetailRow[];
  children?: React.ReactNode;
}) {
  return (
    <SoftCard>
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="grid h-8 w-8 place-items-center rounded-xl bg-pastel-lavender text-pastel-lavenderInk">{icon}</span>}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {rows && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {rows.map((r, i) => (
            <div key={i} className={cn(r.full && "col-span-2 sm:col-span-3")}>
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className={cn("mt-0.5 break-words", r.mono && "font-mono", r.strong ? "text-base font-semibold" : "text-sm font-medium")}>
                {r.value ?? "-"}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </SoftCard>
  );
}
