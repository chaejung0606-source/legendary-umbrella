"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowUpRight, RotateCcw, FileText, X, Plus } from "lucide-react";
import type { LoanStatus } from "@/types";
import { TODAY } from "@/data/pools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { loanAssetsAction, returnAssetAction, searchLoanableAssetsAction, type LoanableAsset } from "@/app/actions";
import { SignaturePad } from "@/components/ui/signature-pad";

// 자산 대여 관리 대장의 동의 문구 (종이 대장 원문)
const LOAN_PLEDGE =
  "본인은 상기 자산을 목적에 따라 성실하고 안전하게 사용하며, 파손·분실·고장 발생 시 관련 절차에 따라 처리함에 동의합니다. 또한 이상 발생 시 즉시 사업단에 보고할 것에 동의합니다.";
const RETURN_PLEDGE =
  "본인은 대여 자산을 점검한 후 이상 유무를 확인하였으며, 사용 기간 중 발생한 파손·분실·고장 등에 대해 사실대로 보고하였음을 확인하고 이에 따른 조치에 동의합니다.";

export interface LoanTargetAsset {
  id: string;
  itemName: string;
  managementNo: string;
}

export interface ReturnTargetLoan {
  assetId: string;
  itemName: string;
  managementNo: string;
  userName?: string | null;
}

function PledgeBox({ text }: { text: string }) {
  return (
    <label className="flex items-start gap-2.5 rounded-2xl bg-accent/70 p-3.5 text-xs leading-relaxed text-accent-foreground">
      <input type="checkbox" name="pledge" required className="mt-0.5 shrink-0" />
      <span>「{text}」</span>
    </label>
  );
}

/**
 * 대여신청서 다이얼로그.
 * 신청서가 바로 열리고, 대여할 자산은 신청서 안에서 검색해 복수 선택한다.
 */
