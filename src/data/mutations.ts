import type {
  Asset, ConsumableItem, LaptopLoan, LoanStatus, Seat, TagStatus, UsageType,
  Account, AssetMajorCategory, AssetMiddleCategory, Building, AssetStatus,
} from "@/types";
import { USAGE_TYPES } from "@/types";
import { prisma } from "@/lib/prisma";
import { todayKst } from "@/lib/date";
import { generateManagementNumber } from "@/lib/management-number";
import { classifyUsage } from "@/lib/usage";
import { hashPassword, verifyPassword } from "@/lib/password";

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

/** 복수 자산 등록 — 각 행마다 연번·관리번호를 이어서 자동 생성한다(단일 등록과 동일 규칙). */
export async function bulkCreateAssets(
  inputs: AssetInput[]
): Promise<{ created: number; firstNo: string | null; lastNo: string | null }> {
  let firstNo: string | null = null;
  let lastNo: string | null = null;
  for (const input of inputs) {
    const asset = await createAsset(input);
    const no = asset.lockedManagementNo ?? asset.generatedManagementNo;
    if (!firstNo) firstNo = no;
    lastNo = no;
  }
  return { created: inputs.length, firstNo, lastNo };
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
  const memo = move.note ? [existing.memo, `[이동 ${todayKst()}] ${move.note}`].filter(Boolean).join("\n") : existing.memo;
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

// 대여신청서 입력 (자산 대여 관리 대장 항목)
export interface LoanInput {
  userName: string; // 대여자
  userAffiliation?: string | null; // 소속
  userIdNo?: string | null; // 사번/학번
  userPhone?: string | null; // 전화번호
  reason?: string | null; // 사유
  loanManager?: string | null; // 대여 관리자
  loanedAt?: string | null; // 대여일자 (기본: 오늘)
  dueAt: string; // 반납 예정일 (필수)
  signature?: string | null; // 대여자 서명 (PNG data URL)
}

// 반납신청서 입력
export interface ReturnInput {
  returnerName: string; // 반납자
  returnerAffiliation?: string | null;
  returnerPhone?: string | null;
  returnManager?: string | null;
  returnedAt?: string | null; // 반납일자 (기본: 오늘)
  afterStatus: LoanStatus; // 반납 후 상태
  damaged: boolean;
}

export async function loanAsset(assetId: string, input: LoanInput): Promise<LaptopLoan | null> {
  const loan = await ensureLoan(assetId);
  if (!loan) return null;
  const [updated] = await prisma.$transaction([
    prisma.laptopLoan.update({
      where: { assetId },
      data: {
        status: "대여중",
        userName: input.userName,
        userAffiliation: input.userAffiliation || null,
        userIdNo: input.userIdNo || null,
        userPhone: input.userPhone || null,
        reason: input.reason || null,
        loanManager: input.loanManager || null,
        loanedAt: input.loanedAt || todayKst(),
        dueAt: input.dueAt,
        signature: input.signature || null,
        returnedAt: null,
        returnerName: null,
        returnerAffiliation: null,
        returnerPhone: null,
        returnManager: null,
      },
    }),
    prisma.asset.update({ where: { id: assetId }, data: { assetStatus: "대여중", currentUserName: input.userName, updatedAt: nowIso() } }),
  ]);
  return updated as unknown as LaptopLoan;
}

export async function returnAsset(assetId: string, input: ReturnInput): Promise<LaptopLoan | null> {
  const loan = await ensureLoan(assetId);
  if (!loan) return null;
  const map: Partial<Record<LoanStatus, AssetStatus>> = { 보관: "보관중", 수리: "수리중", 분실: "분실", 폐기: "폐기예정" };
  const [updated] = await prisma.$transaction([
    prisma.laptopLoan.update({
      where: { assetId },
      data: {
        status: input.afterStatus,
        dueAt: null,
        returnedAt: input.returnedAt || todayKst(),
        returnerName: input.returnerName,
        returnerAffiliation: input.returnerAffiliation || null,
        returnerPhone: input.returnerPhone || null,
        returnManager: input.returnManager || null,
        note: input.damaged ? "반납 시 손상 확인" : loan.note ?? null,
      },
    }),
    prisma.asset.update({ where: { id: assetId }, data: { assetStatus: map[input.afterStatus] ?? "보관중", currentUserName: null, updatedAt: nowIso() } }),
  ]);
  return updated as unknown as LaptopLoan;
}

// ─── 소모품 ───
function consumableStatus(currentQty: number, safetyQty: number): ConsumableItem["status"] {
  if (currentQty === 0) return "소진";
  if (currentQty < safetyQty) return "부족";
  return "정상";
}

export interface ConsumableItemInput {
  itemName: string;
  specification?: string | null;
  unit?: string;
  unitPrice?: number;
  currentQty?: number; // 초기 재고
  safetyQty?: number;
  location?: string | null;
  roomName?: string | null;
  expenditureDocument?: string | null;
}

/** 연구재료/소모품 신규 물품 등록 — 초기 재고가 있으면 오늘 입고로 기록 */
export async function createConsumableItem(input: ConsumableItemInput): Promise<ConsumableItem | { error: string }> {
  const itemName = input.itemName.trim();
  if (!itemName) return { error: "품명을 입력해주세요." };
  const dup = await prisma.consumableItem.findFirst({
    where: { itemName, specification: input.specification?.trim() || null },
  });
  if (dup) return { error: `이미 등록된 품목입니다 (${itemName}). 재고 변경은 입고/출고를 사용하세요.` };
  const currentQty = Math.max(0, Math.round(Number(input.currentQty ?? 0) || 0));
  const safetyQty = Math.max(0, Math.round(Number(input.safetyQty ?? 0) || 0));
  const item = await prisma.consumableItem.create({
    data: {
      id: uid(),
      itemName,
      specification: input.specification?.trim() || null,
      unit: input.unit?.trim() || "개",
      unitPrice: Math.max(0, Math.round(Number(input.unitPrice ?? 0) || 0)),
      currentQty,
      safetyQty,
      location: input.location?.trim() || null,
      roomName: input.roomName?.trim() || null,
      expenditureDocument: input.expenditureDocument?.trim() || null,
      lastInboundAt: currentQty > 0 ? todayKst() : null,
      status: consumableStatus(currentQty, safetyQty),
    },
  });
  return item as unknown as ConsumableItem;
}

export async function consumableTxn(
  itemId: string, type: "in" | "out" | "adjust", qty: number,
): Promise<{ item: ConsumableItem } | { error: string }> {
  // 재고 조회 → 검증 → 갱신을 한 트랜잭션(Serializable)으로 묶는다.
  // 두 사람이 동시에 출고하면 각자 옛 재고를 보고 검증을 통과해 재고가 음수가 될 수 있다.
  // 홍보물품 수불(promoTxn)과 같은 격리 수준을 쓴다.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.consumableItem.findUnique({ where: { id: itemId } });
      if (!item) throw new Error("품목을 찾을 수 없습니다.");
      let currentQty = item.currentQty;
      const data: { currentQty: number; status: string; lastInboundAt?: string; lastOutboundAt?: string } = { currentQty, status: item.status };
      if (type === "in") { currentQty += qty; data.lastInboundAt = todayKst(); }
      else if (type === "out") {
        if (qty > currentQty) throw new Error(`현재 재고(${currentQty}${item.unit})보다 많은 수량은 출고할 수 없습니다.`);
        currentQty -= qty; data.lastOutboundAt = todayKst();
      } else currentQty = qty;
      data.currentQty = currentQty;
      data.status = consumableStatus(currentQty, item.safetyQty);
      return tx.consumableItem.update({ where: { id: itemId }, data });
    }, { isolationLevel: "Serializable" });
    return { item: updated as unknown as ConsumableItem };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "재고 처리 중 오류가 발생했습니다." };
  }
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
      status, userName: n.holder ?? null, loanedAt: n.holder ? todayKst() : null, dueAt: null, returnedAt: null, note: null, isNotebook: true,
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
    data: { id: uid(), name: input.name.trim(), email: input.email.trim(), password: await hashPassword(input.password), role: input.role, permissions: input.permissions, active: input.active, createdAt: nowIso() },
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
      ...(input.password && input.password.length >= 4 ? { password: await hashPassword(input.password) } : {}),
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
  if (!account) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };

  const check = await verifyPassword(password, account.password);
  if (!check.ok) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };

  // 평문으로 저장돼 있던 계정 — 로그인에 성공한 지금 해시로 교체한다(점진 전환).
  // 교체에 실패해도 로그인 자체는 막지 않는다(다음 로그인에서 다시 시도된다).
  if (check.needsUpgrade) {
    try {
      const hashed = await hashPassword(password);
      await prisma.account.update({ where: { id: account.id }, data: { password: hashed } });
      account.password = hashed;
    } catch (e) {
      console.error("[login] 비밀번호 해시 전환 실패", e);
    }
  }

  if (!account.active) return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
  if (account.permissions.length === 0) return { error: "접근 가능한 메뉴가 없습니다. 관리자에게 권한을 요청하세요." };
  return account;
}

