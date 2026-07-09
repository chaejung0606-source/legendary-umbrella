import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toaster";
import type { HeaderNotification } from "@/components/layout/top-header";
import { getDashboardStats, getReturnDueLaptops, getConsumableStats } from "@/data";
import { getAccountById } from "@/data/mutations";
import { verifySession, menuKeyForPath, SESSION_COOKIE } from "@/lib/session";
import { NAV_ITEMS } from "@/lib/nav";

// 알림은 실제 데이터에서 계산한다. 데이터 변경(대여/입출고 등)이 즉시 반영되도록 동적 렌더링.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 세션 확인 (미들웨어가 1차 보호, 여기서 2차 방어 + 사용자/권한 로드)
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/");

  // 계정의 최신 권한을 데이터셋에서 조회(관리자 편집 즉시 반영). 없으면 세션값 사용.
  const account = getAccountById(session.sub);
  const perms = account?.permissions ?? session.perms ?? [];
  const user = { name: account?.name ?? session.name, email: account?.email ?? session.email };

  // 권한 있는 메뉴의 href 만 사이드바에 노출 (아이콘 컴포넌트는 클라이언트로 전달 불가)
  const allowedHrefs = NAV_ITEMS.filter((item) => {
    const key = menuKeyForPath(item.href);
    return !key || perms.includes(key);
  }).map((item) => item.href);

  const stats = getDashboardStats();
  const due = getReturnDueLaptops(7);
  const consumables = getConsumableStats();

  const notifications: HeaderNotification[] = [
    ...(due.length > 0
      ? [{ id: "loan-due", tone: "warning" as const, title: `반납 예정 노트북 ${due.length}대`, description: "7일 이내 반납 예정입니다.", href: "/laptop-loans" }]
      : []),
    ...(stats.needsInspection > 0
      ? [{ id: "inspection", tone: "warning" as const, title: `점검 필요 자산 ${stats.needsInspection}건`, description: "점검·수리 상태의 자산을 확인하세요.", href: "/assets?status=점검필요" }]
      : []),
    ...(consumables.lowStock > 0
      ? [{ id: "low-stock", tone: "error" as const, title: `재고 부족 품목 ${consumables.lowStock}종`, description: "안전재고 미만입니다. 입고가 필요해요.", href: "/consumables" }]
      : []),
    ...(stats.rfidUnregistered > 0
      ? [{ id: "rfid", tone: "info" as const, title: `RFID 미등록 ${stats.rfidUnregistered}건`, description: "태그 등록이 필요한 자산이 있습니다.", href: "/rfid" }]
      : []),
  ].filter((n) => allowedHrefs.some((h) => n.href.startsWith(h)) || (allowedHrefs.includes("/assets") && n.href.startsWith("/assets")));

  return (
    <ToastProvider>
      <AppShell notifications={notifications} allowedHrefs={allowedHrefs} user={user}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
