import type {
  Asset, ConsumableItem, LaptopLoan, LoanStatus, Seat, TagStatus, UsageType,
  Account, AssetMajorCategory, AssetMiddleCategory, Building, AssetStatus,
} from "@/types";
import { USAGE_TYPES } from "@/types";
import { prisma } from "@/lib/prisma";
import { TODAY } from "./pools";
import { generateManagementNumber } from "@/lib/management-number";
import { classifyUsage } from "@/lib/usage";

// DB(Postgres) 쓰기 계층. 서버 액션에서만 호출한다.
const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function normalizeUsage(value: string | null | undefined): UsageType {
  const compact = (value ?? "").replace(/\s+/g, "");
  return (USAGE_TYPES as readonly string[]).includes(compact) ? (compact as UsageType) : "미확인";
}

function usageFields(usageRaw: string | null | undefined) {
  const u = classifyUsage(usageRaw);
  return {
    usageType: normalizeUsage(u.usageType),
    currentUserName: u.assigneeName && u.assigneeName.length > 1 ? u.assigneeName : null,
    currentLocationNote: u.assigneeName && u.assigneeName.length === 1 ? `${u.assigneeName}좌석` : (usageRaw?.trim() || null),
  };
}

// ─── 자산 ───
export interface AssetInput {
  expenditureDocument?: string | null;
  managingOrganization?: string | null;
  itemName: string;
  specification?: string | null;
  majorCategory: string;
  middleCategory: string;
  classificationCode: number | null;
  acquiredDate: string | null;
  unitPrice: number;
  sequenceNo: number | null;
  buildingCode?: string | null;
  place?: string | null;
  roomName?: string | null;
  usageRaw?: string | null;
  schoolRfidNo?: string | null;
  tagStatus: TagStatus | "미지정";
  memo?: string | null;
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const agg = await prisma.asset.aggregate({ _max: { legacyRowNo: true } });
  const serial = (agg._max.legacyRowNo ?? 0) + 1;
  const generated = generateManagementNumber({
    serialNo: serial, acquiredAt: input.acquiredDate, classificationCode: input.classificationCode,
    itemNo: input.sequenceNo, buildingCode: input.buildingCode ?? null,
  });
  const ts = nowIso();
  const asset = await prisma.asset.create({
    data: {
      id: `asset-${serial}`,
      legacyRowNo: serial,
      expenditureDocument: input.expenditureDocument ?? null,
      managingOrganization: input.managingOrganization ?? null,
      majorCategory: input.majorCategory,
      middleCategory: input.middleCategory,
      classificationCode: input.classificationCode,
      acquiredDate: input.acquiredDate,
      itemName: input.itemName,
      specification: input.specification ?? null,
      unitPrice: input.unitPrice,
      sequenceNo: input.sequenceNo,
      place: input.place ?? null,
      roomName: input.roomName ?? null,
      buildingCode: input.buildingCode ?? null,
      generatedManagementNo: generated,
      lockedManagementNo: generated,
      schoolRfidNo: input.schoolRfidNo || null,
      tagStatus: input.tagStatus,
      assetStatus: "정상",
      memo: input.memo ?? null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      ...usageFields(input.usageRaw),
    },
  });
  return asset as unknown as Asset;
}

export async function updateAsset(id: string, input: AssetInput): Promise<Asset | null> {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return null;
  const generated = generateManagementNumber({
    serialNo: existing.legacyRowNo ?? null, acquiredAt: input.acquiredDate, classificationCode: input.classificationCode,
    itemNo: input.sequenceNo, buildingCode: input.buildingCode ?? null,
  });
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      expenditureDocument: input.expenditureDocument ?? null,
      managingOrganization: input.managingOrganization ?? null,
      itemName: input.itemName,
      specification: input.specification ?? null,
      majorCategory: input.majorCategory,
      middleCategory: input.middleCategory,
      classificationCode: input.classificationCode,
      acquiredDate: input.acquiredDate,
      unitPrice: input.unitPrice,
      sequenceNo: input.sequenceNo,
      buildingCode: input.buildingCode ?? null,
      place: input.place ?? null,
      roomName: input.roomName ?? null,
      schoolRfidNo: input.schoolRfidNo || null,
      tagStatus: input.tagStatus,
      memo: input.memo ?? null,
      generatedManagementNo: generated, // lockedManagementNo 는 보존
      updatedAt: nowIso(),
      ...usageFields(input.usageRaw),
    },
  });
  return asset as unknown as Asset;
}