export async function getAccountById(id: string): Promise<Account | undefined> {
  return (await prisma.account.findUnique({ where: { id } })) ?? undefined;
}

// ─── 앱 설정 ───
export async function updateAppSettings(entries: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

// ═══════════════════════ 홍보물품 ═══════════════════════
import type { PromoItem, PromoTxn, PromoRequest } from "@/types";

// 정상 수불의 합으로 현재 재고 계산 (트랜잭션 내에서 재확인용)
// 재고 = 모든 수불 기록의 direction*qty 합.
// 취소는 반대 방향의 보정 기록으로 반영되므로 status(취소됨)는 표시용일 뿐 합계에서 제외하지 않는다
// (제외하면 보정 기록과 이중 반영되어 재고가 틀어진다).
async function promoBalance(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], itemId: string): Promise<number> {
  const rows = await tx.promoTxn.findMany({ where: { itemId }, select: { qty: true, direction: true } });
  return rows.reduce((s, r) => s + r.direction * r.qty, 0);
}

export interface PromoItemInput {
  code: string; name: string; category?: string | null; spec?: string | null; unit?: string;
  location?: string | null; manager?: string | null; vendor?: string | null; purchasedAt?: string | null;
  unitPrice?: number; safetyQty?: number; docNo?: string | null; note?: string | null;
}

