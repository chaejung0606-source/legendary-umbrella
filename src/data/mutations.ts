import type {
  Asset, AssetStatus, ConsumableItem, LaptopLoan, LoanStatus, Seat, TagStatus, UsageType,
  Account, AssetMajorCategory, AssetMiddleCategory, Building,
} from "@/types";
import { USAGE_TYPES } from "@/types";
import { dataset } from "./index";
import { TODAY } from "./pools";
import { generateManagementNumber } from "@/lib/management-number";
import { classifyUsage } from "@/lib/usage";

// 인메모리 데이터셋에 대한 변경 계층. 서버 액션에서만 호출한다.
// Prisma 연동 시 이 모듈의 함수 본문만 DB 쿼리로 교체하면 된다.

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUsage(value: string | null | undefined): UsageType {
  const compact = (value ?? "").replace(/\s+/g, "");
  return (USAGE_TYPES as readonly string[]).includes(compact) ? (compact as UsageType) : "미확인";
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
  usageRaw?: string | null; // 사용처 자유 텍스트 → 분류
  schoolRfidNo?: string | null;
  tagStatus: TagStatus | "미지정";
  memo?: string | null;
}

function applyUsage(asset: Asset, usageRaw: string | null | undefined) {
  const usage = classifyUsage(usageRaw);
  asset.usageType = normalizeUsage(usage.usageType);
  asset.currentUserName = usage.assigneeName && usage.assigneeName.length > 1 ? usage.assigneeName : null;
  asset.currentLocationNote =
    usage.assigneeName && usage.assigneeName.length === 1 ? `${usage.assigneeName}좌석` : usageRaw?.trim() || null;
}

