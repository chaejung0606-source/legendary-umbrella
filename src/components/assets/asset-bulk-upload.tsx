"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { PlusCircle, Upload, Download, Loader2, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { bulkCreateAssetsAction, type BulkAssetRowInput } from "@/app/actions";

/** 자산 원장 헤더의 등록 버튼 묶음: 단일 등록(폼) + 복수 등록(엑셀 양식 업로드) */
export function AssetRegisterActions() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BulkAssetRowInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]); setFileName(""); setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // 셀 값 → YYYY-MM-DD (Date 객체 / "2026-07-14" / "2026.07.14" / 엑셀 일련번호 지원)
  function toDateStr(v: unknown): string | null {
    if (v == null || v === "") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, "0"), d = String(v.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof v === "number" && v > 20000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return d.toISOString().slice(0, 10);
    }
    const s = String(v).trim().replace(/[./]/g, "-");
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : s;
  }

  async function onFile(file: File | null) {
    reset();
    if (!file) return;
    setFileName(file.name);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const sheetName = wb.SheetNames.includes("자산등록") ? "자산등록" : wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
      const str = (r: Record<string, unknown>, k: string) => String(r[k] ?? "").trim();
      const num = (r: Record<string, unknown>, k: string) => {
        const n = Number(String(r[k] ?? "").replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) && String(r[k]).trim() !== "" ? n : null;
      };
      const parsed: BulkAssetRowInput[] = raw
        .map((r) => ({
          expenditureDocument: str(r, "지출문서") || null,
          managingOrganization: str(r, "관리기관") || null,
          majorCategory: str(r, "대분류") || null,
          middleCategory: str(r, "중분류") || null,
          acquiredDate: toDateStr(r["취득날짜(YYYY-MM-DD)"] ?? r["취득날짜"] ?? r["취득일"]),
          itemName: str(r, "품명(필수)") || str(r, "품명"),
          specification: str(r, "규격") || null,
          unitPrice: num(r, "취득단가"),
          sequenceNo: num(r, "번호"),
          place: str(r, "장소") || null,
          roomName: str(r, "호실") || null,
          buildingCode: str(r, "건축물코드") || null,
          usageRaw: str(r, "사용처") || str(r, "사용자") || null,
          schoolRfidNo: str(r, "RFID번호") || null,
          tagStatus: str(r, "태그상태") || null,
          memo: str(r, "비고") || null,
        }))
        // 예시 행·빈 행 제거
        .filter((r) => r.itemName && !(r.memo ?? "").includes("예시 행"));
      if (!parsed.length) {
        setParseError("등록할 행을 찾지 못했습니다. '자산등록' 시트에 품명(필수)을 입력했는지 확인해주세요.");
      }
      setRows(parsed);
    } catch {
      setParseError("파일을 읽을 수 없습니다. 다운로드한 양식(.xlsx)에 입력한 파일인지 확인해주세요.");
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await bulkCreateAssetsAction(rows);
      if (result.ok) {
        toast({
          kind: "success",
          title: `자산 ${result.created}건 등록 완료`,
          description: result.firstNo ? `관리번호 ${result.firstNo}${result.created > 1 ? ` ~ ${result.lastNo}` : ""} 자동 생성` : undefined,
        });
        setOpen(false); reset();
        router.refresh();
      } else {
        toast({ kind: "error", title: "복수 등록 실패", description: result.error });
      }
    });
  }

  return (
    <>
      <Button asChild><Link href="/assets/new"><PlusCircle className="h-4 w-4" /> 자산 등록</Link></Button>
      <Button variant="outline" onClick={() => setOpen(true)}><Upload className="h-4 w-4" /> 복수 등록(엑셀)</Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); reset(); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-brand-700" /> 복수 자산 등록</DialogTitle>
            <DialogDescription>
              양식을 내려받아 작성한 뒤 업로드하면 한 번에 등록됩니다. 연번·관리번호는 단일 등록과 같은 규칙으로 자동 생성됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-accent/60 px-4 py-3">
              <div className="text-sm">
                <div className="font-semibold">1. 엑셀 양식 다운로드</div>
                <div className="text-xs text-muted-foreground">분류코드표·건축물코드표·작성안내 시트 포함</div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="/api/export/asset-template" download><Download className="h-4 w-4" /> 양식 받기</a>
              </Button>
            </div>

            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <div className="mb-2 text-sm font-semibold">2. 작성한 양식 업로드</div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-card file:px-3.5 file:py-2 file:text-sm file:font-semibold file:shadow-soft"
              />
              {parseError && <p className="mt-2 text-xs font-medium text-pastel-coralInk">{parseError}</p>}
              {rows.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span><b>{fileName}</b> — 등록 대상 <b className="text-brand-800">{rows.length}</b>건</span>
                    <button onClick={reset} className="text-muted-foreground hover:text-foreground" aria-label="선택 취소"><X className="h-4 w-4" /></button>
                  </div>
                  <ul className="max-h-36 space-y-1 overflow-y-auto pastel-scroll">
                    {rows.slice(0, 8).map((r, i) => (
                      <li key={i} className="rounded-lg bg-card px-3 py-1.5 text-xs shadow-soft">
                        <b>{r.itemName}</b>
                        <span className="text-muted-foreground"> · {[r.middleCategory, r.acquiredDate, r.place].filter(Boolean).join(" · ") || "추가 정보 없음"}</span>
                      </li>
                    ))}
                    {rows.length > 8 && <li className="px-3 text-[11px] text-muted-foreground">… 외 {rows.length - 8}건</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={submit} disabled={pending || rows.length === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {rows.length > 0 ? `${rows.length}건 등록` : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
