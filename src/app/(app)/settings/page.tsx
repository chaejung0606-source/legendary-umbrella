import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SoftCard } from "@/components/cards/soft-card";
import { SettingsSections } from "@/components/settings/settings-sections";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="설정" description="플랫폼 환경설정과 기준정보를 관리합니다." icon={<Settings className="h-6 w-6" />} />

      <SettingsSections />

      <SoftCard>
        <h3 className="text-sm font-bold">확장 로드맵</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· RFID 스캔 기반 입출고 / 재물조사</li>
          <li>· QR 라벨 자동 출력</li>
          <li>· 모바일 재물조사 앱 연동</li>
          <li>· SSO(학교 통합 로그인) 연동</li>
        </ul>
      </SoftCard>
    </div>
  );
}
