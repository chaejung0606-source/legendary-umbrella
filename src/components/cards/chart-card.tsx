import * as React from "react";
import { SoftCard, SoftCardHeader } from "./soft-card";

// 차트 컨테이너 — 제목/설명/우측 액션 + 본문 영역.
export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SoftCard className={className}>
      <SoftCardHeader title={title} description={description} action={action} />
      <div>{children}</div>
    </SoftCard>
  );
}
