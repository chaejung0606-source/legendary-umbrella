import { ArrowLeftRight, Laptop, Clock, RotateCcw } from "lucide-react";
import { getLaptopLoans, getReturnDueLaptops, filterAssets } from "@/data";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { LoanManager } from "@/components/loans/loan-manager";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

// 전체 자산 대여 관리 — 현황 파악 + 신규 대여 + 반납 처리를 한 화면에서.
export default async function LoansPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const [loans, due] = await Promise.all([getLaptopLoans(), getReturnDueLaptops(7)]);
  const out = loans
    .filter((l) => l.status === "대여중" || l.status === "직원사용")
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  const returned = loans
    .filter((l) => l.returnedAt)
    .sort((a, b) => (b.returnedAt ?? "").localeCompare(a.returnedAt ?? ""))
    .slice(0, 8);

  // 신규 대여 후보: 검색어가 있을 때 대여 중이 아닌 자산
  let candidates: { id: string; itemName: string; managementNo: string; place: string; status: string }[] = [];
  if (q) {
    const res = await filterAssets({ q, pageSize: 8 });
    const outIds = new Set(out.map((l) => l.assetId));
    candidates = res.rows
      .filter((a) => !outIds.has(a.id) && a.assetStatus !== "대여중")
      .map((a) => ({
        id: a.id,
        itemName: a.itemName,
        managementNo: a.lockedManagementNo ?? a.generatedManagementNo ?? "-",
        place: [a.place, a.roomName].filter(Boolean).join(" "),
        status: a.assetStatus,
      }));
  }

  const notebookOut = out.filter((l) => l.isNotebook).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="대여 관리"
        description="전체 자산의 대여·반납 현황을 확인하고 처리합니다. (노트북 포함 모든 자산)"
        icon={<ArrowLeftRight className="h-6 w-6" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="대여/사용 중" value={formatNumber(out.length)} sub="건" icon={ArrowLeftRight} tone="lavender" />
        <StatCard label="노트북" value={formatNumber(notebookOut)} sub={`일반자산 ${formatNumber(out.length - notebookOut)}건`} icon={Laptop} tone="sky" />
        <StatCard label="반납 예정(7일)" value={formatNumber(due.length)} icon={Clock} tone="coral" />
        <StatCard label="최근 반납 완료" value={formatNumber(returned.length)} sub="최근 기록" icon={RotateCcw} tone="mint" />
      </div>

      <LoanManager out={out} returned={returned} candidates={candidates} q={q} />
    </div>
  );
}
