import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toaster";
import type { HeaderNotification } from "@/components/layout/top-header";
import { getDashboardStats, getReturnDueLaptops, getConsumableStats } from "@/data";

// 알림은 실제 데이터에서 계산한다. 데이터 변경(대여/입출고 등)이 즉시 반영되도록 동적 렌더링.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
  ];

  return (
    <ToastProvider>
      <AppShell notifications={notifications}>{children}</AppShell>
    </ToastProvider>
  );
}
