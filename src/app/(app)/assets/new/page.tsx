import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AssetForm } from "@/components/assets/asset-form";
import { getCategories, getBuildings } from "@/data";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  // 자산 등록은 관리자 전용. 신청자는 자산 원장으로 돌려보낸다.
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session || !["admin", "asset_manager"].includes(session.role)) redirect("/assets");
  const [categories, buildings] = await Promise.all([getCategories(), getBuildings()]);
  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="자산 등록"
        description="개별 자산을 등록합니다. 취득일·분류코드·번호·건축물코드로 관리번호가 자동 생성됩니다."
        icon={<PlusCircle className="h-6 w-6" />}
      />
      <AssetForm mode="create" categories={categories} buildings={buildings} />
    </div>
  );
}
