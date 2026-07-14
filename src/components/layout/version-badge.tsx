"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CHANGELOG, APP_VERSION, APP_VERSION_DATE, type ChangeTag } from "@/data/changelog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/badges/status-badge";

const TAG_TONE: Record<ChangeTag, "mint" | "sky" | "coral" | "lavender" | "slate"> = {
  신규: "mint", 개선: "sky", 수정: "coral", 디자인: "lavender", 문서: "slate",
};

/**
 * 사이드바 하단 버전 배지 — 클릭하면 업데이트 정보(전체 변경 이력) 모달.
 * 모달은 Radix Dialog 기반이라 ESC·바깥 클릭 닫기, 스크롤 잠금, 포커스 관리가 기본 제공된다.
 */
export function VersionBadge() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mx-3 mb-3 flex items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-[11px] text-muted-foreground/80 transition hover:bg-muted hover:text-foreground"
        aria-label="업데이트 정보 보기"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-700" />
        <span>
          <span className="font-semibold">v{APP_VERSION}</span>
          <span className="ml-1.5 opacity-70">{APP_VERSION_DATE}</span>
          <span className="block text-[10px] opacity-60">업데이트 정보 보기</span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-700" /> 업데이트 정보
            </DialogTitle>
            <DialogDescription>현재 버전 v{APP_VERSION} · {APP_VERSION_DATE} — 전체 변경 이력입니다.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-5 overflow-y-auto pastel-scroll pr-1">
            {CHANGELOG.map((entry, idx) => (
              <section key={entry.version} className="rounded-2xl bg-muted/50 p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold">v{entry.version}</span>
                  {idx === 0 && <StatusBadge label="현재 버전" tone="mint" dot={false} />}
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-foreground/90">{entry.title}</p>
                <ul className="mt-2 space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                      <StatusBadge label={item.tag} tone={TAG_TONE[item.tag]} dot={false} className="mt-[1px] shrink-0 px-2 py-0.5 text-[10px]" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
