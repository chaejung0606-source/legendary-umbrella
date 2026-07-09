import { Laptop, Archive, UserCheck, ArrowLeftRight, Wrench, Clock } from "lucide-react";
import { getLaptopLoans, getReturnDueLaptops } from "@/data";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { LaptopLoanTable } from "@/components/laptops/laptop-loan-table";

export const dynamic = "force-dynamic";

export default function LaptopLoansPage() {
  // 노트북 대여현황 전용 화면 — 노트북으로 지정된 자산만 모아 현황을 바로 파악한다.
  // (전체 자산 대여/반납 처리는 자산 상세의 '대여 처리'에서 수행)
  const loans = getLaptopLoans().filter((l) => l.isNotebook);
  const by = (s: string) => loans.filter((l) => l.status === s).length;
  const stats = {
    total: loans.length,
    stored: by("보관"),
    staff: by("직원사용"),
    loaned: by("대여중"),
    repair: by("수리") + by("분실") + by("폐기"),
  };
  const due = getReturnDueLaptops(7).filter((l) => l.isNotebook);

  return (
    <div className="space-y-5">
      <PageHeader
        title="노트북 대여현황"
        description="사업단 노트북의 보관·사용·대여·반납 현황을 한눈에 파악합니다."
        icon={<Laptop className="h-6 w-6" />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="전체 노트북" value={formatNumber(stats.total)} sub="대" icon={Laptop} tone="lavender" />
        <StatCard label="보관 중" value={formatNumber(stats.stored)} icon={Archive} tone="mint" />
        <StatCard label="직원 사용" value={formatNumber(stats.staff)} icon={UserCheck} tone="sky" />
        <StatCard label="대여 중" value={formatNumber(stats.loaned)} icon={ArrowLeftRight} tone="apricot" />
        <StatCard label="수리/점검" value={formatNumber(stats.repair)} icon={Wrench} tone="cream" />
        <StatCard label="반납 예정(7일)" value={formatNumber(due.length)} icon={Clock} tone="coral" />
      </div>

      <LaptopLoanTable loans={loans} />
    </div>
  );
}
