import { StatusBadge } from "./status-badge";
import { severityTone } from "@/lib/status";
import type { ImportSeverity } from "@/types";

const LABEL: Record<ImportSeverity, string> = { error: "오류", warning: "경고", info: "정보" };

export function SeverityBadge({ severity }: { severity: ImportSeverity }) {
  return <StatusBadge label={LABEL[severity] ?? severity} tone={severityTone[severity] ?? "slate"} />;
}
