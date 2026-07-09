import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AssetForm } from "@/components/assets/asset-form";
import { getCategories, getBuildings } from "@/data";

export const dynamic = "force-dynamic";

export default function NewAssetPage() {
  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="자산 등록"
        description="개별 자산을 등록합니다. 취득일·분류코드·번호·건축물코드로 관리번호가 자동 생성됩니다."
        icon={<PlusCircle className="h-6 w-6" />}
      />
      <AssetForm mode="create" categories={getCategories()} buildings={getBuildings()} />
    </div>
  );
}
