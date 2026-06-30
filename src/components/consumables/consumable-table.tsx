import type { ConsumableItem } from "@/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { ConsumableStatusBadge } from "@/components/badges/status-badge";
import { cn } from "@/lib/utils";

export function ConsumableTable({ items }: { items: ConsumableItem[] }) {
  return (
    <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
      <div className="overflow-x-auto pastel-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">품명 / 규격</th>
              <th className="px-4 py-3 text-center font-medium">현재 재고</th>
              <th className="px-4 py-3 text-right font-medium">단가</th>
              <th className="px-4 py-3 text-right font-medium">재고 금액</th>
              <th className="px-4 py-3 font-medium">보관 장소</th>
              <th className="px-4 py-3 font-medium">최근 입고</th>
              <th className="px-4 py-3 font-medium">최근 출고</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const low = c.status !== "정상";
              return (
                <tr key={c.id} className="border-b border-black/[0.04] transition-colors last:border-0 hover:bg-accent/60">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold">{c.itemName}</div>
                    <div className="text-xs text-muted-foreground">{c.specification}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("text-lg font-bold tabular-nums", low ? "text-pastel-coralInk" : "text-foreground")}>
                      {formatNumber(c.currentQty)}
                    </span>
                    <span className="text-xs text-muted-foreground"> {c.unit}</span>
                    <div className="text-[11px] text-muted-foreground">안전 {c.safetyQty}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(c.unitPrice)}</td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums">{formatCurrency(c.unitPrice * c.currentQty)}</td>
                  <td className="px-4 py-3.5 text-xs">{c.location}<span className="block text-muted-foreground">{c.roomName}</span></td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDate(c.lastInboundAt)}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDate(c.lastOutboundAt)}</td>
                  <td className="px-4 py-3.5"><ConsumableStatusBadge status={c.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
