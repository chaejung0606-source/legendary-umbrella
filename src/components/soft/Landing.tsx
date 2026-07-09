"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Boxes, FileText, CalendarCheck, Bell, BarChart3, Users,
  Menu, X, ArrowRight, PlayCircle, Sparkles,
} from "lucide-react";
import { SoftCard } from "@/components/soft/SoftCard";
import { SoftButton } from "@/components/soft/SoftButton";
import { FeatureCard } from "@/components/soft/FeatureCard";
import { DashboardPreview } from "@/components/soft/DashboardPreview";

// ── 더미 데이터 ──────────────────────────────────────────────
const NAV = [
  { label: "소개", href: "#intro" },
  { label: "기능", href: "#features" },
  { label: "대시보드", href: "/dashboard" },
  { label: "문의", href: "#contact" },
];

const FEATURES = [
  { icon: FileText, title: "신청 관리", description: "자산·대여 신청을 한 흐름으로 접수하고 처리 단계를 실시간으로 추적합니다.", badge: "핵심", accent: "mint" as const },
  { icon: Boxes, title: "자산 현황", description: "906건 규모의 자산 원장을 분류·위치·상태별로 한눈에 파악합니다.", badge: "실시간", accent: "sky" as const },
  { icon: CalendarCheck, title: "일정 확인", description: "반납 예정·점검 일정을 달력과 알림으로 미리 챙깁니다.", badge: "자동", accent: "sage" as const },
  { icon: Bell, title: "알림 관리", description: "반납 임박·재고 부족·검토 필요 항목을 우선순위로 전달합니다.", accent: "pink" as const },
  { icon: BarChart3, title: "통계 대시보드", description: "취득·구성·가동률 지표를 집계해 의사결정을 돕습니다.", accent: "mint" as const },
  { icon: Users, title: "사용자 관리", description: "역할과 메뉴별 권한을 세밀하게 부여하고 관리합니다.", badge: "권한", accent: "sky" as const },
];

const CTA_STATS = [
  { value: "906", label: "관리 자산" },
  { value: "45", label: "대여 노트북" },
  { value: "99.9%", label: "가동 신뢰도" },
];

// 무광 세라믹 랜딩. `/` 와 `/welcome` 이 공유한다. CTA 는 실제 관리자 앱(/dashboard)으로 연결.
export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="ceramic-page min-h-screen text-ceramic-ink">
      {/* ── 상단 네비게이션 ── */}
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <nav className="ceramic grain mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[14px] ceramic-mint grain">
              <Boxes className="h-4.5 w-4.5 text-emerald-900/70" style={{ width: 18, height: 18 }} />
            </span>
            <span className="text-[15px] font-bold tracking-tight">사업단 플랫폼</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-ceramic-sub transition hover:text-ceramic-ink">
                {n.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <Link href="/dashboard"><SoftButton variant="primary" className="px-5">시작하기</SoftButton></Link>
          </div>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="ceramic-btn grain grid h-10 w-10 place-items-center rounded-full md:hidden"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* 모바일 메뉴 */}
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-6xl md:hidden">
            <SoftCard className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-medium text-ceramic-sub transition hover:bg-ceramic-cream/60 hover:text-ceramic-ink">
                  {n.label}
                </Link>
              ))}
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}><SoftButton variant="primary" className="mt-1 w-full">시작하기</SoftButton></Link>
            </SoftCard>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ── 히어로 ── */}
        <section id="intro" className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="ceramic grain inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ceramic-sub">
              <Sparkles className="h-3.5 w-3.5 text-ceramic-sage" /> 공공·대학 사업단을 위한 관리 플랫폼
            </span>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
              부드럽고 직관적인<br />관리 플랫폼
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ceramic-sub">
              복잡한 신청, 관리, 확인 절차를 한눈에 볼 수 있도록 설계했습니다.
              자산·대여·재고·일정을 하나의 차분한 화면에서 관리하세요.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard"><SoftButton variant="primary" className="w-full px-7 sm:w-auto">시작하기 <ArrowRight className="h-4 w-4" /></SoftButton></Link>
              <Link href="/dashboard"><SoftButton variant="secondary" className="w-full px-7 sm:w-auto"><PlayCircle className="h-4 w-4 text-ceramic-sage" /> 데모 보기</SoftButton></Link>
            </div>

            {/* 신뢰 지표 */}
            <div className="mt-9 flex flex-wrap gap-6">
              {CTA_STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-xs text-ceramic-sub">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 미니 대시보드 프리뷰 */}
          <div className="relative">
            <DashboardPreview />
          </div>
        </section>

        {/* ── 기능 카드 섹션 ── */}
        <section id="features" className="py-14 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-[34px]">필요한 기능을 한 곳에</h2>
            <p className="mt-3 text-[15px] text-ceramic-sub">
              신청부터 통계까지, 사업단 운영에 꼭 필요한 기능을 무광 세라믹 인터페이스로 담았습니다.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* ── 대시보드 프리뷰 섹션 ── */}
        <section id="dashboard" className="py-14 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <span className="ceramic grain inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ceramic-sub">
                <BarChart3 className="h-3.5 w-3.5 text-ceramic-sky" /> 관리자 대시보드
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-[34px]">
                현황을 한눈에,<br />처리를 한 번에
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ceramic-sub">
                오늘의 신청, 처리 대기, 승인 완료, 반납 예정을 카드로 정리하고
                진행률과 추이를 부드러운 세라믹 시각화로 보여줍니다.
              </p>
              <div className="mt-6 space-y-2.5">
                {["실시간 지표 집계", "우선순위 알림", "역할별 권한 관리"].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full ceramic-mint grain">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-900/50" />
                    </span>
                    <span className="text-sm font-medium text-ceramic-ink">{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7">
                <Link href="/dashboard"><SoftButton variant="primary" className="px-6">대시보드 열기 <ArrowRight className="h-4 w-4" /></SoftButton></Link>
              </div>
            </div>
            <div className="lg:col-span-3">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ── CTA 마무리 ── */}
        <section id="contact" className="pb-20 pt-6">
          <SoftCard large padded={false} className="relative overflow-hidden">
            {/* 곡선 배경 레이어 */}
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-[46%_54%_60%_40%/50%_46%_54%_50%] ceramic-mint grain opacity-60" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-[54%_46%_40%_60%/46%_54%_46%_54%] ceramic-sky grain opacity-60" aria-hidden />
            <div className="relative flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-10">
              <h2 className="max-w-xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                지금, 사업단 운영을 더 부드럽게
              </h2>
              <p className="max-w-md text-[15px] text-ceramic-sub">
                복잡한 절차 없이 바로 시작하세요. 도입 문의는 언제든 환영합니다.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard"><SoftButton variant="primary" className="w-full px-8 sm:w-auto">무료로 시작하기</SoftButton></Link>
                <Link href="/dashboard"><SoftButton variant="secondary" className="w-full px-8 sm:w-auto">도입 문의</SoftButton></Link>
              </div>
            </div>
          </SoftCard>
        </section>
      </main>

      {/* ── 푸터 ── */}
      <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-ceramic-line pt-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[12px] ceramic-mint grain">
              <Boxes className="h-4 w-4 text-emerald-900/70" />
            </span>
            <span className="text-sm font-semibold">사업단 플랫폼</span>
          </div>
          <p className="text-xs text-ceramic-sub">© 2026 사업단 자산관리 플랫폼 · 무광 세라믹 디자인 시스템</p>
        </div>
      </footer>
    </div>
  );
}
