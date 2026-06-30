"use client";
import { useState } from "react";
import { CheckCircle2, Loader2, Database } from "lucide-react";
import type { ImportJob } from "@/types";
import { Button } from "@/components/ui/button";
import { ImportUploadCard } from "./import-upload-card";
import { ImportValidationSummary } from "./import-validation-summary";

export function ImportFlow({ job }: { job: ImportJob }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  function analyze() {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, 700);
  }
  function commit() {
    setCommitting(true);
    setTimeout(() => { setCommitting(false); setCommitted(true); }, 900);
  }

  return (
    <div className="space-y-5">
      <ImportUploadCard
        fileName={fileName ?? (analyzed ? job.fileName : null)}
        onFile={(n) => { setFileName(n); setAnalyzed(false); setCommitted(false); }}
        onAnalyze={analyze}
        analyzing={analyzing}
      />

      {analyzed && (
        <>
          <ImportValidationSummary job={job} />

          <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03] sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              검증을 통과한 <b className="text-foreground">{job.validation.importable.toLocaleString("ko-KR")}건</b>을 DB에 반영합니다.
              <span className="ml-1">RFID 중복 {job.validation.rfidDuplicate}건은 반영 여부를 선택할 수 있어요.</span>
            </div>
            <Button onClick={commit} disabled={committing || committed || job.validation.errors > 0} size="lg">
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {committed ? "반영 완료" : committing ? "반영 중…" : "DB에 반영"}
            </Button>
          </div>

          {committed && (
            <div className="flex items-center gap-3 rounded-card bg-pastel-mint/50 p-5 text-sm text-pastel-mintInk">
              <CheckCircle2 className="h-5 w-5" />
              <span>가져오기가 완료되었습니다. (MVP 시안 — 실제 파싱/반영 로직은 import 엔진과 연결 예정)</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
