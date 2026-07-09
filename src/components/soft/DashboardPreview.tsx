"use client";
import { FileText, Clock, CheckCircle2, CalendarClock, Bell, TrendingUp } from "lucide-react";
import { SoftCard } from "./SoftCard";
import { StatCard } from "./StatCard";
import { MiniProgress } from "./MiniProgress";
import { SoftToggle } from "./SoftToggle";
import { SoftButton } from "./SoftButton";

// 참고 이미지 분위기의 미니 대시보드 프리뷰 — 곡선 배경 + 무광 세라믹 카드 조합.
const STATS = [
  { label: "오늘의 신청", value: "38", description: "전일 대비 +6", icon: FileText, accent: "mint" as const },
  { label: "처리 대기", value: "12", description: "평균 1.4일 소요", icon: Clock, accent: "sky" as const },
  { label: "승인 완료", value: "204", description: "이번 달 누적", icon: CheckCircle2, accent: "sage" as const },
  { label: "반납 예정", value: "7", description: "7일 이내", icon: CalendarClock, accent: "pink" as const },
];

const PROGRESS = [
  { label: "신청 처리율", value: 82, color: "mint" as const },
  { label: "자산 가동률", value: 64, color: "sky" as const },
  { label: "재고 충족률", value: 91, color: "sage" as const },
];

// 작은 선형 차트 느낌의 막대 (더미)
const SPARK = [40, 55, 48, 70, 62, 84, 76];

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative">
      {/* 곡선형 배경 레이어 */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-[46%_54%_60%_40%/50%_46%_54%_50%] ceramic-mint grain opacity-70 blur-[1px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-[54%_46%_40%_60%/46%_54%_46%_54%] ceramic-sky grain opacity-70 blur-[1px]" aria-hidden />

      <SoftCard large className="relative" padded={false}>
        <div className="p-5 sm:p-6">
          {/* 헤더 */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-ceramic-sub">사업단 관리 대시보드</div>
              <div className="text-base font-bold text-ceramic-ink">오늘의 현황</div>
            </div>
            <SoftToggle defaultOn label="실시간" />
          </div>

          {/* 통계 카드 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.slice(0, compact ? 2 : 4).map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* 진행률 + 스파크라인 */}
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            <SoftCard className="sm:col-span-3 space-y-3">
              {PROGRESS.map((p) => (
                <MiniProgress key={p.label} {...p} />
              ))}
            </SoftCard>
            <SoftCard className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ceramic-sub">주간 신청 추이</span>
                <TrendingUp className="h-4 w-4 text-ceramic-sage" />
              </div>
              <div className="flex h-[70px] items-end gap-1.5">
                {SPARK.map((v, i) => (
                  <div key={i} className="flex-1 rounded-full ceramic-inset" style={{ height: `${v}%` }}>
                    <div
                      className="h-full w-full rounded-full"
                      style={{ background: "linear-gradient(180deg, #AFCFC1, #8FB9A8)", opacity: 0.5 + (i / SPARK.length) * 0.5 }}
                    />
                  </div>
                ))}
              </div>
            </SoftCard>
          </div>

          {/* 알림 카드 + 액션 */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SoftCard variant="surface2" className="flex flex-1 items-center gap-3" padded={false}>
              <div className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ceramic-pink grain">
                  <Bell className="h-4.5 w-4.5 text-rose-900/60" style={{ width: 18, height: 18 }} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ceramic-ink">반납 예정 3건</div>
                  <div className="truncate text-xs text-ceramic-sub">노트북 2 · 계측기 1 — 오늘 마감</div>
                </div>
              </div>
            </SoftCard>
            <SoftButton variant="primary" className="w-full sm:w-auto">전체 보기</SoftButton>
          </div>
        </div>
      </SoftCard>
    </div>
  );
}