export async function moveAsset(
  id: string,
  move: { place: string; roomName?: string | null; userName?: string | null; note?: string | null }
): Promise<Asset | null> {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return null;
  const memo = move.note ? [existing.memo, `[이동 ${TODAY}] ${move.note}`].filter(Boolean).join("\n") : existing.memo;
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      place: move.place,
      roomName: move.roomName || null,
      currentUserName: move.userName !== undefined ? move.userName || null : existing.currentUserName,
      memo,
      updatedAt: nowIso(),
    },
  });
  return asset as unknown as Asset;
}

// ─── 대여 ───
async function ensureLoan(assetId: string): Promise<LaptopLoan | null> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return null;
  const loan = await prisma.laptopLoan.findUnique({ where: { assetId } });
  if (loan) return loan as unknown as LaptopLoan;
  const created = await prisma.laptopLoan.create({
    data: {
      id: `loan-${assetId}`, assetId, managementNo: asset.lockedManagementNo ?? asset.generatedManagementNo ?? "",
      itemName: asset.itemName, status: "보관", isNotebook: false,
    },
  });
  return created as unknown as LaptopLoan;
}

export async function loanAsset(assetId: string, userName: string, dueAt: string | null): Promise<LaptopLoan | null> {
  const loan = await ensureLoan(assetId);
  if (!loan) return null;
  const [updated] = await prisma.$transaction([
    prisma.laptopLoan.update({ where: { assetId }, data: { status: "대여중", userName, loanedAt: TODAY, dueAt, returnedAt: null } }),
    prisma.asset.update({ where: { id: assetId }, data: { assetStatus: "대여중", currentUserName: userName, updatedAt: nowIso() } }),
  ]);
  return updated as unknown as LaptopLoan;
}

export async function returnAsset(assetId: string, afterStatus: LoanStatus, damaged: boolean): Promise<LaptopLoan | null> {
  const loan = await ensureLoan(assetId);
  if (!loan) return null;
  const map: Partial<Record<LoanStatus, AssetStatus>> = { 보관: "보관중", 수리: "수리중", 분실: "분실", 폐기: "폐기예정" };
  const [updated] = await prisma.$transaction([
    prisma.laptopLoan.update({ where: { assetId }, data: { status: afterStatus, userName: null, dueAt: null, returnedAt: TODAY, note: damaged ? "반납 시 손상 확인" : loan.note ?? null } }),
    prisma.asset.update({ where: { id: assetId }, data: { assetStatus: map[afterStatus] ?? "보관중", currentUserName: null, updatedAt: nowIso() } }),
  ]);
  return updated as unknown as LaptopLoan;
}

// ─── 소모품 ───
function consumableStatus(currentQty: number, safetyQty: number): ConsumableItem["status"] {
  if (currentQty === 0) return "소진";
  if (currentQty < safetyQty) return "부족";
  return "정상";
}

export async function consumableTxn(
  itemId: string, type: "in" | "out" | "adjust", qty: number,
): Promise<{ item: ConsumableItem } | { error: string }> {
  const item = await prisma.consumableItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "품목을 찾을 수 없습니다." };
  let currentQty = item.currentQty;
  const data: { currentQty: number; status: string; lastInboundAt?: string; lastOutboundAt?: string } = { currentQty, status: item.status };
  if (type === "in") { currentQty += qty; data.lastInboundAt = TODAY; }
  else if (type === "out") {
    if (qty > currentQty) return { error: `현재 재고(${currentQty}${item.unit})보다 많은 수량은 출고할 수 없습니다.` };
    currentQty -= qty; data.lastOutboundAt = TODAY;
  } else currentQty = qty;
  data.currentQty = currentQty;
  data.status = consumableStatus(currentQty, item.safetyQty);
  const updated = await prisma.consumableItem.update({ where: { id: itemId }, data });
  return { item: updated as unknown as ConsumableItem };
}

// ─── 엑셀 가져오기 반영 (원장 교체) ───
export interface ImportCommitPayload {
  fileName: string;
  assets: Asset[];
  consumables?: ConsumableItem[];
  seats?: Seat[];
  notebooks?: { managementNo: string; status: string; holder: string | null }[];
}

