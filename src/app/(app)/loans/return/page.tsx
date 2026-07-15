import { FileText } from "lucide-react";
import { getLaptopLoans } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { ReturnApplicationForm, type ReturnTargetLoan } from "@/components/loans/loan-forms";

export const dynamic = "force-dynamic";

// 자산 반납 신청서 — 독립 페이지. ?asset=<id> 로 진입 시 해당 대여건을 기본 선택한다.
export default async function ReturnLoanPage({ searchParams }: { searchParams: Promise<{ asset?: string }> }) {
  const sp = await searchParams;
  const loans = await getLaptopLoans();
  const outLoans: ReturnTargetLoan[] = loans
    .filter((l) => l.status === "대여중" || l.status === "직원사용")
    .map((l) => ({ assetId: l.assetId, itemName: l.itemName, managementNo: l.managementNo, userName: l.userName }));
  const preset = sp.asset ? outLoans.find((l) => l.assetId === sp.asset) ?? null : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="자산 반납 신청서"
        description="자산 대여 관리 대장 양식에 따라 작성합니다. 현재 대여 중인 자산을 선택해 반납 처리합니다."
        icon={<FileText className="h-6 w-6" />}
      />
      <ReturnApplicationForm preset={preset} outLoans={outLoans} />
    </div>
  );
}
