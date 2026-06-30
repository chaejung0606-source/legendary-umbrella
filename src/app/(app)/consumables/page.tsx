import { FlaskConical, Boxes, PackageMinus, AlertTriangle, Wallet, Download, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import { getConsumables, getConsumableStats } from "@/data";
import { formatNumber, formatCurrencyShort } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Button } from "@/components/ui/button";
import { ConsumableTable } from "@/components/consumables/consumable-table";

export default function ConsumablesPage() {
  const items = getConsumables();
  const stats = getConsumableStats();

  return (
    <div className="space-y-5">
      <PageHeader
        title="연구재료 / 소모품"
        description="자산 원장과 분리해 수량 기반 재고로 관리합니다."
        icon={<FlaskConical className="h-6 w-6" />}
        actions={
          <>
            <Button variant="soft" size="sm"><ArrowDownToLine className="h-4 w-4" /> 입고</Button>
            <Button variant="soft" size="sm"><ArrowUpFromLine className="h-4 w-4" /> 출고</Button>
            <Button variant="soft" size="sm"><SlidersHorizontal className="h-4 w-4" /> 재고 조정</Button>
            <Button variant="outline" size="sm"><Download className="h-4 w-4" /> 엑셀</Button>
          </>
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
