import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Info, Coins, MapPin, ScanLine, History } from "lucide-react";
import { getAssetById, isMismatch, getLoanForAsset, isAssetOnLoan } from "@/data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AssetActions } from "@/components/assets/asset-actions";
import { AssetDetailCard } from "@/components/assets/asset-detail-card";
import { AssetStatusBadge, UsageBadge, TagStatusBadge, RfidStatusBadge } from "@/components/badges/status-badge";
import { StatusBadge } from "@/components/badges/status-badge";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) notFound();
  const loan = getLoanForAsset(asset.id);
  const isNotebook = !!loan?.isNotebook;
  const onLoan = isAssetOnLoan(asset);

  const history = [
    { action: "등록", summary: `자산 최초 등록 (${asset.lockedManagementNo})`, at: asset.createdAt, tone: "lavender" as const },
    ...(isMismatch(asset) ? [{ action: "검증", summary: "관리번호 보존/계산 불일치 경고", at: asset.updatedAt, tone: "apricot" as const }] : []),
    ...(loan && loan.userName ? [{ action: "대여", summary: `${loan.userName} 대여/사용 처리`, at: loan.loanedAt ?? asset.updatedAt, tone: "sky" as const }] : []),
  ];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/assets"><ArrowLeft className="h-4 w-4" /> 자산 목록</Link></Button>

      {/* 헤더 */}
      <div className="rounded-card bg-card p-6 shadow-soft ring-1 ring-black/[0.03]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{asset.itemName}</h1>
              <AssetStatusBadge status={asset.assetStatus} />
              <UsageBadge usage={asset.usageType} />
              {isNotebook && <StatusBadge label="노트북" tone="purple" dot={false} />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{asset.specification}</p>
            <p className="mt-2 font-mono text-sm font-medium text-foreground/80">{asset.lockedManagementNo}</p>
          </div>
          <AssetActions assetId={asset.id} itemName={asset.itemName} onLoan={onLoan} />
        </div>

        {isMismatch(asset) && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-pastel-apricot/50 px-4 py-3 text-sm text-pastel-apricotInk">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <b>관리번호 불일치</b> — 보존값과 계산값이 다릅니다.
              <div className="mt-1 font-mono text-xs">보존: {asset.lockedManagementNo} · 계산: {asset.generatedManagementNo}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AssetDetailCard
          title="기본 정보" icon={<Info className="h-4 w-4" />}
          rows={[
            { label: "대분류", value: asset.majorCategory },
            { label: "중분류", value: asset.middleCategory },
            { label: "분류코드", value: asset.classificationCode },
            { label: "품명", value: asset.itemName, strong: true },
            { label: "규격", value: asset.specification, full: true },
          ]}
        />
        <AssetDetailCard
          title="취득 정보" icon={<Coins className="h-4 w-4" />}
          rows={[
            { label: "취득일", value: formatDate(asset.acquiredDate) },
            { label: "취득단가", value: formatCurrency(asset.unitPrice), strong: true },
            { label: "연번", value: asset.legacyRowNo },
            { label: "지출문서", value: asset.expenditureDocument, full: true },
            { label: "관리기관", value: asset.managingOrganization },
          ]}
        />
        <AssetDetailCard
          title="위치 / 사용 정보" icon={<MapPin className="h-4 w-4" />}
          rows={[
            { label: "장소", value: asset.place },
            { label: "호실", value: asset.roomName },
            { label: "건축물코드", value: asset.buildingCode, mono: true },
            { label: "사용자", value: asset.currentUserName ?? "-" },
            { label: "사용처 비고", value: asset.currentLocationNote ?? "-" },
            { label: "사용 유형", value: <UsageBadge usage={asset.usageType} /> },
          ]}
        />
        <AssetDetailCard title="RFID / 태그 정보" icon={<ScanLine className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-3">
              <div className="text-xs text-muted-foreground">RFID 번호</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{asset.schoolRfidNo ?? "미등록"}</span>
                <RfidStatusBadge rfid={asset.schoolRfidNo} />
              </div>
            </div>
            <div><div className="text-xs text-muted-foreground">태그 상태</div><div className="mt-1"><TagStatusBadge status={asset.tagStatus} /></div></div>
            <div><div className="text-xs text-muted-foreground">관리번호(계산)</div><div className="mt-1 font-mono text-xs">{asset.generatedManagementNo}</div></div>
            <div><div className="text-xs text-muted-foreground">관리번호(보존)</div><div className="mt-1 font-mono text-xs">{asset.lockedManagementNo}</div></div>
          </div>
        </AssetDetailCard>
      </div>

      {/* 이력 */}
      <AssetDetailCard title="변경 이력" icon={<History className="h-4 w-4" />}>
        <ol className="space-y-3">
          {history.map((h, i) => (
            <li key={i} className="flex items-start gap-3">
              <StatusBadge label={h.action} tone={h.tone} dot={false} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{h.summary}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(h.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </AssetDetailCard>
    </div>
  );
}
