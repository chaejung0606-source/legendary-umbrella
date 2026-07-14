import { Download, Boxes } from "lucide-react";
import { filterAssets } from "@/data";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AssetSearchFilters } from "@/components/assets/asset-search-filters";
import { AssetTable } from "@/components/assets/asset-table";
import { AssetRegisterActions } from "@/components/assets/asset-bulk-upload";

type SP = Record<string, string | undefined>;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const result = await filterAssets({
    q: sp.q, major: sp.major, middle: sp.middle, place: sp.place, room: sp.room,
    usage: sp.usage, status: sp.status, rfid: sp.rfid as never, page, pageSize: 20,
  });
  const exportQs = new URLSearchParams(Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][])).toString();

  return (
    <div className="space-y-5">
      <PageHeader
        title="자산 원장"
        description="사업단 전체 자산을 검색하고 관리합니다."
        icon={<Boxes className="h-6 w-6" />}
        actions={
          <>
            <Button asChild variant="outline" size="default">
              <a href={`/api/export/assets${exportQs ? `?${exportQs}` : ""}`} download><Download className="h-4 w-4" /> 엑셀 다운로드</a>
            </Button>
            <AssetRegisterActions />
          </>
        }
      />

      <AssetSearchFilters sp={sp} />

      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <span>총 <b className="text-foreground">{formatNumber(result.total)}</b>건</span>
        <span>합계 <b className="text-foreground">{formatCurrency(result.totalAmount)}</b></span>
      </div>

      <AssetTable assets={result.rows} />

      <Pagination page={page} totalPages={result.totalPages} />
    </div>
  );
}
