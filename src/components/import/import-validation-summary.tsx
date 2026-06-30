import { CheckCircle2, FileSpreadsheet } from "lucide-react";
import type { ImportJob } from "@/types";
import { formatNumber } from "@/lib/format";
import { SeverityBadge } from "@/components/badges/severity-badge";
import { cn } from "@/lib/utils";

const cellTones: Record<string, string> = {
  importable: "bg-pastel-mint text-pastel-mintInk",
  errors: "bg-pastel-coral text-pastel-coralInk",
  warnings: "bg-pastel-cream text-pastel-creamInk",
  rfidMissing: "bg-pastel-apricot text-pastel-apricotInk",
  rfidDuplicate: "bg-pastel-rose text-pastel-roseInk",
  mismatch: "bg-pastel-purple text-pastel-purpleInk",
};

export function ImportValidationSummary({ job }: { job: ImportJob }) {
  const v = job.validation;
  const cells: { label: string; value: number; key: string }[] = [
    { label: "총 자산 건수", value: v.totalAssets, key: "total" },
    { label: "가져오기 가능", value: v.importable, key: "importable" },
    { label: "오류", value: v.errors, key: "errors" },
    { label: "경고", value: v.warnings, key: "warnings" },
    { label: "RFID 누락", value: v.rfidMissing, key: "rfidMissing" },
    { label: "RFID 중복", value: v.rfidDuplicate, key: "rfidDuplicate" },
    { label: "관리번호 불일치", value: v.managementNoMismatch, key: "mismatch" },
  ];

  return (
    <div className="space-y-5">
      {/* 시트 인식 결과 */}
      <div className="rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03]">
        <h3 className="mb-4 text-sm font-bold">시트 인식 결과</h3>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {job.sheets.map((s) => (
            <div key={s.name} className="flex items-center gap-3 rounded-2xl bg-pastel-lavender/30 px-3.5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-pastel-lavenderInk"><FileSpreadsheet className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{formatNumber(s.rowCount)}행 → {s.target}</div>
              </div>
              {s.recognized && <CheckCircle2 className="h-4 w-4 shrink-0 text-pastel-mintInk" />}
            </div>
          ))}
        </div>
      </div>

      {/* 검증 결과 카드 */}
      <div className="rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03]">
        <h3 className="mb-4 text-sm font-bold">검증 결과</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {cells.map((c) => (
            <div key={c.key} className={cn("rounded-2xl p-4 text-center", cellTones[c.key] ?? "bg-muted text-muted-foreground")}>
              <div className="text-2xl font-bold tabular-nums">{formatNumber(c.value)}</div>
              <div className="mt-1 text-[11px] font-medium opacity-80">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 오류/경고 테이블 */}
      <div className="rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03]">
        <h3 className="mb-4 text-sm font-bold">오류 / 경고 상세</h3>
        <div className="overflow-x-auto pastel-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">구분</th>
                <th className="px-3 py-2.5 font-medium">시트</th>
                <th className="px-3 py-2.5 font-medium">행</th>
                <th className="px-3 py-2.5 font-medium">필드</th>
                <th className="px-3 py-2.5 font-medium">유형</th>
                <th className="px-3 py-2.5 font-medium">원본 값</th>
                <th className="px-3 py-2.5 font-medium">메시지</th>
              </tr>
            </thead>
            <tbody>
              {job.errorRows.map((e) => (
                <tr key={e.id} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-3 py-2.5"><SeverityBadge severity={e.severity} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">{e.sheet}</td>
                  <td className="px-3 py-2.5 text-xs">{e.rowNo ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{e.field ?? "-"}</td>
                  <td className="px-3 py-2.5 text-xs">{e.type}</td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 font-mono text-xs">{e.rawValue ?? ""}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
