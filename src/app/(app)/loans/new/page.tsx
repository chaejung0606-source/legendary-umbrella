import { FileText } from "lucide-react";
import { getAssetById } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { LoanApplicationForm, type LoanTargetAsset } from "@/components/loans/loan-forms";

export const dynamic = "force-dynamic";

// 자산 대여 신청서 — 독립 페이지. ?asset=<id> 로 진입 시 해당 자산을 기본 선택한다.
export default async function NewLoanPage({ searchParams }: { searchParams: Promise<{ asset?: string }> }) {
  const sp = await searchParams;
  let preset: LoanTargetAsset | null = null;
  if (sp.asset) {
    const a = await getAssetById(sp.asset);
    if (a) preset = { id: a.id, itemName: a.itemName, managementNo: a.lockedManagementNo ?? a.generatedManagementNo ?? "-" };
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="자산 대여 신청서"
        description="자산 대여 관리 대장 양식에 따라 작성합니다. 여러 자산을 함께 선택할 수 있어요."
        icon={<FileText className="h-6 w-6" />}
      />
      <LoanApplicationForm preset={preset} />
    </div>
  );
}
