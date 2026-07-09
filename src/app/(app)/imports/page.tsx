import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ImportFlow } from "@/components/import/import-flow";

export default function ImportsPage() {
  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader
        title="엑셀 가져오기"
        description="기존 자산관리대장(xlsm)을 업로드하면 브라우저에서 파싱·검증한 뒤 원장에 반영합니다."
        icon={<Upload className="h-6 w-6" />}
      />
      <ImportFlow />
    </div>
  );
}
