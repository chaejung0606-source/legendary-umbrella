import { cache } from "react";
import type {
  Asset, DashboardStats, MonthlyAcquisitionPoint, CategoryRatioPoint, LaptopLoan, ConsumableItem, Seat, SeatAsset,
  Account, AssetMajorCategory, Building,
} from "@/types";
import { prisma } from "@/lib/prisma";
import { TODAY } from "./pools";

// DB(Postgres)에서 전체 데이터셋을 로드한다. React cache 로 한 렌더/요청 내에서 1회만 조회.
// 스키마 필드가 앱 타입과 1:1 이므로 캐스팅으로 브리지한다.
const loadData = cache(async () => {
  const [accounts, majors, buildings, assets, laptopLoans, consumables, seats] = await Promise.all([
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.majorCategory.findMany({ include: { middles: true }, orderBy: { code: "asc" } }),
    prisma.building.findMany({ orderBy: { code: "asc" } }),
    prisma.asset.findMany(),
    prisma.laptopLoan.findMany(),
    prisma.consumableItem.findMany(),
    prisma.seat.findMany({ orderBy: { code: "asc" } }),
  ]);

  const categories: AssetMajorCategory[] = majors.map((m) => ({
    id: m.id, code: m.code, name: m.name,
    middles: m.middles.map((mid) => ({ id: mid.id, code: mid.code, name: mid.name, majorId: m.id, detailItems: mid.detailItems })),
  }));

  return {
    accounts: accounts as unknown as Account[],
    categories,
    buildings: buildings as Building[],
    assets: assets as unknown as Asset[],
    laptopLoans: laptopLoans as unknown as LaptopLoan[],
    consumables: consumables as unknown as ConsumableItem[],
    seats: seats.map((s) => ({ id: s.id, code: s.code, occupantName: s.occupantName, assets: (s.assets as unknown as SeatAsset[]) ?? [] })) as Seat[],
  };
});

// ─── 공통 헬퍼 ───
export function isMismatch(a: Asset): boolean {
  return !!a.lockedManagementNo && a.lockedManagementNo !== a.generatedManagementNo;
}
const live = (assets: Asset[]) => assets.filter((a) => !a.deletedAt);

// ─── 자산 ───
export async function getAssetById(id: string): Promise<Asset | undefined> {
  const d = await loadData();
  return d.assets.find((a) => a.id === id);
}

export interface AssetFilter {
  q?: string; major?: string; middle?: string; place?: string; room?: string;
  rfid?: "registered" | "missing" | ""; status?: string; usage?: string;
  page?: number; pageSize?: number;
}
export async function filterAssets(f: AssetFilter) {
  const d = await loadData();
  const pageSize = f.pageSize ?? 20;
  const page = Math.max(1, f.page ?? 1);
  let rows = live(d.assets);
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

  rows = [...rows].sort((a, b) => (a.legacyRowNo ?? 0) - (b.legacyRowNo ?? 0));
  const total = rows.length;
  const totalAmount = rows.reduce((s, a) => s + a.unitPrice, 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  return { rows: paged, total, totalAmount, page, totalPages, pageSize };
}

/** deletedAt 없는 활성 자산 전체 (RFID 페이지 등) */
export async function getActiveAssets(): Promise<Asset[]> {
  const d = await loadData();
  return live(d.assets);
}

// ─── 대시보드 지표 ───
export async function getDashboardStats(): Promise<DashboardStats> {
  const d = await loadData();
  const assets = live(d.assets);
  const month = TODAY.slice(0, 7);
  return {
    totalAssets: assets.length,
    totalAcquisition: assets.reduce((s, a) => s + a.unitPrice, 0),
    rfidUnregistered: assets.filter((a) => !a.schoolRfidNo).length,
    laptopsOut: d.laptopLoans.filter((l) => l.status === "직원사용" || l.status === "대여중").length,
    needsInspection: assets.filter((a) => a.assetStatus === "점검필요" || a.assetStatus === "수리중").length,
    newThisMonth: assets.filter((a) => (a.acquiredDate ?? "").startsWith(month)).length,
  };
}

export async function getMonthlyAcquisition(monthsBack = 12): Promise<MonthlyAcquisitionPoint[]> {
  const d = await loadData();
  const assets = live(d.assets);
  const [ty, tm] = TODAY.split("-").map(Number);
  const points: MonthlyAcquisitionPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const ym = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const inMonth = assets.filter((a) => (a.acquiredDate ?? "").startsWith(ym));
    points.push({
      month: `${String(dt.getUTCFullYear()).slice(2)}.${String(dt.getUTCMonth() + 1).padStart(2, "0")}`,
      count: inMonth.length,
      amount: inMonth.reduce((s, a) => s + a.unitPrice, 0),
    });
  }
  return points;
}

