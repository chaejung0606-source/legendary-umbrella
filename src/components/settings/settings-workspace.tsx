"use client";
import { useState } from "react";
import { ShieldCheck, Database, Sheet, ScanLine } from "lucide-react";
import type { Account, AssetMajorCategory, Building } from "@/types";
import { SoftCard } from "@/components/cards/soft-card";
import { AccountsManager } from "./accounts-manager";
import { ReferenceManager } from "./reference-manager";
import { GoogleSheetsCard } from "./google-sheets-card";

type Tab = "accounts" | "reference" | "sheets" | "rfid";

const TABS: { key: Tab; label: string; icon: typeof ShieldCheck }[] = [
  { key: "accounts", label: "계정 / 권한", icon: ShieldCheck },
  { key: "reference", label: "기준정보 관리", icon: Database },
  { key: "sheets", label: "구글시트 연동", icon: Sheet },
  { key: "rfid", label: "RFID / QR 연동", icon: ScanLine },
];

export function SettingsWorkspace({
  accounts,
  categories,
  buildings,
  appSettings,
  sheetsAccessKey,
  canEditSettings,
}: {
  accounts: Account[];
  categories: AssetMajorCategory[];
  buildings: Building[];
  appSettings: Record<string, string>;
  sheetsAccessKey: string;
  canEditSettings: boolean;
}) {
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${on ? "bg-card text-brand-800 shadow-soft ring-1 ring-black/[0.04]" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
              {t.key === "rfid" && <span className="rounded-full bg-pastel-cream px-1.5 py-0.5 text-[10px] font-bold text-pastel-creamInk">준비 중</span>}
            </button>
          );
        })}
      </div>

      {tab === "accounts" && (
        <SoftCard>
          <h3 className="mb-3 text-base font-bold">계정 / 권한</h3>
          <AccountsManager accounts={accounts} />
        </SoftCard>
      )}

      {tab === "reference" && (
        <SoftCard>
          <h3 className="mb-3 text-base font-bold">기준정보 관리</h3>
          <ReferenceManager categories={categories} buildings={buildings} />
        </SoftCard>
      )}

      {tab === "sheets" && <GoogleSheetsCard settings={appSettings} accessKey={sheetsAccessKey} canEdit={canEditSettings} />}

      {tab === "rfid" && (
        <SoftCard>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-base font-bold">RFID / QR 연동</h3>
            <span className="rounded-full bg-pastel-cream px-2 py-0.5 text-xs font-bold text-pastel-creamInk">준비 중</span>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>이 기능은 아직 사용할 수 없습니다. 아래 요건이 갖춰져야 구현할 수 있어요.</p>
            <ul className="space-y-2">
              <li className="rounded-xl bg-pastel-cream/60 px-3 py-2 text-pastel-creamInk"><b>RFID 스캔 입출고</b> — 학교 RFID 리더기 연동 규격(장비·API)이 확정되어야 합니다.</li>
              <li className="rounded-xl bg-pastel-cream/60 px-3 py-2 text-pastel-creamInk"><b>QR 라벨 출력</b> — 라벨 프린터 규격과 관리번호 표기 정책 확정이 필요합니다.</li>
              <li className="rounded-xl bg-pastel-cream/60 px-3 py-2 text-pastel-creamInk"><b>모바일 재물조사</b> — 운영 DB(PostgreSQL) 전환과 로그인(SSO) 연동이 선행되어야 합니다.</li>
            </ul>
            <p>현재는 RFID/태그 관리 메뉴에서 등록 현황 점검과 미등록 목록 확인을 지원합니다.</p>
          </div>
        </SoftCard>
      )}
    </div>
  );
}
