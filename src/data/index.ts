import type {
  Asset, DashboardStats, MonthlyAcquisitionPoint, CategoryRatioPoint, LaptopLoan, ConsumableItem, Seat,
  Account, AssetMajorCategory, Building,
} from "@/types";
import { generateDataset, type Dataset } from "./generate";
import { TODAY } from "./pools";

// 생성된 데이터셋(싱글턴). 추후 이 모듈만 Prisma 쿼리로 교체하면 화면은 그대로 동작한다.
// globalThis 에 보관해 서버 액션/페이지 렌더가 같은 인스턴스를 공유하고,
// 개발 모드 HMR 이후에도 변경 내용(등록/대여/입출고 등)이 유지되도록 한다.
// 단, 서버 프로세스가 재시작되면 초기 더미 데이터로 되돌아간다 (DB 미연동 MVP).
const globalStore = globalThis as unknown as { __sadanDataset?: Dataset };
const DATASET = (globalStore.__sadanDataset ??= generateDataset());

export const dataset = DATASET;

// ─── 공통 헬퍼 ───
export function isMismatch(a: Asset): boolean {
  return !!a.lockedManagementNo && a.lockedManagementNo !== a.generatedManagementNo;
}
const liveAssets = () => DATASET.assets.filter((a) => !a.deletedAt);

// ─── 자산 ───
export function getAssetById(id: string): Asset | undefined {
  return DATASET.assets.find((a) => a.id === id);
}

