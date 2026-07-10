import { Armchair, Users, CircleSlash, AlertTriangle } from "lucide-react";
import { getSeats } from "@/data";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { SeatGrid } from "@/components/seats/seat-grid";

export const dynamic = "force-dynamic";

export default async function SeatsPage() {
  const seats = await getSeats();
  const assigned = seats.filter((s) => s.occupantName).length;
  const reviewCount = seats.reduce((n, s) => n + s.assets.filter((a) => a.needsReview).length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="좌석 / 배치 현황"
        description="사무실 좌석 A~O 별 사용자와 배정 자산(데스크톱·모니터·프린터·전화기)을 관리합니다."
        icon={<Armchair className="h-6 w-6" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="전체 좌석" value={formatNumber(seats.length)} sub="A ~ O" icon={Armchair} tone="lavender" />
        <StatCard label="배정 좌석" value={formatNumber(assigned)} icon={Users} tone="mint" />
        <StatCard label="미배정 좌석" value={formatNumber(seats.length - assigned)} icon={CircleSlash} tone="sky" />
        <StatCard label="검토 필요 항목" value={formatNumber(reviewCount)} sub="붙은 번호 등" icon={AlertTriangle} tone="apricot" />
      </div>

      <SeatGrid seats={seats} />
    </div>
  );
}
