import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Asset } from "@/types";
import { formatCurrency } from "@/lib/format";
import { isMismatch } from "@/data";
import { AssetStatusBadge, UsageBadge, RfidStatusBadge } from "@/components/badges/status-badge";

// 카드형 자산 테이블. 행 간격 넉넉, hover 강조, 관리번호 monospace.
export function AssetTable({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) {
    return (
      <div className="rounded-card bg-card p-16 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">조건에 맞는 자산이 없어요.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
      <div className="overflow-x-auto pastel-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">관리번호</th>
              <th className="px-4 py-3 font-medium">품명 / 규격</th>
              <th className="px-4 py-3 font-medium">분류</th>
              <th className="px-4 py-3 font-medium">위치</th>
              <th className="px-4 py-3 font-medium">사용처</th>
              <th className="px-4 py-3 font-medium">RFID</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">취득단가</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="group border-b border-black/[0.04] transition-colors last:border-0 hover:bg-accent/60">
                <td className="px-4 py-3.5">
                  <Link href={`/assets/${a.id}`} className="flex items-center gap-1 font-mono text-xs font-medium text-foreground/90 hover:text-primary">
                    {a.lockedManagementNo ?? "—"}
                    {isMismatch(a) && <AlertTriangle className="h-3.5 w-3.5 text-pastel-apricotInk" />}
                  </Link>
                </td>
                <td className="max-w-[260px] px-4 py-3.5">
                  <Link href={`/assets/${a.id}`} className="block truncate font-semibold hover:text-primary">{a.itemName}</Link>
                  <span className="block truncate text-xs text-muted-foreground">{a.specification}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                  <span className="font-medium">{a.majorCategory}</span>
                  <span className="block text-muted-foreground">{a.middleCategory}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                  {a.place}<span className="block text-muted-foreground">{a.roomName}</span>
                </td>
                <td className="px-4 py-3.5">
                  <UsageBadge usage={a.usageType} />
                  {a.currentUserName && <span className="mt-0.5 block text-xs text-muted-foreground">{a.currentUserName}</span>}
                </td>
                <td className="px-4 py-3.5"><RfidStatusBadge rfid={a.schoolRfidNo} /></td>
                <td className="px-4 py-3.5"><AssetStatusBadge status={a.assetStatus} /></td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums">{formatCurrency(a.unitPrice)}</td>
                <td className="px-2 py-3.5">
                  <Link href={`/assets/${a.id}`} className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-accent">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
