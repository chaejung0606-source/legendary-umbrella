"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, RotateCcw, Eye, AlertTriangle, Laptop, Boxes, FilePlus2 } from "lucide-react";
import type { LaptopLoan } from "@/types";
import { formatDate } from "@/lib/format";
import { TODAY } from "@/data/pools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoanStatusBadge, StatusBadge } from "@/components/badges/status-badge";
import { SoftCard, SoftCardHeader } from "@/components/cards/soft-card";
import { LoanApplicationDialog, ReturnApplicationDialog, type LoanTargetAsset, type ReturnTargetLoan } from "./loan-forms";

export interface LoanCandidate {
  id: string;
  itemName: string;
  managementNo: string;
  place: string;
  status: string;
}

function dueSoon(dueAt?: string | null) {
  if (!dueAt) return false;
  return (new Date(dueAt).getTime() - new Date(TODAY).getTime()) / 86400000 <= 3;
}

// 전체 자산 대여/반납: 독립 대여·반납 신청 버튼 + 대여 중 목록 + 검색 + 반납 이력.
export function LoanManager({
  out,
  returned,
  candidates,
  q,
}: {
  out: LaptopLoan[];
  returned: LaptopLoan[];
  candidates: LoanCandidate[];
  q: string;
}) {
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanTarget, setLoanTarget] = useState<LoanTargetAsset | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<ReturnTargetLoan | null>(null);

  const outTargets: ReturnTargetLoan[] = out.map((l) => ({
    assetId: l.assetId, itemName: l.itemName, managementNo: l.managementNo, userName: l.userName,
  }));

  return (
    <div className="space-y-5">
      {/* ── 독립 대여/반납 신청 버튼 ── */}
      <SoftCard className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold"><FilePlus2 className="h-5 w-5 text-brand-700" /> 대여 · 반납 신청</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">자산 대여 관리 대장 양식으로 신청서를 작성해 처리합니다.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button className="flex-1 sm:flex-none" onClick={() => { setLoanTarget(null); setLoanOpen(true); }}>
            <ArrowUpRight className="h-4 w-4" /> 대여 신청
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setReturnTarget(null); setReturnOpen(true); }}>
            <RotateCcw className="h-4 w-4" /> 반납 처리
          </Button>
        </div>
      </SoftCard>

      {/* ── 자산 검색으로 바로 대여 ── */}
      <SoftCard>
        <SoftCardHeader title="자산 검색" description="자산을 찾아 바로 대여 신청서를 작성합니다. (대여 중 자산 제외)" />
        <form method="get" className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="품명·관리번호·사용자 검색" className="pl-10" />
          </div>
          <Button type="submit" size="sm"><Search className="h-4 w-4" /> 검색</Button>
        </form>

        {q && (
          <div className="mt-4">
            {candidates.length === 0 ? (
              <p className="rounded-2xl bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
                &lsquo;{q}&rsquo;에 해당하는 대여 가능 자산이 없어요. (이미 대여 중이거나 검색 결과 없음)
              </p>
            ) : (
              <ul className="space-y-2">
                {candidates.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.itemName}</span>
                        <StatusBadge label={c.status} tone="slate" dot={false} />
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{c.managementNo}{c.place && ` · ${c.place}`}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => { setLoanTarget({ id: c.id, itemName: c.itemName, managementNo: c.managementNo }); setLoanOpen(true); }}>
                        <ArrowUpRight className="h-3.5 w-3.5" /> 대여
                      </Button>
                      <Button asChild size="sm" variant="ghost"><Link href={`/assets/${c.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SoftCard>

      {/* ── 현재 대여/사용 중 ── */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-bold">현재 대여 / 사용 중</h3>
          <span className="text-xs text-muted-foreground">{out.length}건</span>
        </div>
        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">관리번호</th>
                  <th className="px-4 py-3 font-medium">품명</th>
                  <th className="px-4 py-3 font-medium">구분</th>
                  <th className="px-4 py-3 font-medium">대여자</th>
                  <th className="px-4 py-3 font-medium">사유</th>
                  <th className="px-4 py-3 font-medium">대여일</th>
                  <th className="px-4 py-3 font-medium">반납 예정</th>
                  <th className="px-4 py-3 text-right font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {out.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">현재 대여 중인 자산이 없어요.</td></tr>
                )}
                {out.map((l) => {
                  const soon = dueSoon(l.dueAt);
                  return (
                    <tr key={l.id} className="border-b border-black/[0.04] transition-colors last:border-0 hover:bg-accent/60">
                      <td className="px-4 py-3.5 font-mono text-xs">{l.managementNo}</td>
                      <td className="px-4 py-3.5 font-medium">{l.itemName}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {l.isNotebook ? <Laptop className="h-3.5 w-3.5" /> : <Boxes className="h-3.5 w-3.5" />}
                          {l.isNotebook ? "노트북" : "일반자산"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium">{l.userName ?? "-"}</span>
                        {(l.userAffiliation || l.userPhone) && (
                          <span className="block text-[11px] text-muted-foreground">{[l.userAffiliation, l.userPhone].filter(Boolean).join(" · ")}</span>
                        )}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3.5 text-xs text-muted-foreground">{l.reason ?? "-"}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDate(l.loanedAt)}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {l.dueAt ? (
                          <span className={soon ? "inline-flex items-center gap-1 font-semibold text-pastel-coralInk" : "text-muted-foreground"}>
                            {soon && <AlertTriangle className="h-3.5 w-3.5" />}{formatDate(l.dueAt)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => { setReturnTarget({ assetId: l.assetId, itemName: l.itemName, managementNo: l.managementNo, userName: l.userName }); setReturnOpen(true); }}>
                            <RotateCcw className="h-3.5 w-3.5" /> 반납
                          </Button>
                          <Button asChild size="sm" variant="ghost"><Link href={`/assets/${l.assetId}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 최근 반납 이력 ── */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-bold">최근 반납 이력</h3>
          <span className="text-xs text-muted-foreground">{returned.length}건</span>
        </div>
        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">관리번호</th>
                  <th className="px-4 py-3 font-medium">품명</th>
                  <th className="px-4 py-3 font-medium">대여자</th>
                  <th className="px-4 py-3 font-medium">반납자</th>
                  <th className="px-4 py-3 font-medium">반납일</th>
                  <th className="px-4 py-3 font-medium">현재 상태</th>
                  <th className="px-4 py-3 font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {returned.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">반납 이력이 아직 없어요.</td></tr>
                )}
                {returned.map((l) => (
                  <tr key={l.id} className="border-b border-black/[0.04] last:border-0 hover:bg-accent/60">
                    <td className="px-4 py-3 font-mono text-xs">{l.managementNo}</td>
                    <td className="px-4 py-3 font-medium">{l.itemName}</td>
                    <td className="px-4 py-3 text-xs">{l.userName ?? "-"}</td>
                    <td className="px-4 py-3 text-xs">
                      {l.returnerName ?? "-"}
                      {l.returnManager && <span className="block text-[11px] text-muted-foreground">관리자 {l.returnManager}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(l.returnedAt)}</td>
                    <td className="px-4 py-3"><LoanStatusBadge status={l.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 신청서 다이얼로그 */}
      <LoanApplicationDialog open={loanOpen} onClose={() => { setLoanOpen(false); setLoanTarget(null); }} asset={loanTarget} />
      <ReturnApplicationDialog open={returnOpen} onClose={() => { setReturnOpen(false); setReturnTarget(null); }} loan={returnTarget} outLoans={outTargets} />
    </div>
  );
}