export async function commitImport(payload: ImportCommitPayload): Promise<{ assets: number; consumables: number; seats: number; loans: number }> {
  const byMgmt = new Map(payload.assets.filter((a) => a.lockedManagementNo).map((a) => [a.lockedManagementNo!, a]));
  const loans: LaptopLoan[] = (payload.notebooks ?? []).flatMap((n, i) => {
    const asset = byMgmt.get(n.managementNo);
    if (!asset) return [];
    const status: LoanStatus = n.status === "직원사용" ? "직원사용" : "보관";
    return [{
      id: `loan-${asset.id}`, assetId: asset.id, managementNo: n.managementNo, itemName: `사업단 노트북 #${i + 1}`,
      status, userName: n.holder ?? null, loanedAt: n.holder ? TODAY : null, dueAt: null, returnedAt: null, note: null, isNotebook: true,
    }];
  });

  await prisma.$transaction([
    prisma.laptopLoan.deleteMany({}),
    prisma.asset.deleteMany({}),
    prisma.asset.createMany({ data: payload.assets.map((a) => ({ ...a })) }),
    ...(payload.consumables?.length ? [prisma.consumableItem.deleteMany({}), prisma.consumableItem.createMany({ data: payload.consumables.map((c) => ({ ...c })) })] : []),
    ...(payload.seats?.length ? [prisma.seat.deleteMany({}), prisma.seat.createMany({ data: payload.seats.map((s) => ({ id: s.id, code: s.code, occupantName: s.occupantName ?? null, assets: s.assets as object })) })] : []),
    ...(loans.length ? [prisma.laptopLoan.createMany({ data: loans.map((l) => ({ ...l })) })] : []),
  ]);

  // 대여/사용 중 노트북은 자산 상태에도 반영
  for (const loan of loans) {
    if (loan.status !== "직원사용" && loan.status !== "대여중") continue;
    await prisma.asset.updateMany({ where: { lockedManagementNo: loan.managementNo }, data: { assetStatus: "대여중", currentUserName: loan.userName ?? null } });
  }

  return { assets: payload.assets.length, consumables: payload.consumables?.length ?? 0, seats: payload.seats?.length ?? 0, loans: loans.length };
}

// ─── 기준정보: 자산분류 ───
export async function addMajorCategory(input: { code: number; name: string }): Promise<AssetMajorCategory | { error: string }> {
  if (!input.name.trim()) return { error: "대분류명을 입력해주세요." };
  if (!Number.isFinite(input.code)) return { error: "대분류 코드는 숫자여야 합니다." };
  if (await prisma.majorCategory.findFirst({ where: { code: input.code } })) return { error: `이미 존재하는 대분류 코드입니다 (${input.code}).` };
  const m = await prisma.majorCategory.create({ data: { id: uid(), code: input.code, name: input.name.trim() } });
  return { ...m, middles: [] };
}

export async function updateMajorCategory(id: string, input: { code: number; name: string }): Promise<AssetMajorCategory | { error: string }> {
  const existing = await prisma.majorCategory.findUnique({ where: { id } });
  if (!existing) return { error: "대분류를 찾을 수 없습니다." };
  if (await prisma.majorCategory.findFirst({ where: { code: input.code, id: { not: id } } })) return { error: `이미 존재하는 대분류 코드입니다 (${input.code}).` };
  const m = await prisma.majorCategory.update({ where: { id }, data: { code: input.code, name: input.name.trim() } });
  return { ...m, middles: [] };
}

export async function deleteMajorCategory(id: string): Promise<{ ok: true } | { error: string }> {
  const m = await prisma.majorCategory.findUnique({ where: { id } });
  if (!m) return { error: "대분류를 찾을 수 없습니다." };
  if (await prisma.asset.count({ where: { majorCategory: m.name, deletedAt: null } })) return { error: "이 대분류를 사용하는 자산이 있어 삭제할 수 없습니다." };
  await prisma.majorCategory.delete({ where: { id } });
  return { ok: true };
}

export async function addMiddleCategory(majorId: string, input: { code: number; name: string; detailItems?: string }): Promise<AssetMiddleCategory | { error: string }> {
  const major = await prisma.majorCategory.findUnique({ where: { id: majorId } });
  if (!major) return { error: "대분류를 먼저 선택해주세요." };
  if (!input.name.trim()) return { error: "중분류명을 입력해주세요." };
  if (!Number.isFinite(input.code)) return { error: "분류코드는 숫자여야 합니다." };
  const detailItems = input.detailItems?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const m = await prisma.middleCategory.create({ data: { id: uid(), code: input.code, name: input.name.trim(), majorId, detailItems } });
  return { id: m.id, code: m.code, name: m.name, majorId, detailItems: m.detailItems };
}

export async function updateMiddleCategory(id: string, input: { code: number; name: string; detailItems?: string }): Promise<AssetMiddleCategory | { error: string }> {
  const existing = await prisma.middleCategory.findUnique({ where: { id } });
  if (!existing) return { error: "중분류를 찾을 수 없습니다." };
  const detailItems = input.detailItems?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const m = await prisma.middleCategory.update({ where: { id }, data: { code: input.code, name: input.name.trim(), detailItems } });
  return { id: m.id, code: m.code, name: m.name, majorId: m.majorId, detailItems: m.detailItems };
}