export function createAsset(input: AssetInput): Asset {
  const serial = Math.max(0, ...dataset.assets.map((a) => a.legacyRowNo ?? 0)) + 1;
  const generated = generateManagementNumber({
    serialNo: serial,
    acquiredAt: input.acquiredDate,
    classificationCode: input.classificationCode,
    itemNo: input.sequenceNo,
    buildingCode: input.buildingCode ?? null,
  });
  const ts = nowIso();
  const asset: Asset = {
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
    usageType: "미확인",
    currentUserName: null,
    currentLocationNote: null,
    tagStatus: input.tagStatus,
    assetStatus: "정상",
    memo: input.memo ?? null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  applyUsage(asset, input.usageRaw);
  dataset.assets.push(asset);
  return asset;
}

export function updateAsset(id: string, input: AssetInput): Asset | null {
  const asset = dataset.assets.find((a) => a.id === id);
  if (!asset) return null;
  asset.expenditureDocument = input.expenditureDocument ?? null;
  asset.managingOrganization = input.managingOrganization ?? null;
  asset.itemName = input.itemName;
  asset.specification = input.specification ?? null;
  asset.majorCategory = input.majorCategory;
  asset.middleCategory = input.middleCategory;
  asset.classificationCode = input.classificationCode;
  asset.acquiredDate = input.acquiredDate;
  asset.unitPrice = input.unitPrice;
  asset.sequenceNo = input.sequenceNo;
  asset.buildingCode = input.buildingCode ?? null;
  asset.place = input.place ?? null;
  asset.roomName = input.roomName ?? null;
  asset.schoolRfidNo = input.schoolRfidNo || null;
  asset.tagStatus = input.tagStatus;
  asset.memo = input.memo ?? null;
  // 보존 관리번호(lockedManagementNo)는 원본 그대로 두고 계산값만 갱신한다.
  asset.generatedManagementNo = generateManagementNumber({
    serialNo: asset.legacyRowNo ?? null,
    acquiredAt: input.acquiredDate,
    classificationCode: input.classificationCode,
    itemNo: input.sequenceNo,
    buildingCode: input.buildingCode ?? null,
  });
  applyUsage(asset, input.usageRaw);
  asset.updatedAt = nowIso();
  return asset;
}

export function moveAsset(
  id: string,
  move: { place: string; roomName?: string | null; userName?: string | null; note?: string | null }
): Asset | null {
  const asset = dataset.assets.find((a) => a.id === id);
  if (!asset) return null;
  asset.place = move.place;
  asset.roomName = move.roomName || null;
  if (move.userName !== undefined) asset.currentUserName = move.userName || null;
  if (move.note) asset.memo = [asset.memo, `[이동 ${TODAY}] ${move.note}`].filter(Boolean).join("\n");
  asset.updatedAt = nowIso();
  return asset;
}

// ─── 대여 (노트북 포함 전체 자산) ───
// 자산 단위로 동작한다. 대여 기록이 없는 일반 자산은 즉석에서 생성한다.
function ensureLoan(assetId: string): LaptopLoan | null {
  const asset = dataset.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  let loan = dataset.laptopLoans.find((l) => l.assetId === assetId);
  if (!loan) {
    loan = {
      id: `loan-${asset.id}`,
      assetId: asset.id,
      managementNo: asset.lockedManagementNo ?? asset.generatedManagementNo ?? "",
      itemName: asset.itemName,
      status: "보관",
      userName: null,
      loanedAt: null,
      dueAt: null,
      returnedAt: null,
      note: null,
      isNotebook: false,
    };
    dataset.laptopLoans.push(loan);
  }
  return loan;
}

export function loanAsset(assetId: string, userName: string, dueAt: string | null): LaptopLoan | null {
  const loan = ensureLoan(assetId);
  if (!loan) return null;
  loan.status = "대여중";
  loan.userName = userName;
  loan.loanedAt = TODAY;
  loan.dueAt = dueAt;
  loan.returnedAt = null;
  const asset = dataset.assets.find((a) => a.id === assetId);
  if (asset) {
    asset.assetStatus = "대여중";
    asset.currentUserName = userName;
    asset.updatedAt = nowIso();
  }
  return loan;
}

export function returnAsset(assetId: string, afterStatus: LoanStatus, damaged: boolean): LaptopLoan | null {
  const loan = ensureLoan(assetId);
  if (!loan) return null;
  loan.status = afterStatus;
  loan.userName = null;
  loan.dueAt = null;
  loan.returnedAt = TODAY;
  if (damaged) loan.note = "반납 시 손상 확인";
  const asset = dataset.assets.find((a) => a.id === assetId);
  if (asset) {
    const map: Partial<Record<LoanStatus, AssetStatus>> = {
      보관: "보관중", 수리: "수리중", 분실: "분실", 폐기: "폐기예정",
    };
    asset.assetStatus = map[afterStatus] ?? "보관중";
    asset.currentUserName = null;
    asset.updatedAt = nowIso();
  }
  return loan;
}

// ─── 소모품 입출고/조정 ───
function consumableStatus(item: ConsumableItem): ConsumableItem["status"] {
  if (item.currentQty === 0) return "소진";
  if (item.currentQty < item.safetyQty) return "부족";
  return "정상";
}

export function consumableTxn(
  itemId: string,
  type: "in" | "out" | "adjust",
  qty: number,
): { item: ConsumableItem } | { error: string } {
  const item = dataset.consumables.find((c) => c.id === itemId);
  if (!item) return { error: "품목을 찾을 수 없습니다." };
  if (type === "in") {
    item.currentQty += qty;
    item.lastInboundAt = TODAY;
  } else if (type === "out") {
    if (qty > item.currentQty) return { error: `현재 재고(${item.currentQty}${item.unit})보다 많은 수량은 출고할 수 없습니다.` };
    item.currentQty -= qty;
    item.lastOutboundAt = TODAY;
  } else {
    item.currentQty = qty;
  }
  item.status = consumableStatus(item);
  return { item };
}

// ─── 엑셀 가져오기 반영 ───
// 클라이언트에서 실제 파싱한 결과를 받아 원장을 교체한다 (초기 데이터 가져오기 의미).
export interface ImportCommitPayload {
  fileName: string;
  assets: Asset[];
  consumables?: ConsumableItem[];
  seats?: Seat[];
  notebooks?: { managementNo: string; status: string; holder: string | null }[];
}

export function commitImport(payload: ImportCommitPayload): { assets: number; consumables: number; seats: number; loans: number } {
  dataset.assets.splice(0, dataset.assets.length, ...payload.assets);

  let consumables = 0;
  if (payload.consumables?.length) {
    dataset.consumables.splice(0, dataset.consumables.length, ...payload.consumables);
    consumables = payload.consumables.length;
  }
  let seats = 0;
  if (payload.seats?.length) {
    dataset.seats.splice(0, dataset.seats.length, ...payload.seats);
    seats = payload.seats.length;
  }

  // 노트북 대여 현황: 새 원장의 관리번호와 매칭해 재구성. 시트가 없으면
  // 기존 대여 목록 중 새 원장에 존재하는 관리번호만 유지한다.
  const byMgmt = new Map(payload.assets.filter((a) => a.lockedManagementNo).map((a) => [a.lockedManagementNo!, a]));
  let loans: LaptopLoan[];
  if (payload.notebooks?.length) {
    loans = payload.notebooks.flatMap((n, i) => {
      const asset = byMgmt.get(n.managementNo);
      if (!asset) return [];
      const status: LoanStatus = n.status === "직원사용" ? "직원사용" : "보관";
      return [{
        id: `loan-${asset.id}`, assetId: asset.id, managementNo: n.managementNo,
        itemName: `사업단 노트북 #${i + 1}`, status, userName: n.holder,
        loanedAt: n.holder ? TODAY : null, dueAt: null, returnedAt: null, note: null,
      }];
    });
  } else {
    loans = dataset.laptopLoans.flatMap((l) => {
      const asset = byMgmt.get(l.managementNo);
      return asset ? [{ ...l, assetId: asset.id }] : [];
    });
  }
  dataset.laptopLoans.splice(0, dataset.laptopLoans.length, ...loans);

  // 대여/사용 중인 노트북은 자산 상태에도 반영
  for (const loan of loans) {
    if (loan.status !== "직원사용" && loan.status !== "대여중") continue;
    const asset = byMgmt.get(loan.managementNo);
    if (asset) {
      asset.assetStatus = "대여중";
      asset.currentUserName = loan.userName ?? null;
    }
  }

  dataset.importJob.fileName = payload.fileName;
  dataset.importJob.status = "committed";

  return { assets: payload.assets.length, consumables, seats, loans: loans.length };
}

// ─── 기준정보: 자산분류(대분류/중분류) — 관리번호 분류코드의 로우데이터 ───
function slug(prefix: string): string {
  // Date.now/Math.random 불가 → 데이터셋 길이 기반 단조 증가 id
  return `${prefix}-${dataset.categories.reduce((n, c) => n + 1 + c.middles.length, 0)}-${dataset.buildings.length}`;
}

export function addMajorCategory(input: { code: number; name: string }): AssetMajorCategory | { error: string } {
  if (!input.name.trim()) return { error: "대분류명을 입력해주세요." };
  if (!Number.isFinite(input.code)) return { error: "대분류 코드는 숫자여야 합니다." };
  if (dataset.categories.some((c) => c.code === input.code)) return { error: `이미 존재하는 대분류 코드입니다 (${input.code}).` };
  const major: AssetMajorCategory = { id: `maj-${input.code}-${slug("m")}`, code: input.code, name: input.name.trim(), middles: [] };
  dataset.categories.push(major);
  dataset.categories.sort((a, b) => a.code - b.code);
  return major;
}

export function updateMajorCategory(id: string, input: { code: number; name: string }): AssetMajorCategory | { error: string } {
  const major = dataset.categories.find((c) => c.id === id);
  if (!major) return { error: "대분류를 찾을 수 없습니다." };
  if (dataset.categories.some((c) => c.id !== id && c.code === input.code)) return { error: `이미 존재하는 대분류 코드입니다 (${input.code}).` };
  major.code = input.code;
  major.name = input.name.trim();
  return major;
}

export function deleteMajorCategory(id: string): { ok: true } | { error: string } {
  const idx = dataset.categories.findIndex((c) => c.id === id);
  if (idx < 0) return { error: "대분류를 찾을 수 없습니다." };
  const inUse = dataset.assets.some((a) => a.majorCategory === dataset.categories[idx].name);
  if (inUse) return { error: "이 대분류를 사용하는 자산이 있어 삭제할 수 없습니다." };
  dataset.categories.splice(idx, 1);
  return { ok: true };
}

export function addMiddleCategory(majorId: string, input: { code: number; name: string; detailItems?: string }): AssetMiddleCategory | { error: string } {
  const major = dataset.categories.find((c) => c.id === majorId);
  if (!major) return { error: "대분류를 먼저 선택해주세요." };
  if (!input.name.trim()) return { error: "중분류명을 입력해주세요." };
  if (!Number.isFinite(input.code)) return { error: "분류코드는 숫자여야 합니다." };
  const middle: AssetMiddleCategory = {
    id: `mid-${input.code}-${slug("d")}`,
    code: input.code,
    name: input.name.trim(),
    majorId: major.id,
    detailItems: input.detailItems?.split(",").map((s) => s.trim()).filter(Boolean),
  };
  major.middles.push(middle);
  return middle;
}

export function updateMiddleCategory(id: string, input: { code: number; name: string; detailItems?: string }): AssetMiddleCategory | { error: string } {
  for (const major of dataset.categories) {
    const middle = major.middles.find((m) => m.id === id);
    if (middle) {
      middle.code = input.code;
      middle.name = input.name.trim();
      middle.detailItems = input.detailItems?.split(",").map((s) => s.trim()).filter(Boolean);
      return middle;
    }
  }
  return { error: "중분류를 찾을 수 없습니다." };
}

export function deleteMiddleCategory(id: string): { ok: true } | { error: string } {
  for (const major of dataset.categories) {
    const idx = major.middles.findIndex((m) => m.id === id);
    if (idx >= 0) {
      const inUse = dataset.assets.some((a) => a.middleCategory === major.middles[idx].name);
      if (inUse) return { error: "이 중분류를 사용하는 자산이 있어 삭제할 수 없습니다." };
      major.middles.splice(idx, 1);
      return { ok: true };
    }
  }
  return { error: "중분류를 찾을 수 없습니다." };
}

// ─── 기준정보: 건축물 코드 — 관리번호 건축물코드의 로우데이터 ───
export function addBuilding(input: { code: string; name: string; campus?: string }): Building | { error: string } {
  if (!input.code.trim()) return { error: "건축물코드를 입력해주세요." };
  if (!input.name.trim()) return { error: "건축물명을 입력해주세요." };
  if (dataset.buildings.some((b) => b.code === input.code.trim())) return { error: `이미 존재하는 건축물코드입니다 (${input.code}).` };
  const building: Building = { id: `b-${input.code.trim()}`, code: input.code.trim(), name: input.name.trim(), campus: input.campus?.trim() || "강원대학교 춘천캠퍼스" };
  dataset.buildings.push(building);
  return building;
}

export function updateBuilding(id: string, input: { code: string; name: string; campus?: string }): Building | { error: string } {
  const building = dataset.buildings.find((b) => b.id === id);
  if (!building) return { error: "건축물을 찾을 수 없습니다." };
  if (dataset.buildings.some((b) => b.id !== id && b.code === input.code.trim())) return { error: `이미 존재하는 건축물코드입니다 (${input.code}).` };
  building.code = input.code.trim();
  building.name = input.name.trim();
  if (input.campus) building.campus = input.campus.trim();
  return building;
}

export function deleteBuilding(id: string): { ok: true } | { error: string } {
  const idx = dataset.buildings.findIndex((b) => b.id === id);
  if (idx < 0) return { error: "건축물을 찾을 수 없습니다." };
  const inUse = dataset.assets.some((a) => a.buildingCode === dataset.buildings[idx].code);
  if (inUse) return { error: "이 건축물코드를 사용하는 자산이 있어 삭제할 수 없습니다." };
  dataset.buildings.splice(idx, 1);
  return { ok: true };
}

// ─── 계정 / 권한 ───
export interface AccountInput {
  name: string;
  email: string;
  password?: string; // 생성 시 필수, 수정 시 입력하면 변경
  role: string;
  permissions: string[];
  active: boolean;
}

export function createAccount(input: AccountInput): Account | { error: string } {
  if (!input.name.trim()) return { error: "이름을 입력해주세요." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { error: "올바른 이메일 형식이 아닙니다." };
  if (!input.password || input.password.length < 4) return { error: "비밀번호는 4자 이상 입력해주세요." };
  if (dataset.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) return { error: "이미 등록된 이메일입니다." };
  const account: Account = {
    id: `acc-${dataset.accounts.length + 1}-${dataset.accounts.reduce((n, a) => n + a.email.length, 0)}`,
    name: input.name.trim(),
    email: input.email.trim(),
    password: input.password,
    role: input.role,
    permissions: input.permissions,
    active: input.active,
    createdAt: nowIso(),
  };
  dataset.accounts.push(account);
  return account;
}

export function updateAccount(id: string, input: AccountInput): Account | { error: string } {
  const account = dataset.accounts.find((a) => a.id === id);
  if (!account) return { error: "계정을 찾을 수 없습니다." };
  if (dataset.accounts.some((a) => a.id !== id && a.email.toLowerCase() === input.email.toLowerCase())) return { error: "이미 등록된 이메일입니다." };
  account.name = input.name.trim();
  account.email = input.email.trim();
  account.role = input.role;
  account.permissions = input.permissions;
  account.active = input.active;
  if (input.password && input.password.length >= 4) account.password = input.password;
  return account;
}

// 로그인 검증 — 이메일+비밀번호 일치 & 활성 계정
export function verifyLogin(email: string, password: string): Account | { error: string } {
  const account = dataset.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || account.password !== password) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  if (!account.active) return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
  if (account.permissions.length === 0) return { error: "접근 가능한 메뉴가 없습니다. 관리자에게 권한을 요청하세요." };
  return account;
}

export function getAccountById(id: string): Account | undefined {
  return dataset.accounts.find((a) => a.id === id);
}

export function deleteAccount(id: string): { ok: true } | { error: string } {
  const idx = dataset.accounts.findIndex((a) => a.id === id);
  if (idx < 0) return { error: "계정을 찾을 수 없습니다." };
  if (dataset.accounts[idx].role === "admin" && dataset.accounts.filter((a) => a.role === "admin").length <= 1) {
    return { error: "최소 1명의 관리자 계정은 유지해야 합니다." };
  }
  dataset.accounts.splice(idx, 1);
  return { ok: true };
}
