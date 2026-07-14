"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, PackagePlus, PackageMinus, ClipboardCheck, Pencil, Eye, FileText, Ban,
  CheckCircle2, Loader2, Download, Truck,
} from "lucide-react";
import type { PromoItemWithStock, PromoTxn, PromoRequest } from "@/types";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/badges/status-badge";
import { SoftCard, SoftCardHeader } from "@/components/cards/soft-card";
import { useToast } from "@/components/ui/toaster";
import { decidePromoRequestAction, completePromoRequestAction } from "@/app/actions";
import {
  PromoItemDialog, PromoInboundDialog, PromoOutboundDialog, PromoAdjustDialog,
  PromoCancelTxnDialog, PromoRequestDialog, PromoRejectDialog,
} from "./promo-dialogs";

const STOCK_TONE: Record<PromoItemWithStock["stockState"], "mint" | "cream" | "coral" | "slate"> = {
  "정상": "mint", "재고 주의": "cream", "재고 부족": "coral", "품절": "slate",
};
const REQ_TONE: Record<string, "sky" | "mint" | "coral" | "slate" | "lavender"> = {
  "신청": "sky", "승인": "lavender", "출고완료": "mint", "반려": "coral", "취소": "slate",
};

export function PromoManager({ items, txns, requests, isManager, userName }: {
  items: PromoItemWithStock[];
  txns: PromoTxn[];
  requests: PromoRequest[];
  isManager: boolean;
  userName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deciding, startDecide] = useTransition();

  // 다이얼로그 상태
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: PromoItemWithStock | null }>({ open: false, item: null });
  const [inbound, setInbound] = useState<PromoItemWithStock | null>(null);
  const [outbound, setOutbound] = useState<PromoItemWithStock | null>(null);
  const [adjust, setAdjust] = useState<PromoItemWithStock | null>(null);
  const [cancelTxn, setCancelTxn] = useState<{ id: string; label: string } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reject, setReject] = useState<{ id: string; label: string } | null>(null);

  // 물품 목록 필터
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState("전체");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((i) => {
      if (stateFilter !== "전체" && i.stockState !== stateFilter) return false;
      if (!query) return true;
      return [i.code, i.name, i.category, i.location, i.note].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [items, q, stateFilter]);

  // 수불관리대장 필터
  const [ledgerItem, setLedgerItem] = useState("전체");
  const [showCancelled, setShowCancelled] = useState(true);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const ledgerRows = useMemo(() => {
    let rows = [...txns].sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date))).reverse();
    if (ledgerItem !== "전체") rows = rows.filter((t) => t.itemId === ledgerItem);
    if (!showCancelled) rows = rows.filter((t) => t.status === "정상" && !t.type.includes("취소"));
    return rows;
  }, [txns, ledgerItem, showCancelled]);

  // 통계 — 재고 합계와 동일 규칙(모든 기록 합산, 취소는 보정 기록으로 상쇄)
  const stats = useMemo(() => {
    const totalIn = txns.filter((t) => t.direction > 0).reduce((s, t) => s + t.qty, 0);
    const totalOut = txns.filter((t) => t.direction < 0).reduce((s, t) => s + t.qty, 0);
    const stockValue = items.reduce((s, i) => s + i.currentQty * i.unitPrice, 0);
    const alertCount = items.filter((i) => i.status === "사용" && i.stockState !== "정상" && (i.totalIn > 0 || i.safetyQty > 0)).length;
    const byMonth = new Map<string, { in: number; out: number }>();
    for (const t of txns) {
      const key = t.date.slice(0, 7);
      const cur = byMonth.get(key) ?? { in: 0, out: 0 };
      if (t.direction > 0) cur.in += t.qty; else cur.out += t.qty;
      byMonth.set(key, cur);
    }
    // 행사/목적별 분포는 취소되지 않은 실제 출고만 집계
    const byPurpose = new Map<string, number>();
    for (const t of txns.filter((t) => t.type === "출고" && t.status === "정상")) {
      const key = t.eventName || t.purpose || "기타";
      byPurpose.set(key, (byPurpose.get(key) ?? 0) + t.qty);
    }
    const topOut = [...items].filter((i) => i.totalOut > 0).sort((a, b) => b.totalOut - a.totalOut).slice(0, 5);
    return {
      totalIn, totalOut, stockValue, alertCount,
      months: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      purposes: [...byPurpose.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      topOut,
    };
  }, [items, txns]);

  const pendingRequests = requests.filter((r) => r.status === "신청" || r.status === "승인");

  function decide(id: string, decision: "승인" | "취소", label: string) {
    startDecide(async () => {
      const result = await decidePromoRequestAction(id, decision);
      if (result.ok) { toast({ kind: "success", title: `${decision} 처리 완료`, description: label }); router.refresh(); }
      else toast({ kind: "error", title: "처리 실패", description: result.error });
    });
  }
  function complete(id: string, label: string) {
    startDecide(async () => {
      const result = await completePromoRequestAction(id);
      if (result.ok) { toast({ kind: "success", title: "출고완료 처리", description: `${label} — 재고가 차감되었습니다.` }); router.refresh(); }
      else toast({ kind: "error", title: "처리 실패", description: result.error });
    });
  }

  return (
    <Tabs defaultValue="items">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="items">물품 현황</TabsTrigger>
          <TabsTrigger value="ledger">수불관리대장</TabsTrigger>
          <TabsTrigger value="requests">
            출고 신청 {pendingRequests.length > 0 && <span className="ml-1.5 rounded-full bg-pastel-coral px-1.5 text-[11px] font-bold text-pastel-coralInk">{pendingRequests.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href="/api/export/promo"><Download className="h-4 w-4" /> 현황 엑셀</a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="/api/export/promo-ledger"><Download className="h-4 w-4" /> 대장 엑셀</a>
          </Button>
          <Button size="sm" onClick={() => setRequestOpen(true)}><FileText className="h-4 w-4" /> 출고 신청</Button>
          {isManager && (
            <Button size="sm" onClick={() => setItemDialog({ open: true, item: null })}><PackagePlus className="h-4 w-4" /> 물품 등록</Button>
          )}
        </div>
      </div>

      {/* ── 물품 현황 ── */}
      <TabsContent value="items" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코드·물품명·보관장소 검색" className="pl-10" />
          </div>
          <NativeSelect value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-36">
            {["전체", "정상", "재고 주의", "재고 부족", "품절"].map((s) => <option key={s}>{s}</option>)}
          </NativeSelect>
        </div>

        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">코드</th>
                  <th className="px-4 py-3 font-medium">물품명</th>
                  <th className="px-4 py-3 text-right font-medium">현재 재고</th>
                  <th className="px-4 py-3 text-right font-medium">예약</th>
                  <th className="px-4 py-3 text-right font-medium">가용</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 text-right font-medium">단가</th>
                  <th className="px-4 py-3 font-medium">보관장소</th>
                  <th className="px-4 py-3 font-medium">최근 입/출고</th>
                  <th className="px-4 py-3 text-right font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">조건에 맞는 물품이 없어요.</td></tr>
                )}
                {filtered.map((i) => (
                  <tr key={i.id} className="border-b border-black/[0.04] transition-colors last:border-0 hover:bg-accent/60">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold">{i.code}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/promo/${i.id}`} className="font-semibold hover:text-brand-700 hover:underline">{i.name}</Link>
                      {i.status === "사용중지" && <StatusBadge label="사용중지" tone="slate" dot={false} className="ml-2" />}
                      {i.note && <span className="block text-[11px] text-muted-foreground">{i.note}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">{formatNumber(i.currentQty)}<span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{i.unit}</span></td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{i.reservedQty > 0 ? formatNumber(i.reservedQty) : "-"}</td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{formatNumber(i.availableQty)}</td>
                    <td className="px-4 py-3.5"><StatusBadge label={i.stockState} tone={STOCK_TONE[i.stockState]} /></td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs text-muted-foreground">{i.unitPrice ? formatCurrency(i.unitPrice) : "-"}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{i.location ?? "-"}</td>
                    <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                      입 {formatDate(i.lastInAt)}<br />출 {formatDate(i.lastOutAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        {isManager && (
                          <>
                            <Button size="sm" variant="outline" title="입고" onClick={() => setInbound(i)}><PackagePlus className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="outline" title="출고" disabled={i.currentQty <= 0} onClick={() => setOutbound(i)}><PackageMinus className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" title="실사 조정" onClick={() => setAdjust(i)}><ClipboardCheck className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" title="수정" onClick={() => setItemDialog({ open: true, item: i })}><Pencil className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        <Button asChild size="sm" variant="ghost" title="물품별 대장"><Link href={`/promo/${i.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          재고는 입고/출고 기록의 합으로 자동 계산되며 직접 수정할 수 없습니다. 수량이 실제와 다르면 <b>실사 조정</b>을 사용하세요.
        </p>
      </TabsContent>

      {/* ── 수불관리대장 ── */}
      <TabsContent value="ledger" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect value={ledgerItem} onChange={(e) => setLedgerItem(e.target.value)} className="w-64">
            <option value="전체">전체 물품</option>
            {items.map((i) => <option key={i.id} value={i.id}>[{i.code}] {i.name}</option>)}
          </NativeSelect>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> 취소 기록 포함
          </label>
          <span className="ml-auto text-xs text-muted-foreground">{ledgerRows.length}건</span>
        </div>

        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">일자</th>
                  <th className="px-4 py-3 font-medium">물품</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 text-right font-medium">입고</th>
                  <th className="px-4 py-3 text-right font-medium">출고</th>
                  <th className="px-4 py-3 text-right font-medium">처리 후 재고</th>
                  <th className="px-4 py-3 font-medium">내용 / 행사</th>
                  <th className="px-4 py-3 font-medium">수령/담당</th>
                  <th className="px-4 py-3 font-medium">기록자</th>
                  {isManager && <th className="px-4 py-3 text-right font-medium">취소</th>}
                </tr>
              </thead>
              <tbody>
                {ledgerRows.length === 0 && (
                  <tr><td colSpan={isManager ? 10 : 9} className="px-4 py-8 text-center text-sm text-muted-foreground">수불 기록이 없어요.</td></tr>
                )}
                {ledgerRows.map((t) => {
                  const item = itemById.get(t.itemId);
                  const cancelled = t.status === "취소됨";
                  const isCancelEntry = t.type.includes("취소");
                  return (
                    <tr key={t.id} className={`border-b border-black/[0.04] last:border-0 ${cancelled ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-xs">{t.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold">{item?.code}</span> <span className="font-medium">{item?.name ?? "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={t.type} tone={isCancelEntry ? "slate" : t.direction > 0 ? "mint" : "coral"} dot={false} />
                        {cancelled && <span className="ml-1 text-[10px] text-pastel-coralInk">취소됨</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.direction > 0 ? formatNumber(t.qty) : ""}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.direction < 0 ? formatNumber(t.qty) : ""}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(t.balanceAfter)}</td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-muted-foreground">
                        <span className="block truncate">{[t.purpose, t.eventName].filter(Boolean).join(" · ") || "-"}</span>
                        {t.cancelReason && <span className="block truncate text-pastel-coralInk">사유: {t.cancelReason}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{[t.receiverName ?? t.takerName, t.manager].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.createdBy ?? "-"}</td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          {!cancelled && !isCancelEntry && (
                            <Button size="sm" variant="ghost" title="기록 취소" onClick={() => setCancelTxn({ id: t.id, label: `${t.date} ${item?.name ?? ""} ${t.type} ${t.qty}` })}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          기록은 삭제되지 않습니다. 잘못된 기록은 <b>취소</b> 처리하면 반대 방향의 취소 기록이 추가되어 이력이 보존됩니다.
        </p>
      </TabsContent>

      {/* ── 출고 신청 / 승인 ── */}
      <TabsContent value="requests" className="space-y-4">
        <SoftCard className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-bold">출고 신청 → 승인 → 출고완료</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              승인 시 수량이 <b>예약</b>되어 가용 재고에서 제외되고, 출고완료 시 실제 재고가 차감됩니다.
            </p>
          </div>
          <Button onClick={() => setRequestOpen(true)}><FileText className="h-4 w-4" /> 출고 신청서 작성</Button>
        </SoftCard>

        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">신청일</th>
                  <th className="px-4 py-3 font-medium">물품</th>
                  <th className="px-4 py-3 text-right font-medium">수량</th>
                  <th className="px-4 py-3 font-medium">목적 / 행사</th>
                  <th className="px-4 py-3 font-medium">신청자</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">처리자</th>
                  <th className="px-4 py-3 text-right font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">출고 신청이 아직 없어요.</td></tr>
                )}
                {requests.map((r) => {
                  const item = itemById.get(r.itemId);
                  const label = `${item?.name ?? ""} ${r.qty}${item?.unit ?? ""} (${r.requesterName})`;
                  return (
                    <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-accent/60">
                      <td className="px-4 py-3.5 text-xs">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-bold">{item?.code}</span> <span className="font-medium">{item?.name ?? "-"}</span>
                        {r.eventDate && <span className="block text-[11px] text-muted-foreground">사용일 {r.eventDate}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{formatNumber(r.qty)}</td>
                      <td className="max-w-[200px] px-4 py-3.5 text-xs text-muted-foreground">
                        <span className="block truncate">{[r.purpose, r.eventName].filter(Boolean).join(" · ")}</span>
                        {r.rejectReason && <span className="block truncate text-pastel-coralInk">반려: {r.rejectReason}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {r.requesterName}
                        {(r.requesterAffiliation || r.requesterPhone) && (
                          <span className="block text-[11px] text-muted-foreground">{[r.requesterAffiliation, r.requesterPhone].filter(Boolean).join(" · ")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge label={r.status} tone={REQ_TONE[r.status] ?? "slate"} /></td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{r.managerName ?? "-"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1">
                          {isManager && r.status === "신청" && (
                            <>
                              <Button size="sm" disabled={deciding} onClick={() => decide(r.id, "승인", label)}><CheckCircle2 className="h-3.5 w-3.5" /> 승인</Button>
                              <Button size="sm" variant="outline" disabled={deciding} onClick={() => setReject({ id: r.id, label })}><Ban className="h-3.5 w-3.5" /> 반려</Button>
                            </>
                          )}
                          {isManager && r.status === "승인" && (
                            <Button size="sm" disabled={deciding} onClick={() => complete(r.id, label)}>
                              {deciding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />} 출고완료
                            </Button>
                          )}
                          {(r.status === "신청" || r.status === "승인") && (isManager || r.requesterName === userName) && (
                            <Button size="sm" variant="ghost" disabled={deciding} onClick={() => decide(r.id, "취소", label)}>취소</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      {/* ── 통계 ── */}
      <TabsContent value="stats" className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SoftCard><SoftCardHeader title="누적 입고" description={`${formatNumber(stats.totalIn)}개`} /></SoftCard>
          <SoftCard><SoftCardHeader title="누적 출고" description={`${formatNumber(stats.totalOut)}개`} /></SoftCard>
          <SoftCard><SoftCardHeader title="현재 재고 금액" description={formatCurrency(stats.stockValue)} /></SoftCard>
          <SoftCard><SoftCardHeader title="재고 알림 품목" description={`${formatNumber(stats.alertCount)}종`} /></SoftCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SoftCard>
            <SoftCardHeader title="월별 입·출고 수량" description="정상 기록 기준" />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="py-2">월</th><th className="py-2 text-right">입고</th><th className="py-2 text-right">출고</th>
                </tr>
              </thead>
              <tbody>
                {stats.months.map(([m, v]) => (
                  <tr key={m} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-2 text-xs">{m}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(v.in)}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(v.out)}</td>
                  </tr>
                ))}
                {stats.months.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-xs text-muted-foreground">기록 없음</td></tr>}
              </tbody>
            </table>
          </SoftCard>

          <SoftCard>
            <SoftCardHeader title="출고 TOP 5 물품" description="누적 출고 수량 기준" />
            <ul className="space-y-2">
              {stats.topOut.map((i, idx) => (
                <li key={i.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/70 text-xs font-bold">{idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">[{i.code}] {i.name}</span>
                  <span className="text-sm font-bold tabular-nums">{formatNumber(i.totalOut)}{i.unit}</span>
                </li>
              ))}
              {stats.topOut.length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">출고 기록 없음</li>}
            </ul>
          </SoftCard>
        </div>

        <SoftCard>
          <SoftCardHeader title="행사/목적별 출고" description="정상 출고 기록 기준 상위 8건" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {stats.purposes.map(([p, qty]) => (
              <li key={p} className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm">
                <span className="min-w-0 truncate">{p}</span>
                <span className="ml-3 shrink-0 font-bold tabular-nums">{formatNumber(qty)}개</span>
              </li>
            ))}
            {stats.purposes.length === 0 && <li className="col-span-2 py-6 text-center text-xs text-muted-foreground">출고 기록 없음</li>}
          </ul>
        </SoftCard>
      </TabsContent>

      {/* 다이얼로그 */}
      <PromoItemDialog open={itemDialog.open} item={itemDialog.item} onClose={() => setItemDialog({ open: false, item: null })} />
      <PromoInboundDialog open={!!inbound} item={inbound} onClose={() => setInbound(null)} />
      <PromoOutboundDialog open={!!outbound} item={outbound} onClose={() => setOutbound(null)} />
      <PromoAdjustDialog open={!!adjust} item={adjust} onClose={() => setAdjust(null)} />
      <PromoCancelTxnDialog open={!!cancelTxn} txn={cancelTxn} onClose={() => setCancelTxn(null)} />
      <PromoRequestDialog open={requestOpen} items={items} userName={userName} onClose={() => setRequestOpen(false)} />
      <PromoRejectDialog open={!!reject} request={reject} onClose={() => setReject(null)} />
    </Tabs>
  );
}