const CATEGORY_COLORS: Record<string, string> = {
  가구: "#8FB9A8", 사무용장비: "#B7D8E8", 전산장비: "#6E9B86", 가전제품: "#CBE0D4",
  방송장비: "#9FB7A4", 기타자산: "#E0D3BE", 소프트웨어: "#A9CBD9",
};
export async function getCategoryRatio(): Promise<CategoryRatioPoint[]> {
  const d = await loadData();
  const map = new Map<string, { count: number; amount: number }>();
  for (const a of live(d.assets)) {
    const cur = map.get(a.majorCategory) ?? { count: 0, amount: 0 };
    cur.count++; cur.amount += a.unitPrice;
    map.set(a.majorCategory, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, count: v.count, amount: v.amount, color: CATEGORY_COLORS[name] ?? "#cbd5e1" }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecentAssets(n = 5): Promise<Asset[]> {
  const d = await loadData();
  return [...live(d.assets)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n);
}

export async function getRfidCheckAssets(n = 5): Promise<Asset[]> {
  const d = await loadData();
  return live(d.assets).filter((a) => !a.schoolRfidNo).slice(0, n);
}

// ─── 대여 ───
export async function getLaptopLoans(): Promise<LaptopLoan[]> {
  return (await loadData()).laptopLoans;
}
export async function getLaptopStats() {
  const loans = (await loadData()).laptopLoans.filter((l) => l.isNotebook);
  const by = (s: string) => loans.filter((l) => l.status === s).length;
  return { total: loans.length, stored: by("보관"), staff: by("직원사용"), loaned: by("대여중"), repair: by("수리") + by("분실") + by("폐기") };
}
export async function getReturnDueLaptops(withinDays = 7): Promise<LaptopLoan[]> {
  const d = await loadData();
  return d.laptopLoans
    .filter((l) => l.dueAt)
    .filter((l) => (new Date(l.dueAt!).getTime() - new Date(TODAY).getTime()) / 86400000 <= withinDays)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
}
export async function getLoanForAsset(assetId: string): Promise<LaptopLoan | undefined> {
  return (await loadData()).laptopLoans.find((l) => l.assetId === assetId);
}
export async function isAssetOnLoan(asset: Asset): Promise<boolean> {
  if (asset.assetStatus === "대여중") return true;
  const loan = await getLoanForAsset(asset.id);
  return !!loan && (loan.status === "대여중" || loan.status === "직원사용");
}

// ─── 소모품 ───
export async function getConsumables(): Promise<ConsumableItem[]> {
  return (await loadData()).consumables;
}
export async function getConsumableStats() {
  const items = (await loadData()).consumables;
  return {
    itemCount: items.length,
    totalQty: items.reduce((s, c) => s + c.currentQty, 0),
    lowStock: items.filter((c) => c.status !== "정상").length,
    totalValue: items.reduce((s, c) => s + c.currentQty * c.unitPrice, 0),
  };
}

// ─── 기준정보 / 계정 / 좌석 ───
export async function getCategories(): Promise<AssetMajorCategory[]> {
  return (await loadData()).categories;
}
export async function getBuildings(): Promise<Building[]> {
  return (await loadData()).buildings;
}
export async function getAccounts(): Promise<Account[]> {
  return (await loadData()).accounts;
}
export async function getSeats(): Promise<Seat[]> {
  return (await loadData()).seats;
}

export { TODAY };
