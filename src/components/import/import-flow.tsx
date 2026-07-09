"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Database } from "lucide-react";
import type { Asset, ConsumableItem, ImportJob, Seat, TagStatus, UsageType } from "@/types";
import { USAGE_TYPES } from "@/types";
import { SHEET } from "@/lib/constants";
import type { ParsedWorkbook } from "@/lib/excel/parse";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { commitImportAction } from "@/app/actions";
import type { ImportCommitPayload } from "@/data/mutations";
import { ImportUploadCard } from "./import-upload-card";
import { ImportValidationSummary } from "./import-validation-summary";

// 업로드한 파일을 브라우저에서 실제로 파싱·검증하고, 반영 시 서버 데이터셋을 교체한다.

function toDateStr(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function normalizeUsage(value: string): UsageType {
  const compact = value.replace(/\s+/g, "");
  return (USAGE_TYPES as readonly string[]).includes(compact) ? (compact as UsageType) : "미확인";
}

function normalizeTag(value: string): TagStatus | "미지정" {
  return value === "none" ? "미지정" : (value as TagStatus);
}

// 파싱 결과 → 검증 리포트(기존 ImportJob 화면 재사용)
function buildJob(fileName: string, parsed: ParsedWorkbook): ImportJob {
  const errorRowNos = new Set(
    parsed.issues.filter((i) => i.severity === "error" && i.sheet === SHEET.assets && i.rowNo !== null).map((i) => i.rowNo)
  );
  const rfidCounts = new Map<string, number>();
  for (const a of parsed.assets) if (a.rfid) rfidCounts.set(a.rfid, (rfidCounts.get(a.rfid) ?? 0) + 1);
  const rfidDuplicate = [...rfidCounts.values()].reduce((s, c) => s + (c > 1 ? c - 1 : 0), 0);

  const sheetTargets: { name: string; rowCount: number; target: string }[] = [
    { name: SHEET.assets, rowCount: parsed.assets.length, target: "Asset" },
    { name: SHEET.materials, rowCount: parsed.materials.length, target: "ConsumableItem" },
    { name: SHEET.classification, rowCount: parsed.majors.length + parsed.middles.length, target: "AssetCategory" },
    { name: SHEET.buildings, rowCount: parsed.buildings.length, target: "Building" },
    { name: SHEET.seats, rowCount: parsed.seats.length, target: "Seat" },
    { name: SHEET.notebooks, rowCount: parsed.notebooks.length, target: "LaptopLoan" },
  ];

  return {
    id: `job-${fileName}`,
    fileName,
    status: "validated",
    createdAt: new Date().toISOString(),
    createdBy: "manager@sadan.local",
    sheets: sheetTargets.map((s) => ({ ...s, recognized: parsed.sheetsPresent.includes(s.name) })),
    validation: {
      totalAssets: parsed.assets.length + parsed.skippedAssetRows,
      importable: parsed.assets.filter((a) => !errorRowNos.has(a.rowNo)).length,
      errors: parsed.issues.filter((i) => i.severity === "error").length,
      warnings: parsed.issues.filter((i) => i.severity === "warning").length,
      rfidMissing: parsed.assets.filter((a) => !a.rfid).length,
      rfidDuplicate,
      managementNoMismatch: parsed.assets.filter((a) => a.managementNoMismatch).length,
    },
    errorRows: parsed.issues.slice(0, 200).map((i, idx) => ({
      id: `issue-${idx}`,
      sheet: i.sheet,
      rowNo: i.rowNo,
      field: i.field,
      type: i.field ?? (i.severity === "error" ? "오류" : i.severity === "warning" ? "경고" : "정보"),
      rawValue: i.rawValue,
      message: i.message,
      severity: i.severity,
    })),
  };
}

// 파싱 결과 → 서버 반영 페이로드
function buildPayload(fileName: string, parsed: ParsedWorkbook): ImportCommitPayload {
  const now = new Date().toISOString();
  const assets: Asset[] = parsed.assets.map((p, i) => ({
    id: `asset-${i + 1}`,
    legacyRowNo: p.serialNo,
    expenditureDocument: p.expenseDoc,
    managingOrganization: p.managingOrg,
    majorCategory: p.majorCategory ?? "기타자산",
    middleCategory: p.middleCategory ?? "기타자산",
    classificationCode: p.classificationCode,
    acquiredDate: toDateStr(p.acquiredAt),
    itemName: p.itemName,
    specification: p.spec,
    unitPrice: p.unitPrice,
    sequenceNo: p.itemNo,
    place: p.place,
    roomName: p.room,
    buildingCode: p.buildingCode,
    generatedManagementNo: p.generatedManagementNo,
    lockedManagementNo: p.lockedManagementNo ?? p.generatedManagementNo,
    schoolRfidNo: p.rfid,
    usageType: normalizeUsage(p.usageType),
    currentUserName: p.assigneeName && p.assigneeName.length > 1 ? p.assigneeName : null,
    currentLocationNote: p.assigneeName && p.assigneeName.length === 1 ? `${p.assigneeName}좌석` : p.usageRaw,
    tagStatus: normalizeTag(p.tagStatus),
    assetStatus: "정상",
    memo: p.note,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));

  const consumables: ConsumableItem[] = parsed.materials.map((m, i) => ({
    id: `con-${i + 1}`,
    itemName: m.itemName,
    specification: m.spec,
    unitPrice: m.unitPrice,
    currentQty: m.qty,
    safetyQty: 0,
    unit: "개",
    location: m.location,
    roomName: m.room,
    expenditureDocument: m.expenseDoc,
    lastInboundAt: toDateStr(m.acquiredAt),
    lastOutboundAt: null,
    status: m.qty === 0 ? "소진" : "정상",
  }));

  const SLOT_LABEL = { desktop: "데스크톱", monitor: "모니터", printer: "프린터", phone: "전화기" } as const;
  const seats: Seat[] = parsed.seats.map((s) => ({
    id: `seat-${s.code}`,
    code: s.code,
    occupantName: s.occupantName,
    assets: s.slots.map((slot) => ({
      slot: slot.slot,
      label: SLOT_LABEL[slot.slot],
      rawValue: slot.rawValue,
      needsReview: slot.needsReview,
    })),
  }));

  return {
    fileName,
    assets,
    consumables: consumables.length ? consumables : undefined,
    seats: seats.length ? seats : undefined,
    notebooks: parsed.notebooks.length
      ? parsed.notebooks.map((n) => ({ managementNo: n.managementNo, status: n.status, holder: n.holder }))
      : undefined,
  };
}

export function ImportFlow(_props: { job?: ImportJob }) {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [committed, setCommitted] = useState<{ assets: number; consumables: number; seats: number; loans: number } | null>(null);
  const [committing, startCommit] = useTransition();

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      // 실제 파서 실행 (xlsx 는 용량이 커서 분석 시점에만 동적 로드)
      const { readWorkbook, parseWorkbook } = await import("@/lib/excel/parse");
      const buffer = await file.arrayBuffer();
      const wb = readWorkbook(buffer);
      const result = parseWorkbook(wb);
      if (result.assets.length === 0) {
        setParsed(null);
        setJob(null);
        toast({
          kind: "error",
          title: "가져올 자산 데이터가 없습니다",
          description: `'${SHEET.assets}' 시트에서 품명이 있는 행을 찾지 못했습니다. 자산관리대장 양식(.xlsm/.xlsx)인지 확인해주세요. (인식된 시트: ${result.sheetsPresent.join(", ") || "없음"})`,
        });
      } else {
        setParsed(result);
        setJob(buildJob(file.name, result));
        toast({ kind: "success", title: "분석 완료", description: `${result.assets.length}건의 자산 행을 인식했습니다.` });
      }
    } catch (err) {
      setParsed(null);
      setJob(null);
      toast({
        kind: "error",
        title: "파일을 읽을 수 없습니다",
        description: `엑셀 파일 파싱 중 오류가 발생했습니다. 손상되지 않은 .xlsm/.xlsx 파일인지 확인해주세요. (${err instanceof Error ? err.message : String(err)})`,
      });
    } finally {
      setAnalyzing(false);
    }
  }

  function commit() {
    if (!file || !parsed || !job) return;
    startCommit(async () => {
      const result = await commitImportAction(buildPayload(file.name, parsed));
      if (result.ok) {
        setCommitted({ assets: result.assets, consumables: result.consumables, seats: result.seats, loans: result.loans });
        toast({
          kind: "success",
          title: "가져오기 반영 완료",
          description: "기존 데모 원장이 업로드한 파일 기준으로 교체되었습니다. (DB 미연동 — 서버 재시작 시 초기화)",
        });
        router.refresh();
      } else {
        toast({ kind: "error", title: "반영 실패", description: result.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      <ImportUploadCard
        fileName={file?.name ?? null}
        onFile={(f) => { setFile(f); setParsed(null); setJob(null); setCommitted(null); }}
        onAnalyze={analyze}
        analyzing={analyzing}
      />

      {job && (
        <>
          <ImportValidationSummary job={job} />

          <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03] sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              검증을 통과한 <b className="text-foreground">{job.validation.importable.toLocaleString("ko-KR")}건</b>을 반영합니다.
              기존 데모 원장 데이터는 업로드한 파일 기준으로 <b className="text-foreground">교체</b>됩니다.
            </div>
            <Button onClick={commit} disabled={committing || !!committed || job.validation.errors > 0} size="lg">
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {committed ? "반영 완료" : committing ? "반영 중…" : "데이터 반영"}
            </Button>
          </div>

          {job.validation.errors > 0 && !committed && (
            <div className="rounded-card bg-pastel-coral/50 p-5 text-sm text-pastel-coralInk">
              오류 {job.validation.errors}건이 있어 반영할 수 없습니다. 위 오류 상세를 확인하고 파일을 수정한 뒤 다시 업로드해주세요.
            </div>
          )}

          {committed && (
            <div className="flex items-center gap-3 rounded-card bg-pastel-mint/50 p-5 text-sm text-pastel-mintInk">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                가져오기가 완료되었습니다 — 자산 {committed.assets.toLocaleString("ko-KR")}건
                {committed.consumables > 0 && ` · 소모품 ${committed.consumables}종`}
                {committed.seats > 0 && ` · 좌석 ${committed.seats}석`}
                {committed.loans > 0 && ` · 노트북 ${committed.loans}대`}
                이(가) 반영되었습니다. 대시보드와 자산 원장에서 바로 확인하세요.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
