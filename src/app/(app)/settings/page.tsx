import { Settings } from "lucide-react";
import { getAccounts, getCategories, getBuildings } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="설정" description="계정·권한, 기준정보, 구글시트 연동을 관리합니다." icon={<Settings className="h-6 w-6" />} />
      <SettingsWorkspace accounts={getAccounts()} categories={getCategories()} buildings={getBuildings()} />
    </div>
  );
}
