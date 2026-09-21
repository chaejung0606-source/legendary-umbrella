import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getConsumableItemById, getConsumableTxns } from "@/data";
import { formatNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/badges/status-badge";
import { ConsumableStatusBadge } from "@/components/badges/status-badge";
import { SoftCard } from "@/components/cards/soft-card";

export const dynamic = "force-dynamic";

/** 품목별 소모품 수불 이력 — 기본 정보 + 입고·출고·조정 이력(최신순) */
export default async function ConsumableItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, txns] = await Promise.all([getConsumableItemById(id), getConsumableTxns(id)]);
  if (!item) notFound();

  const info: [string, React.ReactNode][] = [
    ["규격", item.specification ?? "-"],
    ["단위", item.unit],
    ["단가", item.unitPrice ? formatCurrency(item.unitPrice) : "-"],
    ["재고 금액", formatCurrency(item.unitPrice * item.currentQty)],
    ["안전재고", item.safetyQty ? `${formatNumber(item.safetyQty)}${item.unit}` : "미설정"],
    ["보관장소", item.location ?? "-"],
    ["호실", item.roomName ?? "-"],
    ["지출문서", item.expenditureDocument ?? "-"],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${item.itemName} 입출고 이력`}
        description="품목별 입고·출고·재고조정 이력과 처리 후 재고를 시간순으로 기록합니다."
        icon={<BookOpen className="h-6 w-6" />}
        actions={<Button asChild size="sm" variant="outline"><Link href="/consumables"><ArrowLeft className="h-4 w-4" /> 목록</Link></Button>}
      />

      <SoftCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] pb-4">
          <div>
            <div className="text-lg font-bold">{item.itemName}</div>
            <div className="mt-1"><ConsumableStatusBadge status={item.status} /></div>
          </div>
          <div className="flex gap-6 text-right">
            <div><div className="text-xs text-muted-foreground">현재 재고</div><div className="text-lg font-bold tabular-nums text-brand-700">{formatNumber(item.currentQty)}{item.unit}</div></div>
            <div><div className="text-xs text-muted-foreground">안전재고</div><div className="text-lg font-bold tabular-nums">{formatNumber(item.safetyQty)}</div></div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {info.map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </SoftCard>

      <div>
        <div className="mb-2 px-1 text-sm font-bold">수불 이력 <span className="font-normal text-muted-foreground">{txns.length}건</span></div>
        <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">일자</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 text-right font-medium">입고</th>
                  <th className="px-4 py-3 text-right font-medium">출고</th>
                  <th className="px-4 py-3 text-right font-medium">처리 후 재고</th>
                  <th className="px-4 py-3 font-medium">사유</th>
                  <th className="px-4 py-3 font-medium">기록자</th>
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">아직 입출고 이력이 없습니다. 입고·출고·재고조정을 하면 여기에 기록됩니다.</td></tr>
                )}
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-black/[0.04] last:border-0 hover:bg-accent/60">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={t.type} tone={t.type === "입고" ? "mint" : t.type === "출고" ? "coral" : "slate"} dot={false} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-pastel-mintInk">{t.direction > 0 ? `+${formatNumber(t.qty)}` : "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-pastel-coralInk">{t.direction < 0 ? `-${formatNumber(t.qty)}` : "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(t.balanceAfter)}{item.unit}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.reason ?? (t.type === "조정" && t.direction === 0 ? "실사 확인(변동 없음)" : "-")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.createdBy ?? "-"}<span className="block text-[11px] opacity-70">{formatDateTime(t.createdAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
