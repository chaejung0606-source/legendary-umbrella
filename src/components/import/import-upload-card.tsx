"use client";
import { useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImportUploadCard({
  fileName,
  onFile,
  onAnalyze,
  analyzing,
}: {
  fileName: string | null;
  onFile: (file: File | null) => void;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03]">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0] ?? null); }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          drag ? "border-primary bg-pastel-lavender/40" : "border-border bg-pastel-lavender/20"
        )}
      >
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-pastel-lavenderInk shadow-soft">
          <UploadCloud className="h-8 w-8" />
        </span>
        <div>
          <p className="text-sm font-semibold">자산관리대장 파일을 끌어다 놓거나 선택하세요</p>
          <p className="mt-1 text-xs text-muted-foreground">.xlsm / .xlsx 형식 · 6개 시트 자동 인식</p>
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-2 text-sm font-semibold shadow-soft ring-1 ring-black/[0.06] hover:bg-accent">
            <FileSpreadsheet className="h-4 w-4" /> 파일 선택
          </span>
          <input type="file" accept=".xlsm,.xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      {fileName && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pastel-mint/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-pastel-mintInk" />
            <span className="font-medium">{fileName}</span>
          </div>
          <Button onClick={onAnalyze} disabled={analyzing} size="sm">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {analyzing ? "분석 중…" : "분석 / 검증"}
          </Button>
        </div>
      )}
    </div>
  );
}
