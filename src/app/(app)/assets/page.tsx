import Link from "next/link";
import { PlusCircle, Download, Boxes } from "lucide-react";
import { filterAssets } from "@/data";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AssetSearchFilters } from "@/components/assets/asset-search-filters";
import { AssetTable } from "@/components/assets/asset-table";

type SP = Record<string, string | undefined>;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const result = filterAssets({
    q: sp.q, major: sp.major, middle: sp.middle, place: sp.place, room: sp.room,
    usage: sp.usage, status: sp.status, rfid: sp.rfid as never, page, pageSize: 20,
  });
  const qs = (p: number) =>
    new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), page: String(p) }).toString();
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
            <Button asChild><Link href="/assets/new"><PlusCircle className="h-4 w-4" /> 신규 자산 등록</Link></Button>
          </>
        }
      />

      <AssetSearchFilters sp={sp} />

      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <span>총 <b className="text-foreground">{formatNumber(result.total)}</b>건</span>
        <span>합계 <b className="text-foreground">{formatCurrency(result.totalAmount)}</b></span>
      </div>

      <AssetTable assets={result.rows} />

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm"><Link href={`/assets?${qs(page - 1)}`}>이전</Link></Button>
          ) : <Button variant="outline" size="sm" disabled>이전</Button>}
          <span className="px-2 text-sm text-muted-foreground">{page} / {result.totalPages}</span>
          {page < result.totalPages ? (
            <Button asChild variant="outline" size="sm"><Link href={`/assets?${qs(page + 1)}`}>다음</Link></Button>
          ) : <Button variant="outline" size="sm" disabled>다음</Button>}
        </div>
      )}
    </div>
  );
}