export async function createPromoItem(input: PromoItemInput): Promise<PromoItem | { error: string }> {
  if (!input.code.trim()) return { error: "구분코드를 입력해주세요." };
  if (!input.name.trim()) return { error: "물품명을 입력해주세요." };
  if (await prisma.promoItem.findUnique({ where: { code: input.code.trim() } })) return { error: `이미 존재하는 구분코드입니다 (${input.code}).` };
  const ts = nowIso();
  return prisma.promoItem.create({
    data: {
      id: uid(), code: input.code.trim(), name: input.name.trim(),
      category: input.category || null, spec: input.spec || null, unit: input.unit || "개",
      location: input.location || null, manager: input.manager || null, vendor: input.vendor || null,
      purchasedAt: input.purchasedAt || null, unitPrice: input.unitPrice ?? 0, safetyQty: input.safetyQty ?? 0,
      docNo: input.docNo || null, note: input.note || null, totalAmount: 0, status: "사용", createdAt: ts, updatedAt: ts,
    },
  }) as unknown as PromoItem;
}

export async function updatePromoItem(id: string, input: PromoItemInput): Promise<PromoItem | { error: string }> {
  const item = await prisma.promoItem.findUnique({ where: { id } });
  if (!item) return { error: "물품을 찾을 수 없습니다." };
  if (await prisma.promoItem.findFirst({ where: { code: input.code.trim(), id: { not: id } } })) return { error: `이미 존재하는 구분코드입니다 (${input.code}).` };
  return prisma.promoItem.update({
    where: { id },
    data: {
      code: input.code.trim(), name: input.name.trim(),
      category: input.category || null, spec: input.spec || null, unit: input.unit || "개",
      location: input.location || null, manager: input.manager || null, vendor: input.vendor || null,
      purchasedAt: input.purchasedAt || null, unitPrice: input.unitPrice ?? 0, safetyQty: input.safetyQty ?? 0,
      docNo: input.docNo || null, note: input.note || null, updatedAt: nowIso(),
    },
  }) as unknown as PromoItem;
}