export interface AssetFilter {
  q?: string; major?: string; middle?: string; place?: string; room?: string;
  rfid?: "registered" | "missing" | ""; status?: string; usage?: string;
  page?: number; pageSize?: number;
}
export function filterAssets(f: AssetFilter) {
  const pageSize = f.pageSize ?? 20;
  const page = Math.max(1, f.page ?? 1);
  let rows = liveAssets();
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter((a) =>
      [a.itemName, a.specification, a.lockedManagementNo, a.generatedManagementNo, a.schoolRfidNo, a.currentUserName]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }
  if (f.major) rows = rows.filter((a) => a.majorCategory === f.major);
  if (f.middle) rows = rows.filter((a) => a.middleCategory === f.middle);
  if (f.place) rows = rows.filter((a) => a.place?.includes(f.place!));
  if (f.room) rows = rows.filter((a) => a.roomName?.includes(f.room!));
  if (f.status) rows = rows.filter((a) => a.assetStatus === f.status);
  if (f.usage) rows = rows.filter((a) => a.usageType === f.usage);
  if (f.rfid === "registered") rows = rows.filter((a) => !!a.schoolRfidNo);
  if (f.rfid === "missing") rows = rows.filter((a) => !a.schoolRfidNo);

  const total = rows.length;
  const totalAmount = rows.reduce((s, a) => s + a.unitPrice, 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  return { rows: paged, total, totalAmount, page, totalPages, pageSize };
}

// ─── 대시보드 지표 (모두 계산) ───
export function getDashboardStats(): DashboardStats {
  const assets = liveAssets();
  const month = TODAY.slice(0, 7);
  return {
    totalAssets: assets.length,
    totalAcquisition: assets.reduce((s, a) => s + a.unitPrice, 0),
    rfidUnregistered: assets.filter((a) => !a.schoolRfidNo).length,
    laptopsOut: DATASET.laptopLoans.filter((l) => l.status === "직원사용" || l.status === "대여중").length,
    needsInspection: assets.filter((a) => a.assetStatus === "점검필요" || a.assetStatus === "수리중").length,
    newThisMonth: assets.filter((a) => (a.acquiredDate ?? "").startsWith(month)).length,
  };
}

export function getMonthlyAcquisition(monthsBack = 12): MonthlyAcquisitionPoint[] {
  const assets = liveAssets();
  const [ty, tm] = TODAY.split("-").map(Number);
  const points: MonthlyAcquisitionPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const inMonth = assets.filter((a) => (a.acquiredDate ?? "").startsWith(ym));
    points.push({
      month: `${String(d.getUTCFullYear()).slice(2)}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      count: inMonth.length,
      amount: inMonth.reduce((s, a) => s + a.unitPrice, 0),
    });
  }
  return points;
}

// 도넛 차트용 — 라임/올리브 그린 단일 계열의 명도 차이로 구분한다.
const CATEGORY_COLORS: Record<string, string> = {
  가구: "#c8e253", 사무용장비: "#9dbf34", 전산장비: "#74891d", 가전제품: "#d9efa0",
  방송장비: "#55631d", 기타자산: "#ecf7c8", 소프트웨어: "#87a852",
};
export function getCategoryRatio(): CategoryRatioPoint[] {
  const assets = liveAssets();
  const map = new Map<string, { count: number; amount: number }>();
  for (const a of assets) {
    const cur = map.get(a.majorCategory) ?? { count: 0, amount: 0 };
    cur.count++; cur.amount += a.unitPrice;
    map.set(a.majorCategory, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, count: v.count, amount: v.amount, color: CATEGORY_COLORS[name] ?? "#cbd5e1" }))
    .sort((a, b) => b.count - a.count);
}

export function getRecentAssets(n = 5): Asset[] {
  return [...liveAssets()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n);
}

export function getRfidCheckAssets(n = 5): Asset[] {
  return liveAssets().filter((a) => !a.schoolRfidNo).slice(0, n);
}

// ─── 노트북 ───
export function getLaptopLoans(): LaptopLoan[] {
  return DATASET.laptopLoans;
}
export function getLaptopStats() {
  const loans = DATASET.laptopLoans;
  const by = (s: string) => loans.filter((l) => l.status === s).length;
  return {
    total: loans.length, stored: by("보관"), staff: by("직원사용"), loaned: by("대여중"),
    repair: by("수리") + by("분실") + by("폐기"),
  };
}
export function getReturnDueLaptops(withinDays = 7): LaptopLoan[] {
  return DATASET.laptopLoans
    .filter((l) => l.dueAt)
    .filter((l) => {
      const diff = (new Date(l.dueAt!).getTime() - new Date(TODAY).getTime()) / 86400000;
      return diff <= withinDays;
    })
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
}

// ─── 소모품 ───
export function getConsumables(): ConsumableItem[] {
  return DATASET.consumables;
}
export function getConsumableStats() {
  const items = DATASET.consumables;
  return {
    itemCount: items.length,
    totalQty: items.reduce((s, c) => s + c.currentQty, 0),
    lowStock: items.filter((c) => c.status !== "정상").length,
    totalValue: items.reduce((s, c) => s + c.currentQty * c.unitPrice, 0),
  };
}

// ─── 대여 (전체 자산) ───
export function getLoanForAsset(assetId: string): LaptopLoan | undefined {
  return DATASET.laptopLoans.find((l) => l.assetId === assetId);
}
/** 현재 대여/사용 중인지 (자산 상태 또는 대여 기록 기준) */
export function isAssetOnLoan(asset: Asset): boolean {
  if (asset.assetStatus === "대여중") return true;
  const loan = getLoanForAsset(asset.id);
  return !!loan && (loan.status === "대여중" || loan.status === "직원사용");
}

// ─── 기준정보 (편집 가능) ───
export const getCategories = (): AssetMajorCategory[] => DATASET.categories;
export const getBuildings = (): Building[] => DATASET.buildings;

// ─── 계정 / 권한 ───
export const getAccounts = (): Account[] => DATASET.accounts;

// ─── 좌석 / 가져오기 / 감사 ───
export const getSeats = (): Seat[] => DATASET.seats;
export const getImportJob = () => DATASET.importJob;
export const getAuditLogs = () => DATASET.auditLogs;
export { TODAY };
