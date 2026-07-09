import type {
  Asset, AssetStatus, ConsumableItem, LaptopLoan, LoanStatus, Seat, TagStatus, UsageType,
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

// ─── 노트북 대여 ───
export function loanLaptop(loanId: string, userName: string, dueAt: string | null): LaptopLoan | null {
  const loan = dataset.laptopLoans.find((l) => l.id === loanId);
  if (!loan) return null;
  loan.status = "대여중";
  loan.userName = userName;
  loan.loanedAt = TODAY;
  loan.dueAt = dueAt;
  loan.returnedAt = null;
  const asset = dataset.assets.find((a) => a.id === loan.assetId);
  if (asset) {
    asset.assetStatus = "대여중";
    asset.currentUserName = userName;
    asset.updatedAt = nowIso();
  }
  return loan;
}

export function returnLaptop(loanId: string, afterStatus: LoanStatus, damaged: boolean): LaptopLoan | null {
  const loan = dataset.laptopLoans.find((l) => l.id === loanId);
  if (!loan) return null;
  loan.status = afterStatus;
  loan.userName = null;
  loan.dueAt = null;
  loan.returnedAt = TODAY;
  if (damaged) loan.note = "반납 시 손상 확인";
  const asset = dataset.assets.find((a) => a.id === loan.assetId);
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