export function LoanApplicationDialog({
  open,
  onClose,
  asset: preset,
}: {
  open: boolean;
  onClose: () => void;
  asset?: LoanTargetAsset | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [searching, startSearch] = useTransition();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LoanableAsset[]>([]);
  const [picked, setPicked] = useState<LoanTargetAsset[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  // preset(자산 상세에서 진입)은 기본 선택으로 시작하고 추가 선택도 가능
  const assets = preset && !picked.some((p) => p.id === preset.id) ? [preset, ...picked] : picked;

  function close() {
    setQ(""); setResults([]); setPicked([]); setSignature(null);
    onClose();
  }

  function search() {
    startSearch(async () => setResults(await searchLoanableAssetsAction(q)));
  }

  function addAsset(r: LoanableAsset) {
    if (assets.some((a) => a.id === r.id)) return;
    setPicked((prev) => [...prev, { id: r.id, itemName: r.itemName, managementNo: r.managementNo }]);
  }
  function removeAsset(id: string) {
    setPicked((prev) => prev.filter((a) => a.id !== id));
  }

  function submit(fd: FormData) {
    if (!assets.length) return;
    startTransition(async () => {
      const result = await loanAssetsAction(assets.map((a) => a.id), {
        userName: String(fd.get("userName") ?? ""),
        userAffiliation: String(fd.get("userAffiliation") ?? "") || null,
        userIdNo: String(fd.get("userIdNo") ?? "") || null,
        userPhone: String(fd.get("userPhone") ?? "") || null,
        reason: String(fd.get("reason") ?? "") || null,
        loanManager: String(fd.get("loanManager") ?? "") || null,
        loanedAt: String(fd.get("loanedAt") ?? "") || null,
        dueAt: String(fd.get("dueAt") ?? ""),
        signature,
      });
      if (result.ok) {
        toast({
          kind: "success",
          title: `자산 ${result.count}건 대여 처리 완료`,
          description: `${assets[0].itemName}${result.count > 1 ? ` 외 ${result.count - 1}건` : ""} 대여가 대장에 기록되었습니다.`,
        });
        close();
        router.refresh();
      } else {
        toast({ kind: "error", title: "대여 실패", description: result.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-brand-700" /> 자산 대여 신청서</DialogTitle>
          <DialogDescription>자산 대여 관리 대장 양식에 따라 작성합니다.</DialogDescription>
        </DialogHeader>

        {/* 신청서가 바로 열리고, 대여할 자산은 신청서 안에서 선택한다 */}
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <Field label={`대여 자산 (${assets.length}건 선택)`} required hint="여러 자산을 함께 선택할 수 있어요">
            <div className="space-y-2">
              {assets.length > 0 && (
                <ul className="space-y-1.5">
                  {assets.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{a.itemName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{a.managementNo}</div>
                      </div>
                      {!(preset && preset.id === a.id) && (
                        <button type="button" onClick={() => removeAsset(a.id)} className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-card hover:text-pastel-coralInk" aria-label="선택 해제">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder={assets.length ? "자산 추가 검색" : "품명·관리번호 검색"} className="pl-10" />
                </div>
                <Button type="button" size="sm" onClick={search} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 검색
                </Button>
              </div>
              {results.filter((r) => !assets.some((a) => a.id === r.id)).length > 0 && (
                <ul className="max-h-36 space-y-1.5 overflow-y-auto pastel-scroll">
                  {results.filter((r) => !assets.some((a) => a.id === r.id)).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => addAsset(r)}
                        className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-3.5 py-2.5 text-left transition hover:bg-accent"
                      >
                        <Plus className="h-4 w-4 shrink-0 text-brand-700" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{r.itemName}</span>
                          <span className="block font-mono text-[11px] text-muted-foreground">{r.managementNo}{r.place && ` · ${r.place}`}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q && !searching && results.length === 0 && (
                <p className="rounded-xl bg-muted/60 px-3.5 py-3 text-xs text-muted-foreground">검색 결과가 없거나 모두 대여 중입니다.</p>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="대여일자" required><Input name="loanedAt" type="date" required defaultValue={TODAY} /></Field>
            <Field label="반납 예정일" required><Input name="dueAt" type="date" required min={TODAY} /></Field>
          </div>
          <Field label="사유" required><Input name="reason" required placeholder="예: 출장용 노트북 사용" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="대여자" required><Input name="userName" required placeholder="이름" /></Field>
            <Field label="전화번호"><Input name="userPhone" type="tel" placeholder="010-0000-0000" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="소속"><Input name="userAffiliation" placeholder="예: 사업단 / 데이터보안활용융합전공" /></Field>
            <Field label="사번/학번"><Input name="userIdNo" placeholder="예: 2024123" /></Field>
          </div>
          <Field label="대여 관리자"><Input name="loanManager" placeholder="담당 관리자 이름" /></Field>

          <Field label="대여자 서명" required>
            <SignaturePad onChange={setSignature} />
          </Field>

          <PledgeBox text={LOAN_PLEDGE} />

          <DialogFooter className="items-center gap-2">
            {!assets.length && <span className="text-xs text-muted-foreground">먼저 대여 자산을 검색해 선택해주세요.</span>}
            {assets.length > 0 && !signature && <span className="text-xs text-muted-foreground">대여자 서명을 해주세요.</span>}
            <Button type="submit" disabled={pending || !assets.length || !signature}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />} 대여 처리{assets.length > 1 ? ` (${assets.length}건)` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 반납신청서 다이얼로그.
 * loan 미지정 시(독립 '반납 처리' 버튼) 현재 대여 중 목록에서 선택.
 */
export function ReturnApplicationDialog({
  open,
  onClose,
  loan: preset,
  outLoans = [],
}: {
  open: boolean;
  onClose: () => void;
  loan?: ReturnTargetLoan | null;
  outLoans?: ReturnTargetLoan[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [pickedId, setPickedId] = useState("");
  const loan = preset ?? outLoans.find((l) => l.assetId === pickedId) ?? null;

  function close() {
    setPickedId("");
    onClose();
  }

  function submit(fd: FormData) {
    if (!loan) return;
    startTransition(async () => {
      const result = await returnAssetAction(loan.assetId, {
        returnerName: String(fd.get("returnerName") ?? ""),
        returnerAffiliation: String(fd.get("returnerAffiliation") ?? "") || null,
        returnerPhone: String(fd.get("returnerPhone") ?? "") || null,
        returnManager: String(fd.get("returnManager") ?? "") || null,
        returnedAt: String(fd.get("returnedAt") ?? "") || null,
        afterStatus: String(fd.get("afterStatus") ?? "보관") as LoanStatus,
        damaged: fd.get("damaged") === "on",
      });
      if (result.ok) {
        toast({ kind: "success", title: "반납 처리 완료", description: `${loan.itemName} 반납이 대장에 기록되었습니다.` });
        close();
        router.refresh();
      } else {
        toast({ kind: "error", title: "반납 실패", description: result.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-brand-700" /> 자산 반납 신청서</DialogTitle>
          <DialogDescription>자산 대여 관리 대장 양식에 따라 작성합니다.</DialogDescription>
        </DialogHeader>

        {!preset && (
          <Field label="반납할 자산" required>
            <NativeSelect value={pickedId} onChange={(e) => setPickedId(e.target.value)} required>
              <option value="" disabled>현재 대여 중인 자산 선택 ({outLoans.length}건)</option>
              {outLoans.map((l) => (
                <option key={l.assetId} value={l.assetId}>
                  {l.itemName} · {l.userName ?? "-"} · {l.managementNo}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}

        {loan && (
          <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <div className="text-sm font-bold">{loan.itemName}</div>
              <div className="font-mono text-xs text-muted-foreground">{loan.managementNo}{loan.userName && ` · 대여자 ${loan.userName}`}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="반납일자" required><Input name="returnedAt" type="date" required defaultValue={TODAY} /></Field>
              <Field label="반납 후 상태">
                <NativeSelect name="afterStatus" defaultValue="보관">
                  <option>보관</option><option>수리</option><option>분실</option><option>폐기</option>
                </NativeSelect>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="반납자" required><Input name="returnerName" required defaultValue={loan.userName ?? ""} placeholder="이름" /></Field>
              <Field label="소속 (사번/학번)"><Input name="returnerAffiliation" placeholder="예: 사업단 / 2024123" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="전화번호"><Input name="returnerPhone" type="tel" placeholder="010-0000-0000" /></Field>
              <Field label="관리자"><Input name="returnManager" placeholder="담당 관리자 이름" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="damaged" /> 손상 있음 (파손·고장 발견)</label>

            <PledgeBox text={RETURN_PLEDGE} />

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} 반납 처리
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