export async function setPromoItemStatus(id: string, status: "사용" | "사용중지"): Promise<{ ok: true } | { error: string }> {
  const item = await prisma.promoItem.findUnique({ where: { id } });
  if (!item) return { error: "물품을 찾을 수 없습니다." };
  if (status === "사용중지") {
    const txnCount = await prisma.promoTxn.count({ where: { itemId: id } });
    if (txnCount === 0) {
      // 수불내역이 없으면 완전 삭제 허용
      await prisma.promoItem.delete({ where: { id } });
      return { ok: true };
    }
  }
  await prisma.promoItem.update({ where: { id }, data: { status, updatedAt: nowIso() } });
  return { ok: true };
}

export interface PromoTxnInput {
  itemId: string;
  date: string;
  type: string; // PROMO_IN_TYPES | PROMO_OUT_TYPES
  qty: number;
  purpose?: string | null;
  eventName?: string | null;
  takerName?: string | null;
  receiverName?: string | null;
  manager?: string | null;
  docNo?: string | null;
  unitPrice?: number | null;
  createdBy?: string | null;
}

const IN_TYPES = new Set(["최초입고", "추가입고", "반납", "회수", "조정증가", "기타입고", "출고취소"]);
const OUT_TYPES = new Set(["출고", "폐기", "분실", "조정감소", "입고취소"]);

/** 입고/출고/조정 공통 — 직렬화 트랜잭션으로 동시 출고 시 음수 재고 방지 */
export async function promoTxn(input: PromoTxnInput): Promise<PromoTxn | { error: string }> {
  if (!Number.isInteger(input.qty) || input.qty <= 0) return { error: "수량은 1 이상의 정수여야 합니다." };
  if (!input.date) return { error: "처리일자를 입력해주세요." };
  const direction = IN_TYPES.has(input.type) ? 1 : OUT_TYPES.has(input.type) ? -1 : 0;
  if (direction === 0) return { error: `알 수 없는 수불 유형입니다 (${input.type}).` };

  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.promoItem.findUnique({ where: { id: input.itemId } });
      if (!item) throw new Error("물품을 찾을 수 없습니다.");
      if (item.status === "사용중지" && direction < 0) throw new Error("사용 중지된 물품은 출고할 수 없습니다.");
      const balance = await promoBalance(tx, input.itemId);
      const after = balance + direction * input.qty;
      if (after < 0) throw new Error(`출고수량이 현재 재고보다 많습니다. 현재 출고 가능한 수량은 ${balance}${item.unit}입니다.`);
      const amount = input.unitPrice ? input.unitPrice * input.qty : null;
      const created = await tx.promoTxn.create({
        data: {
          id: uid(), itemId: input.itemId, date: input.date, type: input.type, qty: input.qty, direction,
          balanceAfter: after, purpose: input.purpose || null, eventName: input.eventName || null,
          takerName: input.takerName || null, receiverName: input.receiverName || null,
          manager: input.manager || null, docNo: input.docNo || null,
          unitPrice: input.unitPrice ?? null, amount, status: "정상",
          createdBy: input.createdBy || null, createdAt: nowIso(),
        },
      });
      if (direction > 0 && amount) {
        await tx.promoItem.update({ where: { id: item.id }, data: { totalAmount: item.totalAmount + amount, updatedAt: nowIso() } });
      }
      return created as unknown as PromoTxn;
    }, { isolationLevel: "Serializable" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "처리 중 오류가 발생했습니다." };
  }
}

