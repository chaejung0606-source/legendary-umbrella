import { Settings } from "lucide-react";
import { getAccounts, getCategories, getBuildings } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [accountsRaw, categories, buildings] = await Promise.all([getAccounts(), getCategories(), getBuildings()]);
  // 비밀번호는 클라이언트로 내려보내지 않는다.
  const accounts = accountsRaw.map((a) => ({ ...a, password: "" }));
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="설정" description="계정·권한, 기준정보, 구글시트 연동을 관리합니다." icon={<Settings className="h-6 w-6" />} />
      <SettingsWorkspace accounts={accounts} categories={categories} buildings={buildings} />
    </div>
  );
}
