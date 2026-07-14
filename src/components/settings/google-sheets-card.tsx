"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet, Copy, Check, ExternalLink, Table2, Repeat, FlaskConical, Gift, Save, Loader2, Pencil } from "lucide-react";
import { SoftCard } from "@/components/cards/soft-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toaster";
import { updateAppSettingsAction } from "@/app/actions";

// 연동 대상 정의(코드에는 '어떤 시트가 있는지'만 두고, 실제 URL·배포 주소는 DB 설정에서 읽는다)
const SHEET_DEFS = [
  { key: "assets", settingKey: "sheet.assets.url", label: "자산 현황", icon: Table2, desc: "자산관리대장 양식" },
  { key: "loans", settingKey: "sheet.loans.url", label: "대여 현황", icon: Repeat, desc: "자산 대여 관리 대장" },
  { key: "materials", settingKey: "sheet.materials.url", label: "재료 현황", icon: FlaskConical, desc: "연구재료/소모품 재고" },
  { key: "promo", settingKey: "sheet.promo.url", label: "홍보물품 수불", icon: Gift, desc: "홍보물품 수불관리대장" },
] as const;

/**
 * 구글시트 연동 카드 — API/서비스계정 없이 IMPORTDATA 로 자동 반영.
 * 시트 URL·공개 주소는 하드코딩하지 않고 앱 설정(DB)에서 읽어오며, 여기서 바로 수정할 수 있다.
 */
export function GoogleSheetsCard({ settings, canEdit }: { settings: Record<string, string>; canEdit: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const baseUrl = (settings.publicBaseUrl ?? "").replace(/\/$/, "");

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast({ kind: "success", title: "복사되었습니다", description: "구글시트 셀(A1)에 붙여넣으세요." });
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    });
  }

  function save(fd: FormData) {
    startTransition(async () => {
      const entries: Record<string, string> = { publicBaseUrl: String(fd.get("publicBaseUrl") ?? "").trim() };
      for (const d of SHEET_DEFS) entries[d.settingKey] = String(fd.get(d.settingKey) ?? "").trim();
      const result = await updateAppSettingsAction(entries);
      if (result.ok) {
        toast({ kind: "success", title: "연동 설정 저장 완료" });
        setEditing(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "저장 실패", description: result.error });
      }
    });
  }

  const linked = SHEET_DEFS.filter((d) => settings[d.settingKey]);

  return (
    <SoftCard>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pastel-mint text-pastel-mintInk"><Sheet className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">구글시트 로우데이터 연동</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            자산·대여·재료·홍보물품 현황을 구글시트에 자동 기록합니다. <b>API 키·서비스 계정 없이</b> 구글시트의
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">IMPORTDATA</code> 함수로 연동합니다.
          </p>
        </div>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> 연동 설정</Button>
        )}
      </div>

      {/* 연동 설정 편집 (관리자) */}
      {editing && (
        <form
          onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }}
          className="mb-4 space-y-3 rounded-2xl bg-muted/50 p-4"
        >
          <Field label="플랫폼 공개 주소 (배포 URL)" required hint="IMPORTDATA 수식의 기준 주소">
            <Input name="publicBaseUrl" required defaultValue={settings.publicBaseUrl ?? ""} placeholder="https://…vercel.app" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHEET_DEFS.map((d) => (
              <Field key={d.key} label={`${d.label} 시트 URL`}>
                <Input name={d.settingKey} defaultValue={settings[d.settingKey] ?? ""} placeholder="https://docs.google.com/spreadsheets/d/…" />
              </Field>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 저장
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>취소</Button>
          </div>
        </form>
      )}

      {/* 연결된 구글시트 바로가기 */}
      <div className="mb-4 rounded-2xl bg-accent/60 p-4">
        <p className="mb-2.5 text-sm font-bold">📎 연결된 구글시트 (클릭해서 열기)</p>
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 시트가 없습니다. {canEdit ? "위 '연동 설정'에서 시트 URL을 등록하세요." : "관리자에게 문의하세요."}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linked.map((d) => (
              <a
                key={d.key}
                href={settings[d.settingKey]}
                target="_blank"
                rel="noopener noreferrer"
                className="ceramic-btn grain inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-ceramic-ink transition hover:-translate-y-0.5"
              >
                <Sheet className="h-3.5 w-3.5 text-ceramic-mintDark" /> {d.label} <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            ))}
          </div>
        )}
        <p className="mt-2.5 text-xs text-muted-foreground">
          각 시트 A1 의 IMPORTDATA 수식이 아래 CSV 주소를 주기적으로 자동 새로고침해 최신 현황을 반영합니다.
        </p>
      </div>

      <div className="space-y-2.5">
        {SHEET_DEFS.map((d) => {
          const url = `${baseUrl}/api/sheets/${d.key}`;
          const formula = `=IMPORTDATA("${url}")`;
          const Icon = d.icon;
          return (
            <div key={d.key} className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5 sm:w-44 sm:shrink-0">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-card text-pastel-mintInk shadow-soft"><Icon className="h-4 w-4" /></span>
                <div>
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-[11px] text-muted-foreground">{d.desc}</div>
                </div>
              </div>
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-card px-3 py-2 font-mono text-xs shadow-soft pastel-scroll">{formula}</code>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => copy(formula, d.key)}>
                  {copied === d.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} 수식 복사
                </Button>
                <Button asChild size="sm" variant="ghost"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        플랫폼에서 자산·대여·재료·홍보물품을 수정하면 위 CSV 가 즉시 갱신되고, 구글시트가 자동으로 가져갑니다.
        수식 주소는 설정된 <b>플랫폼 공개 주소</b>({baseUrl || "미설정"}) 기준으로 생성됩니다 — 로컬 주소가 섞일 일이 없습니다.
      </p>
    </SoftCard>
  );
}