/** 수불내역 취소 — 삭제 대신 보정 내역을 추가하고 원본을 취소됨으로 표시 */
export async function cancelPromoTxn(txnId: string, reason: string, by?: string | null): Promise<{ ok: true } | { error: string }> {
  if (!reason.trim()) return { error: "취소 사유를 입력해주세요." };
  try {
    await prisma.$transaction(async (tx) => {
      const orig = await tx.promoTxn.findUnique({ where: { id: txnId } });
      if (!orig) throw new Error("수불내역을 찾을 수 없습니다.");
      if (orig.status !== "정상") throw new Error("이미 취소된 내역입니다.");
      if (orig.type === "출고취소" || orig.type === "입고취소") throw new Error("취소 내역은 다시 취소할 수 없습니다.");
      const balance = await promoBalance(tx, orig.itemId);
      const after = balance - orig.direction * orig.qty; // 원본 효과 제거
      if (after < 0) throw new Error("취소 시 재고가 음수가 됩니다. 이후 출고 내역을 먼저 취소해주세요.");
      await tx.promoTxn.update({ where: { id: txnId }, data: { status: "취소됨", cancelReason: reason.trim() } });
      await tx.promoTxn.create({
        data: {
          id: uid(), itemId: orig.itemId, date: todayKst(), type: orig.direction > 0 ? "입고취소" : "출고취소",
          qty: orig.qty, direction: -orig.direction, balanceAfter: after,
          purpose: `취소: ${orig.type} ${orig.qty}건 (${reason.trim()})`, cancelOfId: orig.id,
          status: "정상", createdBy: by || null, createdAt: nowIso(),
        },
      });
    }, { isolationLevel: "Serializable" });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "취소 중 오류가 발생했습니다." };
  }
}

/** 재고 실사 조정 — 실제 수량 입력 → 차이만큼 조정증가/감소 수불 기록 */
export async function adjustPromoStock(
  itemId: string, actualQty: number, reason: string, by?: string | null
): Promise<{ ok: true; diff: number } | { error: string }> {
  if (!Number.isInteger(actualQty) || actualQty < 0) return { error: "실제 재고는 0 이상의 정수여야 합니다." };
  if (!reason.trim()) return { error: "조정 사유를 입력해주세요." };
  const balance = await prisma.promoTxn
    .findMany({ where: { itemId }, select: { qty: true, direction: true } })
    .then((rows) => rows.reduce((s, r) => s + r.direction * r.qty, 0));
  const diff = actualQty - balance;
  if (diff === 0) return { error: "시스템 재고와 실제 재고가 같아 조정할 내용이 없습니다." };
  const result = await promoTxn({
    itemId, date: todayKst(), type: diff > 0 ? "조정증가" : "조정감소", qty: Math.abs(diff),
    purpose: `재고 실사 조정 (시스템 ${balance} → 실제 ${actualQty}) — ${reason.trim()}`, createdBy: by,
  });
  if ("error" in result) return result;
  return { ok: true, diff };
}

// ─── 출고 신청 흐름 ───
export interface PromoRequestInput {
  itemId: string; qty: number; outType: string; purpose: string;
  eventName?: string | null; eventDate?: string | null;
  requesterName: string; requesterAffiliation?: string | null; requesterPhone?: string | null;
}

