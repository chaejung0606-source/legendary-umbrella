import { Settings } from "lucide-react";
import { cookies } from "next/headers";
import { getAccounts, getCategories, getBuildings, getAppSettings } from "@/data";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const dynamic = "force-dynamic";

const TABS = ["accounts", "reference", "sheets", "rfid"] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { tab } = await searchParams;
  // 자산 원장의 '구글시트 연결' 버튼처럼 /settings?tab=sheets 로 들어오면 해당 탭을 바로 연다
  const initialTab = TABS.find((t) => t === tab) ?? "accounts";
  const [accountsRaw, categories, buildings, appSettings] = await Promise.all([
    getAccounts(), getCategories(), getBuildings(), getAppSettings(),
  ]);
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const canEditSettings = !!session && ["admin", "asset_manager"].includes(session.role);
  // 비밀번호는 클라이언트로 내려보내지 않는다.
  const accounts = accountsRaw.map((a) => ({ ...a, password: "" }));
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="설정" description="계정·권한, 기준정보, 구글시트 연동을 관리합니다." icon={<Settings className="h-6 w-6" />} />
      <SettingsWorkspace
        accounts={accounts}
        categories={categories}
        buildings={buildings}
        appSettings={appSettings}
        sheetsAccessKey={process.env.SHEETS_ACCESS_KEY ?? ""}
        canEditSettings={canEditSettings}
        initialTab={initialTab}
      />
    </div>
  );
}
