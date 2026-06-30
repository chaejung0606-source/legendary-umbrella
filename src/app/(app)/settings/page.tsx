import { Settings, UserCog, Database, ShieldCheck, ScanLine, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SoftCard } from "@/components/cards/soft-card";
import { StatusBadge } from "@/components/badges/status-badge";

const SECTIONS = [
  { icon: UserCog, title: "계정 / 프로필", desc: "이름, 이메일, 비밀번호 변경", tone: "lavender" as const, ready: true },
  { icon: ShieldCheck, title: "권한 관리", desc: "관리자 · 자산담당자 · 일반사용자 · 감사 역할", tone: "sky" as const, ready: true },
  { icon: Database, title: "기준정보 관리", desc: "자산분류 코드 · 건축물 코드 · 사용 유형", tone: "mint" as const, ready: true },
  { icon: ScanLine, title: "RFID / QR 연동", desc: "RFID 스캔, QR 라벨 출력, 모바일 재물조사", tone: "apricot" as const, ready: false },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="설정" description="플랫폼 환경설정과 기준정보를 관리합니다." icon={<Settings className="h-6 w-6" />} />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <SoftCard key={s.title} hover className="cursor-pointer">
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${{
                  lavender: "bg-pastel-lavender text-pastel-lavenderInk",
                  sky: "bg-pastel-sky text-pastel-skyInk",
                  mint: "bg-pastel-mint text-pastel-mintInk",
                  apricot: "bg-pastel-apricot text-pastel-apricotInk",
                }[s.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {s.ready ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <StatusBadge label="준비 중" tone="cream" dot={false} />}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
            </SoftCard>
          );
        })}
      </div>

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
