"use client";
import { useEffect, useState } from "react";
import { Sheet, Copy, Check, ExternalLink, Table2, Repeat, ShoppingCart, FlaskConical } from "lucide-react";
import { SoftCard } from "@/components/cards/soft-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

const SHEETS = [
  { key: "assets", label: "자산 현황", icon: Table2, desc: "전체 자산 원장" },
  { key: "loans", label: "대여 현황", icon: Repeat, desc: "노트북·일반자산 대여" },
  { key: "materials", label: "재료 현황", icon: FlaskConical, desc: "연구재료/소모품 재고" },
] as const;

// 구글시트 연동 안내 — API/서비스계정 없이 IMPORTDATA 로 자동 반영.
export function GoogleSheetsCard() {
  const { toast } = useToast();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast({ kind: "success", title: "복사되었습니다", description: "구글시트 셀(A1)에 붙여넣으세요." });
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    });
  }

  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

  return (
    <SoftCard>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pastel-mint text-pastel-mintInk"><Sheet className="h-5 w-5" /></span>
        <div>
          <h3 className="font-semibold">구글시트 로우데이터 연동</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            자산·대여·재료 현황을 구글시트에 자동 기록합니다. <b>API 키·서비스 계정 없이</b> 구글시트의
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">IMPORTDATA</code> 함수로 연동합니다.
          </p>
        </div>
      </div>

      <ol className="mb-4 space-y-1.5 rounded-2xl bg-accent/60 p-4 text-sm">
        <li>1. 구글 드라이브에서 새 구글시트를 3개 만듭니다 (자산/대여/재료).</li>
        <li>2. 각 시트의 <b>A1 셀</b>에 아래 수식을 붙여넣습니다.</li>
        <li>3. 구글시트가 이 주소의 CSV 를 <b>주기적으로 자동 새로고침</b>(약 1시간, 열 때마다)해 최신 현황을 반영합니다.</li>
      </ol>

      <div className="space-y-2.5">
        {SHEETS.map((s) => {
          const url = `${origin}/api/sheets/${s.key}`;
          const formula = `=IMPORTDATA("${url}")`;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-3.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5 sm:w-40 sm:shrink-0">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-card text-pastel-mintInk shadow-soft"><Icon className="h-4 w-4" /></span>
                <div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                </div>
              </div>
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-card px-3 py-2 font-mono text-xs shadow-soft pastel-scroll">{formula}</code>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => copy(formula, s.key)}>
                  {copied === s.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} 수식 복사
                </Button>
                <Button asChild size="sm" variant="ghost"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="soft" size="sm"><a href="https://sheets.new" target="_blank" rel="noopener noreferrer"><ShoppingCart className="h-4 w-4" /> 새 구글시트 만들기</a></Button>
        <span className="text-xs text-muted-foreground">플랫폼에서 자산·대여·재료를 수정하면 위 CSV 가 즉시 갱신되고, 구글시트가 자동으로 가져갑니다.</span>
      </div>

      {isLocal && (
        <div className="mt-3 rounded-2xl bg-pastel-cream/60 px-4 py-3 text-xs text-pastel-creamInk">
          <b>안내</b> — 현재 주소가 <code className="font-mono">{origin || "localhost"}</code> 입니다. 구글 서버가 접근하려면 <b>외부에서 접속 가능한 공개 URL</b>(배포 주소)이어야 합니다.
          로컬 개발 주소에서는 수식은 복사되지만 구글시트가 데이터를 가져오지 못합니다. 배포 후 같은 방식으로 바로 동작합니다.
        </div>
      )}
    </SoftCard>
  );
}
