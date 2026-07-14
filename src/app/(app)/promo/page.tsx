import { Gift, Boxes, PackageMinus, AlertTriangle, Wallet } from "lucide-react";
import { cookies } from "next/headers";
import { getPromoItemsWithStock, getPromoTxns, getPromoRequests } from "@/data";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { formatNumber, formatCurrencyShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { PromoManager } from "@/components/promo/promo-manager";

export const dynamic = "force-dynamic";

export default async function PromoPage() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const isManager = !!session && ["admin", "asset_manager"].includes(session.role);

  const [items, txns, requests] = await Promise.all([
    getPromoItemsWithStock(), getPromoTxns(), getPromoRequests(),
  ]);

  const active = items.filter((i) => i.status === "사용");
  const totalStock = active.reduce((s, i) => s + i.currentQty, 0);
  const reserved = active.reduce((s, i) => s + i.reservedQty, 0);
  const alerts = active.filter((i) => i.stockState !== "정상" && (i.totalIn > 0 || i.safetyQty > 0)).length;
  const stockValue = active.reduce((s, i) => s + i.currentQty * i.unitPrice, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="홍보물품 관리"
        description="기념품·홍보물품의 입고/출고를 수불 기록으로 관리합니다. 재고는 기록의 합으로 자동 계산됩니다."
        icon={<Gift className="h-6 w-6" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="관리 품목" value={formatNumber(active.length)} sub={`전체 ${items.length}종 (중지 포함)`} icon={Boxes} tone="lavender" />
        <StatCard label="현재 총 재고" value={formatNumber(totalStock)} sub={reserved > 0 ? `예약 ${formatNumber(reserved)} 포함` : "예약 없음"} icon={PackageMinus} tone="sky" />
        <StatCard label="재고 알림 품목" value={formatNumber(alerts)} sub="품절·부족·주의" icon={AlertTriangle} tone="coral" />
        <StatCard label="재고 자산 가치" value={formatCurrencyShort(stockValue)} sub="단가 × 현재 재고" icon={Wallet} tone="mint" />
      </div>

      <PromoManager
        items={items}
        txns={txns}
        requests={requests}
        isManager={isManager}
        userName={session?.name ?? ""}
      />
    </div>
  );
}
