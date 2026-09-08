"use client";
import Link from "next/link";
import { RotateCcw, ArrowUpRight, Eye, AlertTriangle } from "lucide-react";
import type { LaptopLoan } from "@/types";
import { formatDate } from "@/lib/format";
import { todayKst, daysBetween } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { LoanStatusBadge } from "@/components/badges/status-badge";

function dueSoon(dueAt?: string | null) {
  if (!dueAt) return false;
  return daysBetween(todayKst(), dueAt) <= 3;
}

// 노트북 대여현황 표. 상단에 "사용/대여 중", 아래에 "보관·기타". 처리 시 대장 양식 신청서 사용.
export function LaptopLoanTable({ loans }: { loans: LaptopLoan[] }) {
  const out = loans.filter((l) => l.status === "직원사용" || l.status === "대여중");
  const rest = loans.filter((l) => l.status !== "직원사용" && l.status !== "대여중");

  function Section({ title, rows, emptyText }: { title: string; rows: LaptopLoan[]; emptyText: string }) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-bold">{title}</h3>
          <span className="text-xs text-muted-foreground">{rows.length}대</span>
        </div>
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
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</td></tr>
                )}
                {rows.map((l) => {
                  const isOut = l.status === "직원사용" || l.status === "대여중";
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
                          {isOut ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/loans/return?asset=${l.assetId}`}><RotateCcw className="h-3.5 w-3.5" /> 반납</Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/loans/new?asset=${l.assetId}`}><ArrowUpRight className="h-3.5 w-3.5" /> 대여</Link>
                            </Button>
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
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section title="현재 사용 / 대여 중" rows={out} emptyText="현재 사용·대여 중인 노트북이 없어요." />
      <Section title="보관 · 기타" rows={rest} emptyText="표시할 항목이 없어요." />
    </div>
  );
}
