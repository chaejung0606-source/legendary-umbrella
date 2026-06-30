"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, RotateCcw, Eye, AlertTriangle } from "lucide-react";
import type { LaptopLoan } from "@/types";
import { formatDate } from "@/lib/format";
import { TODAY } from "@/data/pools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoanStatusBadge } from "@/components/badges/status-badge";

function dueSoon(dueAt?: string | null) {
  if (!dueAt) return false;
  return (new Date(dueAt).getTime() - new Date(TODAY).getTime()) / 86400000 <= 3;
}

export function LaptopLoanTable({ loans }: { loans: LaptopLoan[] }) {
  const [active, setActive] = useState<{ loan: LaptopLoan; mode: "loan" | "return" } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <>
      {done && (
        <div className="mb-3 rounded-2xl bg-pastel-mint/50 px-4 py-2.5 text-sm text-pastel-mintInk">{done} (MVP 시안 — 화면 동작 시연)</div>
      )}
      <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
        <div className="overflow-x-auto pastel-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">관리번호</th>
                <th className="px-4 py-3 font-medium">품명</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">대여일</th>
                <th className="px-4 py-3 font-medium">반납 예정</th>
                <th className="px-4 py-3 text-right font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => {
                const out = l.status === "직원사용" || l.status === "대여중";
                const soon = dueSoon(l.dueAt);
                return (
                  <tr key={l.id} className="border-b border-black/[0.04] transition-colors last:border-0 hover:bg-accent/60">
                    <td className="px-4 py-3.5 font-mono text-xs">{l.managementNo}</td>
                    <td className="px-4 py-3.5 font-medium">{l.itemName}</td>
                    <td className="px-4 py-3.5"><LoanStatusBadge status={l.status} /></td>
                    <td className="px-4 py-3.5 text-sm">{l.userName ?? "-"}</td>
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
                        {out ? (
                          <Button size="sm" variant="outline" onClick={() => setActive({ loan: l, mode: "return" })}><RotateCcw className="h-3.5 w-3.5" /> 반납</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setActive({ loan: l, mode: "loan" })}><ArrowLeftRight className="h-3.5 w-3.5" /> 대여</Button>
                        )}
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

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{active?.mode === "loan" ? "노트북 대여 처리" : "노트북 반납 처리"}</DialogTitle></DialogHeader>
          {active && (
            <form
              onSubmit={(e) => { e.preventDefault(); setDone(`${active.loan.itemName} ${active.mode === "loan" ? "대여" : "반납"} 처리 완료`); setActive(null); }}
              className="space-y-3"
            >
              <p className="font-mono text-xs text-muted-foreground">{active.loan.managementNo}</p>
              {active.mode === "loan" ? (
                <>
                  <Field label="사용자" required><Input required defaultValue="" placeholder="이름" /></Field>
                  <Field label="예정 반납일"><Input type="date" /></Field>
                </>
              ) : (
                <>
                  <Field label="반납 후 상태">
                    <NativeSelect defaultValue="보관"><option>보관</option><option>수리</option><option>분실</option><option>폐기</option></NativeSelect>
                  </Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> 손상 있음</label>
                </>
              )}
              <DialogFooter><Button type="submit">{active.mode === "loan" ? "대여 처리" : "반납 처리"}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
