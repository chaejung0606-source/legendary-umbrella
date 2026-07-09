import { BarChart3, Download } from "lucide-react";
import { getMonthlyAcquisition, getCategoryRatio, getDashboardStats } from "@/data";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/cards/chart-card";
import { SoftCard, SoftCardHeader } from "@/components/cards/soft-card";
import { MonthlyAssetChart } from "@/components/charts/monthly-asset-chart";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const monthly = getMonthlyAcquisition();
  const categories = getCategoryRatio();
  const stats = getDashboardStats();
  const totalAmount = categories.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="통계 / 리포트"
        description="자산 취득·구성 통계를 확인하고 리포트를 내보냅니다."
        icon={<BarChart3 className="h-6 w-6" />}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/export/report" download><Download className="h-4 w-4" /> 리포트 내보내기</a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="월별 자산 취득 현황" description="최근 12개월"><MonthlyAssetChart data={monthly} /></ChartCard>
        <ChartCard className="lg:col-span-2" title="대분류별 자산 비율"><CategoryDonutChart data={categories} /></ChartCard>
      </div>

      <SoftCard>
        <SoftCardHeader title="대분류별 취득 현황" description={`총 ${formatNumber(stats.totalAssets)}건 · ${formatCurrency(stats.totalAcquisition)}`} />
        <div className="overflow-x-auto pastel-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">대분류</th>
                <th className="px-3 py-2.5 text-right font-medium">자산 수</th>
                <th className="px-3 py-2.5 text-right font-medium">취득금액</th>
                <th className="px-3 py-2.5 text-right font-medium">비중</th>
                <th className="px-3 py-2.5 font-medium">구성</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.name} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-3 py-3 font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: c.color }} />{c.name}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatNumber(c.count)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(c.amount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{Math.round((c.amount / totalAmount) * 100)}%</td>
                  <td className="px-3 py-3">
                    <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(c.amount / totalAmount) * 100}%`, background: c.color }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SoftCard>
    </div>
  );
}
