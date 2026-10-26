import { cookies } from "next/headers";
import { Download, Boxes } from "lucide-react";
import { filterAssets, getAppSettings } from "@/data";
import { verifySession, SESSION_COOKIE, normalizePerms } from "@/lib/session";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AssetSearchFilters } from "@/components/assets/asset-search-filters";
import { AssetTable } from "@/components/assets/asset-table";
import { AssetRegisterActions } from "@/components/assets/asset-bulk-upload";
import { AssetSheetLink } from "@/components/assets/asset-sheet-link";

type SP = Record<string, string | undefined>;

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const [result, settings] = await Promise.all([
    filterAssets({
      q: sp.q, major: sp.major, middle: sp.middle, place: sp.place, room: sp.room,
      usage: sp.usage, status: sp.status, rfid: sp.rfid as never, page, pageSize: 20,
    }),
    getAppSettings(),
  ]);
  const exportQs = new URLSearchParams(Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][])).toString();
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const isManager = !!session && ["admin", "asset_manager"].includes(session.role);
  // 시트 주소를 등록할 수 있는 사람(설정 메뉴 권한 + 설정 편집 역할)에게만 설정 화면 바로가기를 보여준다
  const canConfigureSheet = isManager && normalizePerms(session?.perms).includes("settings");

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
            <AssetSheetLink url={settings["sheet.assets.url"]} canConfigure={canConfigureSheet} />
            <AssetRegisterActions isManager={isManager} />
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