export async function deleteMiddleCategory(id: string): Promise<{ ok: true } | { error: string }> {
  const m = await prisma.middleCategory.findUnique({ where: { id } });
  if (!m) return { error: "중분류를 찾을 수 없습니다." };
  if (await prisma.asset.count({ where: { middleCategory: m.name, deletedAt: null } })) return { error: "이 중분류를 사용하는 자산이 있어 삭제할 수 없습니다." };
  await prisma.middleCategory.delete({ where: { id } });
  return { ok: true };
}

// ─── 기준정보: 건축물 ───
export async function addBuilding(input: { code: string; name: string; campus?: string }): Promise<Building | { error: string }> {
  if (!input.code.trim()) return { error: "건축물코드를 입력해주세요." };
  if (!input.name.trim()) return { error: "건축물명을 입력해주세요." };
  if (await prisma.building.findUnique({ where: { code: input.code.trim() } })) return { error: `이미 존재하는 건축물코드입니다 (${input.code}).` };
  return prisma.building.create({ data: { id: uid(), code: input.code.trim(), name: input.name.trim(), campus: input.campus?.trim() || "강원대학교 춘천캠퍼스" } });
}

export async function updateBuilding(id: string, input: { code: string; name: string; campus?: string }): Promise<Building | { error: string }> {
  const existing = await prisma.building.findUnique({ where: { id } });
  if (!existing) return { error: "건축물을 찾을 수 없습니다." };
  if (await prisma.building.findFirst({ where: { code: input.code.trim(), id: { not: id } } })) return { error: `이미 존재하는 건축물코드입니다 (${input.code}).` };
  return prisma.building.update({ where: { id }, data: { code: input.code.trim(), name: input.name.trim(), campus: input.campus?.trim() || existing.campus } });
}

export async function deleteBuilding(id: string): Promise<{ ok: true } | { error: string }> {
  const b = await prisma.building.findUnique({ where: { id } });
  if (!b) return { error: "건축물을 찾을 수 없습니다." };
  if (await prisma.asset.count({ where: { buildingCode: b.code, deletedAt: null } })) return { error: "이 건축물코드를 사용하는 자산이 있어 삭제할 수 없습니다." };
  await prisma.building.delete({ where: { id } });
  return { ok: true };
}

// ─── 계정 / 권한 ───
export interface AccountInput {
  name: string;
  email: string;
  password?: string;
  role: string;
  permissions: string[];
  active: boolean;
}

export async function createAccount(input: AccountInput): Promise<Account | { error: string }> {
  if (!input.name.trim()) return { error: "이름을 입력해주세요." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { error: "올바른 이메일 형식이 아닙니다." };
  if (!input.password || input.password.length < 4) return { error: "비밀번호는 4자 이상 입력해주세요." };
  if (await prisma.account.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } } })) return { error: "이미 등록된 이메일입니다." };
  return prisma.account.create({
    data: { id: uid(), name: input.name.trim(), email: input.email.trim(), password: input.password, role: input.role, permissions: input.permissions, active: input.active, createdAt: nowIso() },
  });
}

export async function updateAccount(id: string, input: AccountInput): Promise<Account | { error: string }> {
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return { error: "계정을 찾을 수 없습니다." };
  if (await prisma.account.findFirst({ where: { email: { equals: input.email, mode: "insensitive" }, id: { not: id } } })) return { error: "이미 등록된 이메일입니다." };
  return prisma.account.update({
    where: { id },
    data: {
      name: input.name.trim(), email: input.email.trim(), role: input.role, permissions: input.permissions, active: input.active,
      ...(input.password && input.password.length >= 4 ? { password: input.password } : {}),
    },
  });
}

export async function deleteAccount(id: string): Promise<{ ok: true } | { error: string }> {
  const acc = await prisma.account.findUnique({ where: { id } });
  if (!acc) return { error: "계정을 찾을 수 없습니다." };
  if (acc.role === "admin" && (await prisma.account.count({ where: { role: "admin" } })) <= 1) return { error: "최소 1명의 관리자 계정은 유지해야 합니다." };
  await prisma.account.delete({ where: { id } });
  return { ok: true };
}

// 로그인 검증
export async function verifyLogin(email: string, password: string): Promise<Account | { error: string }> {
  const account = await prisma.account.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
  if (!account || account.password !== password) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  if (!account.active) return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
  if (account.permissions.length === 0) return { error: "접근 가능한 메뉴가 없습니다. 관리자에게 권한을 요청하세요." };
  return account;
}

export async function getAccountById(id: string): Promise<Account | undefined> {
  return (await prisma.account.findUnique({ where: { id } })) ?? undefined;
}
