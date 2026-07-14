import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getPromoItemById, getPromoTxns } from "@/data";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/badges/status-badge";
import { SoftCard } from "@/components/cards/soft-card";
import { LedgerPrintButton } from "@/components/promo/promo-ledger-print";

export const dynamic = "force-dynamic";

const STOCK_TONE = { "정상": "mint", "재고 주의": "cream", "재고 부족": "coral", "품절": "slate" } as const;

/** 물품별 수불관리대장 — 기본 정보 + 시간순 수불 기록 + 인쇄 */
export default async function PromoItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, txns] = await Promise.all([getPromoItemById(id), getPromoTxns(id)]);
  if (!item) notFound();

  const rows = [...txns].sort((a, b) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)
  );

  const info: [string, React.ReactNode][] = [
    ["구분코드", <span key="c" className="font-mono font-bold">{item.code}</span>],
    ["분류", item.category ?? "-"],
    ["규격", item.spec ?? "-"],
    ["단위", item.unit],
    ["구입일자", item.purchasedAt ?? "-"],
    ["단가", item.unitPrice ? formatCurrency(item.unitPrice) : "-"],
    ["총 구입금액", item.totalAmount ? formatCurrency(item.totalAmount) : "-"],
    ["보관장소", item.location ?? "-"],
    ["담당자", item.manager ?? "-"],
    ["구매처", item.vendor ?? "-"],
    ["안전재고", item.safetyQty ? `${formatNumber(item.safetyQty)}${item.unit}` : "미설정"],
    ["비고", item.note ?? "-"],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${item.name} 수불관리대장`}
        description="물품별 입고·출고 이력과 처리 후 재고를 시간순으로 기록한 장부입니다."
        icon={<BookOpen className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <LedgerPrintButton />
            <Button asChild size="sm" variant="outline"><Link href="/promo"><ArrowLeft className="h-4 w-4" /> 목록</Link></Button>
          </div>
        }
      />

      <div id="promo-ledger-print" className="space-y-5">
        {/* 인쇄 시 제목 (화면에서는 PageHeader가 있으므로 숨김) */}
        <h1 className="hidden text-center text-xl font-bold print:block">
          홍보물품 수불관리대장 — [{item.code}] {item.name}
        </h1>

        <SoftCard>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] pb-4">
            <div>
              <div className="text-lg font-bold">[{item.code}] {item.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge label={item.stockState} tone={STOCK_TONE[item.stockState]} />
                {item.status === "사용중지" && <StatusBadge label="사용중지" tone="slate" dot={false} />}
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div><div className="text-xs text-muted-foreground">누적 입고</div><div className="text-lg font-bold tabular-nums">{formatNumber(item.totalIn)}</div></div>
              <div><div className="text-xs text-muted-foreground">누적 출고</div><div className="text-lg font-bold tabular-nums">{formatNumber(item.totalOut)}</div></div>
              <div><div className="text-xs text-muted-foreground">현재 재고</div><div className="text-lg font-bold tabular-nums text-brand-700">{formatNumber(item.currentQty)}{item.unit}</div></div>
              {item.reservedQty > 0 && (
                <div><div className="text-xs text-muted-foreground">예약(승인)</div><div className="text-lg font-bold tabular-nums">{formatNumber(item.reservedQty)}</div></div>
              )}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {info.map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2">
                <dt className="shrink-0 text-xs text-muted-foreground">{k}</dt>
                <dd className="min-w-0 truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </SoftCard>

        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">No.</th>
                  <th className="px-4 py-3 font-medium">일자</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 text-right font-medium">입고</th>
                  <th className="px-4 py-3 text-right font-medium">출고</th>
                  <th className="px-4 py-3 text-right font-medium">처리 후 재고</th>
                  <th className="px-4 py-3 font-medium">내용 / 행사</th>
                  <th className="px-4 py-3 font-medium">수령/반출자</th>
                  <th className="px-4 py-3 font-medium">담당</th>
                  <th className="px-4 py-3 font-medium">기록자</th>
                  <th className="px-4 py-3 font-medium">기록일</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-sm text-muted-foreground">수불 기록이 아직 없어요.</td></tr>
                )}
                {rows.map((t, idx) => {
                  const cancelled = t.status === "취소됨";
                  return (
                    <tr key={t.id} className={`border-b border-black/[0.04] last:border-0 ${cancelled ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 text-xs">{t.date}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={t.type} tone={t.type.includes("취소") ? "slate" : t.direction > 0 ? "mint" : "coral"} dot={false} />
                        {cancelled && <span className="ml-1 text-[10px] text-pastel-coralInk">취소됨</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.direction > 0 ? formatNumber(t.qty) : ""}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.direction < 0 ? formatNumber(t.qty) : ""}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(t.balanceAfter)}</td>
                      <td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground">
                        <span className="block truncate">{[t.purpose, t.eventName].filter(Boolean).join(" · ") || "-"}</span>
                        {t.cancelReason && <span className="block truncate text-pastel-coralInk">사유: {t.cancelReason}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.receiverName ?? t.takerName ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.manager ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.createdBy ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
