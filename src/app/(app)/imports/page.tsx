import { Upload } from "lucide-react";
import { getImportJob } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { ImportFlow } from "@/components/import/import-flow";

export default function ImportsPage() {
  const job = getImportJob();
  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader
        title="엑셀 가져오기"
        description="기존 자산관리대장(xlsm)을 업로드해 초기 데이터를 가져옵니다. 검증 후 관리자가 반영합니다."
        icon={<Upload className="h-6 w-6" />}
      />
      <ImportFlow job={job} />
    </div>
  );
}
