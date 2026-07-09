import Link from "next/link";
import { ScanLine, BadgeCheck, BadgeAlert, Tag } from "lucide-react";
import { dataset, filterAssets } from "@/data";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { SoftCard, SoftCardHeader } from "@/components/cards/soft-card";
import { AssetTable } from "@/components/assets/asset-table";
import { tagStatusTone, toneClasses } from "@/lib/status";
import { TAG_STATUSES } from "@/types";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function RfidPage() {
  const assets = dataset.assets.filter((a) => !a.deletedAt);
  const registered = assets.filter((a) => a.schoolRfidNo).length;
  const missing = assets.length - registered;
  const rate = Math.round((registered / assets.length) * 100);

  const tagKeys = [...TAG_STATUSES, "미지정"] as const;
  const tagCounts = tagKeys.map((t) => ({ name: t, count: assets.filter((a) => a.tagStatus === t).length }));
  const damaged = assets.filter((a) => a.tagStatus === "손상").length;
  const maxTag = Math.max(1, ...tagCounts.map((t) => t.count));
  const missingList = filterAssets({ rfid: "missing", pageSize: 15 });

  return (
    <div className="space-y-5">
      <PageHeader title="RFID / 태그 관리" description="RFID 등록 현황과 태그 부착 상태를 점검합니다." icon={<ScanLine className="h-6 w-6" />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="RFID 등록률" value={`${rate}%`} icon={BadgeCheck} tone="mint" />
        <StatCard label="등록 자산" value={formatNumber(registered)} icon={ScanLine} tone="sky" />
        <StatCard label="미등록 자산" value={formatNumber(missing)} icon={BadgeAlert} tone="coral" />
        <StatCard label="손상 태그" value={formatNumber(damaged)} icon={Tag} tone="apricot" />
      </div>

      <SoftCard>
        <SoftCardHeader title="태그 부착 현황" description="자산별 태그 상태 분포" />
        <div className="space-y-3">
          {tagCounts.map((t) => (
            <div key={t.name} className="text-sm">
              <div className="mb-1 flex justify-between">
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClasses[tagStatusTone[t.name as keyof typeof tagStatusTone] ?? "slate"]}`}>{t.name}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">{formatNumber(t.count)}건</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${(t.count / maxTag) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SoftCard>

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-bold">RFID 미등록 자산</h3>
          <Button asChild variant="ghost" size="sm"><Link href="/assets?rfid=missing">전체 {formatNumber(missing)}건 보기</Link></Button>
        </div>
        <AssetTable assets={missingList.rows} />
      </div>
    </div>
  );
}
