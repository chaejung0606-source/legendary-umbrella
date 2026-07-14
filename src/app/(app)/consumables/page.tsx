import { cookies } from "next/headers";
import { FlaskConical, Boxes, PackageMinus, AlertTriangle, Wallet } from "lucide-react";
import { getConsumables, getConsumableStats } from "@/data";
import { formatNumber, formatCurrencyShort } from "@/lib/format";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { ConsumableTable } from "@/components/consumables/consumable-table";
import { ConsumableActions } from "@/components/consumables/consumable-actions";

export const dynamic = "force-dynamic";

export default async function ConsumablesPage() {
  const [items, stats] = await Promise.all([getConsumables(), getConsumableStats()]);
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const isManager = !!session && ["admin", "asset_manager"].includes(session.role);

  return (
    <div className="space-y-5">
      <PageHeader
        title="연구재료 / 소모품"
        description="자산 원장과 분리해 수량 기반 재고로 관리합니다."
        icon={<FlaskConical className="h-6 w-6" />}
        actions={
          <ConsumableActions isManager={isManager} items={items.map((i) => ({ id: i.id, itemName: i.itemName, currentQty: i.currentQty, unit: i.unit }))} />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="전체 품목 수" value={formatNumber(stats.itemCount)} sub="종" icon={Boxes} tone="lavender" />
        <StatCard label="총 재고 수량" value={formatNumber(stats.totalQty)} icon={PackageMinus} tone="sky" />
        <StatCard label="부족 재고 품목" value={formatNumber(stats.lowStock)} sub="안전재고 미만" icon={AlertTriangle} tone="coral" />
        <StatCard label="재고 자산 가치" value={formatCurrencyShort(stats.totalValue)} icon={Wallet} tone="mint" />
      </div>

      <ConsumableTable items={items} />
    </div>
  );
}
