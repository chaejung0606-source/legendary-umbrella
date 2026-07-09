import { Laptop, Archive, UserCheck, ArrowLeftRight, Wrench, Clock } from "lucide-react";
import { getLaptopLoans, getLaptopStats, getReturnDueLaptops } from "@/data";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { LaptopLoanTable } from "@/components/laptops/laptop-loan-table";

export const dynamic = "force-dynamic";

export default function LaptopLoansPage() {
  const loans = getLaptopLoans();
  const stats = getLaptopStats();
  const due = getReturnDueLaptops(7);

  return (
    <div className="space-y-5">
      <PageHeader
        title="노트북 대여관리"
        description="사업단 노트북의 보관·사용·대여·반납 상태를 관리합니다."
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
