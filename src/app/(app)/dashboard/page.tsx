import Link from "next/link";
import { cookies } from "next/headers";
import { Boxes, Coins, ScanLine, Laptop, Wrench, Sparkles, PlusCircle, ArrowLeftRight, ChevronRight, Clock } from "lucide-react";
import {
  getDashboardStats, getMonthlyAcquisition, getCategoryRatio, getRecentAssets, getReturnDueLaptops, getRfidCheckAssets, TODAY,
} from "@/data";
import { formatCurrency, formatCurrencyShort, formatNumber, formatDate } from "@/lib/format";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { HeroCard } from "@/components/cards/hero-card";
import { StatCard } from "@/components/cards/stat-card";
import { ChartCard } from "@/components/cards/chart-card";
import { SoftCard, SoftCardHeader } from "@/components/cards/soft-card";
import { AssetStatusBadge, LoanStatusBadge } from "@/components/badges/status-badge";
import { MonthlyAssetChart } from "@/components/charts/monthly-asset-chart";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, monthly, categories, recent, returnDue, rfidCheck] = await Promise.all([
    getDashboardStats(),
    getMonthlyAcquisition(),
    getCategoryRatio(),
    getRecentAssets(5),
    getReturnDueLaptops(7),
    getRfidCheckAssets(5),
  ]);

  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const isManager = !!session && ["admin", "asset_manager"].includes(session.role);

  const heroBtn = "inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-pill transition hover:bg-white";

  return (
    <div className="space-y-6">
      <HeroCard
        greeting="안녕하세요, 자산관리 담당자님 👋"
        subtitle="오늘 확인할 사업단 자산 현황을 한눈에 정리했어요."
        actions={
          <>
            {isManager && <Link href="/assets/new" className={heroBtn}><PlusCircle className="h-4 w-4" /> 자산 등록</Link>}
            <Link href="/loans/new" className={heroBtn}><ArrowLeftRight className="h-4 w-4" /> 대여 신청</Link>
          </>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="전체 자산 수" value={formatNumber(stats.totalAssets)} sub="건" icon={Boxes} tone="lavender" />
        <StatCard label="전체 취득금액" value={formatCurrencyShort(stats.totalAcquisition)} sub={formatCurrency(stats.totalAcquisition)} icon={Coins} tone="purple" />
        <StatCard label="RFID 미등록" value={formatNumber(stats.rfidUnregistered)} sub={`등록률 ${Math.round((1 - stats.rfidUnregistered / stats.totalAssets) * 100)}%`} icon={ScanLine} tone="coral" />
        <StatCard label="노트북 사용/대여 중" value={formatNumber(stats.laptopsOut)} sub="45대 중" icon={Laptop} tone="sky" />
        <StatCard label="점검 필요 자산" value={formatNumber(stats.needsInspection)} sub="점검·수리" icon={Wrench} tone="cream" />
        <StatCard label="이번 달 신규" value={formatNumber(stats.newThisMonth)} sub={`${TODAY.slice(0, 7)} 기준`} icon={Sparkles} tone="mint" />
      </div>

      {/* 차트 */}
      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="월별 자산 취득 현황" description="최근 12개월 등록 건수">
          <MonthlyAssetChart data={monthly} />
        </ChartCard>
        <ChartCard className="lg:col-span-2" title="대분류별 자산 비율" description="전체 자산 구성">
          <CategoryDonutChart data={categories} />
        </ChartCard>
      </div>

      {/* 리스트 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 최근 등록/수정 */}
        <SoftCard>
          <SoftCardHeader title="최근 등록/수정 자산" action={<Link href="/assets" className="text-xs font-semibold text-primary hover:underline">전체 보기</Link>} />
          <ul className="space-y-2.5">
            {recent.map((a) => (
              <li key={a.id}>
                <Link href={`/assets/${a.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-accent">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pastel-lavender text-pastel-lavenderInk"><Boxes className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.itemName}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{a.lockedManagementNo}</span>
                  </span>
                  <AssetStatusBadge status={a.assetStatus} />
                </Link>
              </li>
            ))}
          </ul>
        </SoftCard>

        {/* 반납 예정 노트북 */}
        <SoftCard>
          <SoftCardHeader title="반납 예정 노트북" description="7일 이내" action={<Link href="/laptop-loans" className="text-xs font-semibold text-primary hover:underline">대여관리</Link>} />
          <ul className="space-y-2.5">
            {returnDue.length === 0 && <li className="text-sm text-muted-foreground py-4 text-center">예정된 반납이 없어요.</li>}
            {returnDue.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-pastel-apricot/40 p-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 text-pastel-apricotInk"><Clock className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.itemName} · {l.userName}</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">{l.managementNo}</span>
                </span>
                <span className="text-right">
                  <LoanStatusBadge status={l.status} />
                  <span className="mt-0.5 block text-[11px] text-pastel-apricotInk">~{formatDate(l.dueAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </SoftCard>

        {/* RFID 확인 필요 */}
        <SoftCard>
          <SoftCardHeader title="RFID 확인 필요" description={`미등록 ${formatNumber(stats.rfidUnregistered)}건`} action={<Link href="/assets?rfid=missing" className="text-xs font-semibold text-primary hover:underline">목록</Link>} />
          <ul className="space-y-2.5">
            {rfidCheck.map((a) => (
              <li key={a.id}>
                <Link href={`/assets/${a.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-accent">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pastel-coral text-pastel-coralInk"><ScanLine className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.itemName}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{a.place} · {a.roomName}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </SoftCard>
      </div>
    </div>
  );
}