export async function createPromoRequest(input: PromoRequestInput): Promise<PromoRequest | { error: string }> {
  if (!Number.isInteger(input.qty) || input.qty <= 0) return { error: "신청 수량은 1 이상의 정수여야 합니다." };
  if (!input.requesterName.trim()) return { error: "신청자 이름을 입력해주세요." };
  if (!input.purpose.trim()) return { error: "사용 목적을 입력해주세요." };
  const item = await prisma.promoItem.findUnique({ where: { id: input.itemId } });
  if (!item) return { error: "물품을 찾을 수 없습니다." };
  if (item.status === "사용중지") return { error: "사용 중지된 물품은 신청할 수 없습니다." };
  const ts = nowIso();
  return prisma.promoRequest.create({
    data: {
      id: uid(), itemId: input.itemId, qty: input.qty, outType: input.outType || "행사 배부",
      purpose: input.purpose.trim(), eventName: input.eventName || null, eventDate: input.eventDate || null,
      requesterName: input.requesterName.trim(), requesterAffiliation: input.requesterAffiliation || null,
      requesterPhone: input.requesterPhone || null, status: "신청", createdAt: ts, updatedAt: ts,
    },
  }) as unknown as PromoRequest;
}

export async function decidePromoRequest(
  id: string, decision: "승인" | "반려" | "취소", managerName?: string | null, rejectReason?: string | null,
  // 지정 시 해당 이름의 신청만 취소 허용(비관리자 본인 확인용). undefined면 소유자 검증 생략(관리자).
  ownerName?: string | null
): Promise<{ ok: true } | { error: string }> {
  const req = await prisma.promoRequest.findUnique({ where: { id } });
  if (!req) return { error: "신청을 찾을 수 없습니다." };
  if (ownerName !== undefined && ownerName !== null && req.requesterName !== ownerName) {
    return { error: "본인이 신청한 건만 취소할 수 있습니다." };
  }
  if (decision === "승인") {
    if (req.status !== "신청") return { error: `'신청' 상태에서만 승인할 수 있습니다 (현재: ${req.status}).` };
    // 승인 = 사용 가능 수량 예약. 가용 수량 확인
    const [balanceRows, approved] = await Promise.all([
      prisma.promoTxn.findMany({ where: { itemId: req.itemId }, select: { qty: true, direction: true } }),
      prisma.promoRequest.aggregate({ _sum: { qty: true }, where: { itemId: req.itemId, status: "승인" } }),
    ]);
    const balance = balanceRows.reduce((s, r) => s + r.direction * r.qty, 0);
    const available = balance - (approved._sum.qty ?? 0);
    if (req.qty > available) return { error: `사용 가능 수량(${available})을 초과합니다. (재고 ${balance}, 출고 예정 ${approved._sum.qty ?? 0})` };
  }
  if (decision === "반려" && !rejectReason?.trim()) return { error: "반려 사유를 입력해주세요." };
  if (decision === "취소" && !["신청", "승인"].includes(req.status)) return { error: "신청/승인 상태에서만 취소할 수 있습니다." };
  await prisma.promoRequest.update({
    where: { id },
    data: { status: decision, managerName: managerName || req.managerName, rejectReason: rejectReason?.trim() || null, updatedAt: nowIso() },
  });
  return { ok: true };
}

/** 승인된 신청을 실제 출고 처리(재고 차감 + 수불 기록 + 신청 연결) */
export async function completePromoRequest(id: string, managerName?: string | null): Promise<{ ok: true } | { error: string }> {
  const req = await prisma.promoRequest.findUnique({ where: { id } });
  if (!req) return { error: "신청을 찾을 수 없습니다." };
  if (req.status !== "승인") return { error: `승인된 신청만 출고 처리할 수 있습니다 (현재: ${req.status}).` };
  const txn = await promoTxn({
    itemId: req.itemId, date: todayKst(), type: "출고", qty: req.qty,
    purpose: `[${req.outType}] ${req.purpose}`, eventName: req.eventName,
    takerName: req.requesterName, receiverName: req.requesterAffiliation, manager: managerName,
    createdBy: managerName,
  });
  if ("error" in txn) return txn;
  await prisma.promoRequest.update({ where: { id }, data: { status: "출고완료", txnId: txn.id, managerName: managerName || req.managerName, updatedAt: nowIso() } });
  return { ok: true };
}
