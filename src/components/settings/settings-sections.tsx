"use client";
import { useState } from "react";
import { UserCog, Database, ShieldCheck, ScanLine, ChevronRight, CheckCircle2, Minus } from "lucide-react";
import { SoftCard } from "@/components/cards/soft-card";
import { StatusBadge } from "@/components/badges/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { ROLES, CAPABILITIES, ROLE_LIST, type Capability } from "@/lib/constants";
import { MAJOR_CATEGORIES, BUILDINGS } from "@/data/categories";

type SectionKey = "profile" | "roles" | "reference" | "rfid";

const SECTIONS: { key: SectionKey; icon: typeof UserCog; title: string; desc: string; toneClass: string; ready: boolean }[] = [
  { key: "profile", icon: UserCog, title: "계정 / 프로필", desc: "이름, 이메일, 비밀번호 변경", toneClass: "bg-pastel-lavender text-pastel-lavenderInk", ready: true },
  { key: "roles", icon: ShieldCheck, title: "권한 관리", desc: "관리자 · 자산담당자 · 일반사용자 · 감사 역할", toneClass: "bg-pastel-sky text-pastel-skyInk", ready: true },
  { key: "reference", icon: Database, title: "기준정보 관리", desc: "자산분류 코드 · 건축물 코드 · 사용 유형", toneClass: "bg-pastel-mint text-pastel-mintInk", ready: true },
  { key: "rfid", icon: ScanLine, title: "RFID / QR 연동", desc: "RFID 스캔, QR 라벨 출력, 모바일 재물조사", toneClass: "bg-pastel-apricot text-pastel-apricotInk", ready: false },
];

const CAPABILITY_LABELS: Partial<Record<Capability, string>> = {
  view: "화면 조회",
  viewReports: "리포트 조회",
  assetCreate: "자산 등록",
  assetEdit: "자산 수정",
  assetDelete: "자산 삭제",
  assetMove: "자산 이동",
  editSensitive: "민감정보 수정",
  loanManage: "대여/반납 처리",
  tagManage: "태그 관리",
  materialManage: "소모품 관리",
  seatManage: "좌석 관리",
  importData: "가져오기",
  exportData: "내보내기",
  manageUsers: "사용자 관리",
};

export function SettingsSections() {
  const { toast } = useToast();
  const [open, setOpen] = useState<SectionKey | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={() => setOpen(s.key)} className="text-left">
              <SoftCard hover className="h-full cursor-pointer">
                <div className="flex items-start justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl ${s.toneClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {s.ready ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <StatusBadge label="준비 중" tone="cream" dot={false} />}
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
              </SoftCard>
            </button>
          );
        })}
      </div>

      {/* 계정 / 프로필 */}
      <Dialog open={open === "profile"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계정 / 프로필</DialogTitle>
            <DialogDescription>현재 세션 계정 정보입니다.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast({
                kind: "warning",
                title: "프로필 저장은 아직 지원되지 않습니다",
                description:
                  "현재는 DB(로그인)가 연동되지 않은 데모 단계라 계정 정보를 저장할 곳이 없습니다. Prisma/SQLite 연동(README의 db:push·db:seed) 후 시드 관리자 계정 기반으로 지원될 예정입니다.",
              });
              setOpen(null);
            }}
            className="space-y-3"
          >
            <Field label="이름"><Input name="name" defaultValue="자산관리 담당자" /></Field>
            <Field label="이메일"><Input name="email" type="email" defaultValue="manager@sadan.local" /></Field>
            <Field label="새 비밀번호"><Input name="password" type="password" placeholder="8자 이상" /></Field>
            <DialogFooter><Button type="submit">저장</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 권한 관리 — 실제 권한 매트릭스(lib/constants) 표시 */}
      <Dialog open={open === "roles"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>권한 관리</DialogTitle>
            <DialogDescription>역할별 기능 권한 매트릭스입니다. 역할 배정은 로그인(DB) 연동 후 지원됩니다.</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto pastel-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">기능</th>
                  {ROLE_LIST.map((r) => <th key={r} className="px-2 py-2 text-center font-medium">{ROLES[r]}</th>)}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(CAPABILITY_LABELS) as Capability[]).map((cap) => (
                  <tr key={cap} className="border-b border-black/[0.04] last:border-0">
                    <td className="px-2 py-2">{CAPABILITY_LABELS[cap]}</td>
                    {ROLE_LIST.map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        {(CAPABILITIES[cap] as readonly string[]).includes(r)
                          ? <CheckCircle2 className="mx-auto h-4 w-4 text-pastel-mintInk" />
                          : <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 기준정보 관리 — 실제 기준정보 표시 */}
      <Dialog open={open === "reference"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>기준정보 관리</DialogTitle>
            <DialogDescription>플랫폼이 사용 중인 자산분류·건축물 기준정보입니다. 편집은 DB 연동 후 지원됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-bold">자산분류 코드</h4>
              <ul className="space-y-1.5 text-sm">
                {MAJOR_CATEGORIES.map((m) => (
                  <li key={m.id} className="rounded-xl bg-muted/60 px-3 py-2">
                    <b>{m.code}. {m.name}</b>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {m.middles.map((mid) => `${mid.name}(${mid.code})`).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold">건축물 코드 ({BUILDINGS.length})</h4>
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {BUILDINGS.map((b) => (
                  <li key={b.id} className="rounded-xl bg-muted/60 px-3 py-2">
                    <span className="font-mono text-xs">{b.code}</span>
                    <span className="ml-2">{b.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RFID / QR 연동 — 준비 중 사유 안내 */}
      <Dialog open={open === "rfid"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>RFID / QR 연동 (준비 중)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>이 기능은 아직 사용할 수 없습니다. 아래 요건이 갖춰져야 구현할 수 있어요.</p>
            <ul className="space-y-2">
              <li className="rounded-xl bg-pastel-cream/60 px-3 py-2 text-pastel-creamInk">
                <b>RFID 스캔 입출고</b> — 학교 RFID 리더기 연동 규격(장비·API)이 확정되어야 합니다.
              </li>
              <li className="rounded-xl bg-pastel-cream/60 px-3 py-2 text-pastel-creamInk">
                <b>QR 라벨 출력</b> — 라벨 프린터 규격과 관리번호 표기 정책 확정이 필요합니다.
              </li>
              <li className="rounded-xl bg-pastel-cream/60 px-3 py-2 text-pastel-creamInk">
                <b>모바일 재물조사</b> — 운영 DB(PostgreSQL) 전환과 로그인(SSO) 연동이 선행되어야 합니다.
              </li>
            </ul>
            <p>현재는 RFID/태그 관리 메뉴에서 등록 현황 점검과 미등록 목록 확인을 지원합니다.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
