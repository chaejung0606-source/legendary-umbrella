"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createAsset, updateAsset, moveAsset, loanAsset, returnAsset, consumableTxn, commitImport, bulkCreateAssets,
  addMajorCategory, updateMajorCategory, deleteMajorCategory,
  addMiddleCategory, updateMiddleCategory, deleteMiddleCategory,
  addBuilding, updateBuilding, deleteBuilding,
  createAccount, updateAccount, deleteAccount, updateAppSettings,
  createPromoItem, updatePromoItem, setPromoItemStatus, promoTxn, cancelPromoTxn, adjustPromoStock,
  createPromoRequest, decidePromoRequest, completePromoRequest,
  type AssetInput, type ImportCommitPayload, type AccountInput, type LoanInput, type ReturnInput,
  type PromoItemInput, type PromoTxnInput, type PromoRequestInput,
} from "@/data/mutations";
import { getLaptopLoans, getCategories, getBuildings } from "@/data";
import { TAG_STATUSES, type TagStatus } from "@/types";
import { prisma } from "@/lib/prisma";
import { verifySession, SESSION_COOKIE, type SessionPayload } from "@/lib/session";

// 현재 세션 (서버 액션 내 권한 재검증용)
async function currentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
async function requireManager(): Promise<{ session: SessionPayload } | { error: string }> {
  const session = await currentSession();
  if (!session) return { error: "로그인이 필요합니다." };
  if (!["admin", "asset_manager"].includes(session.role)) return { error: "관리자 권한이 필요합니다." };
  return { session };
}

// DB(Postgres)를 변경하는 서버 액션.
// 성공 시 전체 경로를 재검증해 대시보드 지표까지 즉시 반영한다.

type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function createAssetAction(
  input: AssetInput
): Promise<ActionResult<{ id: string; managementNo: string | null }>> {
  if (!input.itemName?.trim()) return { ok: false, error: "품명은 필수입니다." };
  const asset = await createAsset(input);
  refreshAll();
  return { ok: true, id: asset.id, managementNo: asset.lockedManagementNo };
}

export async function updateAssetAction(
  id: string,
  input: AssetInput
): Promise<ActionResult<{ id: string; managementNo: string | null }>> {
  const asset = await updateAsset(id, input);
  if (!asset) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true, id: asset.id, managementNo: asset.lockedManagementNo };
}

// ─── 복수 자산 등록 (엑셀 양식 업로드) ───
// 클라이언트가 파싱한 행을 받아 서버에서 분류·건축물 코드를 검증/해석하고 일괄 등록한다.
export interface BulkAssetRowInput {
  expenditureDocument?: string | null;
  managingOrganization?: string | null;
  majorCategory?: string | null;
  middleCategory?: string | null;
  acquiredDate?: string | null; // YYYY-MM-DD
  itemName: string;
  specification?: string | null;
  unitPrice?: number | null;
  sequenceNo?: number | null;
  place?: string | null;
  roomName?: string | null;
  buildingCode?: string | null;
  usageRaw?: string | null; // 사용처 (예: 방주희 / 사무실 보관 / 대여용)
  schoolRfidNo?: string | null;
  tagStatus?: string | null;
  memo?: string | null;
}

export async function bulkCreateAssetsAction(
  rows: BulkAssetRowInput[]
): Promise<ActionResult<{ created: number; firstNo: string | null; lastNo: string | null }>> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!rows?.length) return { ok: false, error: "등록할 행이 없습니다. 양식에 데이터를 입력했는지 확인해주세요." };
  if (rows.length > 500) return { ok: false, error: "한 번에 최대 500행까지 등록할 수 있습니다." };

  const [categories, buildings] = await Promise.all([getCategories(), getBuildings()]);
  const buildingCodes = new Set(buildings.map((b) => b.code.trim().toUpperCase()));

  const errors: string[] = [];
  const inputs = rows.map((row, i) => {
    const line = i + 2; // 1행은 헤더
    const itemName = (row.itemName ?? "").trim();
    if (!itemName) errors.push(`${line}행: 품명은 필수입니다.`);

    // 중분류명 → 분류코드 (대분류가 있으면 해당 대분류 안에서 우선 탐색)
    const middleName = (row.middleCategory ?? "").trim();
    const majorName = (row.majorCategory ?? "").trim();
    let classificationCode: number | null = null;
    let resolvedMajor = majorName;
    if (middleName) {
      const pool = majorName ? categories.filter((m) => m.name === majorName) : categories;
      const hit = (pool.length ? pool : categories)
        .flatMap((m) => m.middles.map((mid) => ({ major: m.name, mid })))
        .find((x) => x.mid.name === middleName || String(x.mid.code) === middleName);
      if (hit) {
        classificationCode = hit.mid.code;
        resolvedMajor = hit.major;
      } else {
        errors.push(`${line}행: 중분류 '${middleName}' 를 기준정보에서 찾을 수 없습니다.`);
      }
    }

    const buildingCode = (row.buildingCode ?? "").trim().toUpperCase() || null;
    if (buildingCode && !buildingCodes.has(buildingCode)) {
      errors.push(`${line}행: 건축물코드 '${buildingCode}' 가 기준정보에 없습니다.`);
    }

    const acquiredDate = (row.acquiredDate ?? "").trim() || null;
    if (acquiredDate && !/^\d{4}-\d{2}-\d{2}$/.test(acquiredDate)) {
      errors.push(`${line}행: 취득날짜는 YYYY-MM-DD 형식이어야 합니다 (입력값: ${acquiredDate}).`);
    }

    const rawTag = (row.tagStatus ?? "").trim();
    const tagStatus = (TAG_STATUSES as readonly string[]).includes(rawTag) ? (rawTag as TagStatus) : "미지정";

    return {
      expenditureDocument: row.expenditureDocument?.trim() || null,
      managingOrganization: row.managingOrganization?.trim() || null,
      itemName,
      specification: row.specification?.trim() || null,
      majorCategory: resolvedMajor,
      middleCategory: middleName,
      classificationCode,
      acquiredDate,
      unitPrice: Number(row.unitPrice ?? 0) || 0,
      sequenceNo: row.sequenceNo != null && Number.isFinite(Number(row.sequenceNo)) ? Math.round(Number(row.sequenceNo)) : 1,
      buildingCode,
      place: row.place?.trim() || null,
      roomName: row.roomName?.trim() || null,
      usageRaw: row.usageRaw?.trim() || null,
      schoolRfidNo: row.schoolRfidNo?.trim() || null,
      tagStatus: tagStatus as TagStatus | "미지정",
      memo: row.memo?.trim() || null,
    };
  });

  if (errors.length) {
    const head = errors.slice(0, 8).join("\n");
    return { ok: false, error: `${errors.length}건의 오류가 있어 등록하지 않았습니다.\n${head}${errors.length > 8 ? "\n…" : ""}` };
  }

  const result = await bulkCreateAssets(inputs);
  refreshAll();
  return { ok: true, ...result };
}

export async function moveAssetAction(
  id: string,
  move: { place: string; roomName?: string | null; userName?: string | null; note?: string | null }
): Promise<ActionResult> {
  if (!move.place?.trim()) return { ok: false, error: "이동할 장소를 입력해주세요." };
  const asset = await moveAsset(id, move);
  if (!asset) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

export async function loanAssetAction(assetId: string, input: LoanInput): Promise<ActionResult> {
  if (!input.userName?.trim()) return { ok: false, error: "대여자 이름을 입력해주세요." };
  if (!input.dueAt) return { ok: false, error: "반납 예정일을 입력해주세요." };
  const loan = await loanAsset(assetId, { ...input, userName: input.userName.trim() });
  if (!loan) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

export async function returnAssetAction(assetId: string, input: ReturnInput): Promise<ActionResult> {
  if (!input.returnerName?.trim()) return { ok: false, error: "반납자 이름을 입력해주세요." };
  const loan = await returnAsset(assetId, { ...input, returnerName: input.returnerName.trim() });
  if (!loan) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

// 대여 가능 자산 검색 (대여신청서의 자산 선택용)
// 주의: 화면에 보이는 필드(품명·규격·관리번호)만 검색한다 — RFID 등 숨은 필드 매칭으로
// "왜 나왔는지 알 수 없는" 결과가 나오지 않도록 함.
export interface LoanableAsset {
  id: string;
  itemName: string;
  managementNo: string;
  place: string;
}
export async function searchLoanableAssetsAction(q: string): Promise<LoanableAsset[]> {
  const query = q.trim();
  if (!query) return [];
  const [rows, loans] = await Promise.all([
    prisma.asset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { itemName: { contains: query } },
          { specification: { contains: query } },
          { lockedManagementNo: { contains: query } },
          { generatedManagementNo: { contains: query } },
        ],
      },
      orderBy: { legacyRowNo: "asc" },
      take: 12,
    }),
    getLaptopLoans(),
  ]);
  const outIds = new Set(loans.filter((l) => l.status === "대여중" || l.status === "직원사용").map((l) => l.assetId));
  return rows
    .filter((a) => !outIds.has(a.id) && a.assetStatus !== "대여중")
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      itemName: a.specification ? `${a.itemName} (${a.specification})` : a.itemName,
      managementNo: a.lockedManagementNo ?? a.generatedManagementNo ?? "-",
      place: [a.place, a.roomName].filter(Boolean).join(" "),
    }));
}

export async function consumableTxnAction(
  itemId: string,
  type: "in" | "out" | "adjust",
  qty: number
): Promise<ActionResult> {
  if (!Number.isFinite(qty) || qty < 0 || (type !== "adjust" && qty === 0)) {
    return { ok: false, error: "수량을 올바르게 입력해주세요." };
  }
  const result = await consumableTxn(itemId, type, Math.round(qty));
  if ("error" in result) return { ok: false, error: result.error };
  refreshAll();
  return { ok: true };
}

export async function commitImportAction(
  payload: ImportCommitPayload
): Promise<ActionResult<{ assets: number; consumables: number; seats: number; loans: number }>> {
  if (!payload.assets?.length) {
    return { ok: false, error: "가져올 자산 행이 없습니다. '사업단 자산관리 대장' 시트를 확인해주세요." };
  }
  const counts = await commitImport(payload);
  refreshAll();
  return { ok: true, ...counts };
}

// ─── 기준정보: 자산분류 코드 ───
function wrap<T>(result: T | { error: string }): ActionResult {
  if (result && typeof result === "object" && "error" in result) return { ok: false, error: (result as { error: string }).error };
  refreshAll();
  return { ok: true };
}

export async function addMajorAction(code: number, name: string): Promise<ActionResult> {
  return wrap(await addMajorCategory({ code, name }));
}
export async function updateMajorAction(id: string, code: number, name: string): Promise<ActionResult> {
  return wrap(await updateMajorCategory(id, { code, name }));
}
export async function deleteMajorAction(id: string): Promise<ActionResult> {
  return wrap(await deleteMajorCategory(id));
}
export async function addMiddleAction(majorId: string, code: number, name: string, detailItems: string): Promise<ActionResult> {
  return wrap(await addMiddleCategory(majorId, { code, name, detailItems }));
}
export async function updateMiddleAction(id: string, code: number, name: string, detailItems: string): Promise<ActionResult> {
  return wrap(await updateMiddleCategory(id, { code, name, detailItems }));
}
export async function deleteMiddleAction(id: string): Promise<ActionResult> {
  return wrap(await deleteMiddleCategory(id));
}

// ─── 기준정보: 건축물 코드 ───
export async function addBuildingAction(code: string, name: string, campus: string): Promise<ActionResult> {
  return wrap(await addBuilding({ code, name, campus }));
}
export async function updateBuildingAction(id: string, code: string, name: string, campus: string): Promise<ActionResult> {
  return wrap(await updateBuilding(id, { code, name, campus }));
}
export async function deleteBuildingAction(id: string): Promise<ActionResult> {
  return wrap(await deleteBuilding(id));
}

// ─── 계정 / 권한 ───
export async function createAccountAction(input: AccountInput): Promise<ActionResult> {
  return wrap(await createAccount(input));
}
export async function updateAccountAction(id: string, input: AccountInput): Promise<ActionResult> {
  return wrap(await updateAccount(id, input));
}
export async function deleteAccountAction(id: string): Promise<ActionResult> {
  return wrap(await deleteAccount(id));
}

// ─── 앱 설정 (구글시트 URL 등) — 관리자 전용 ───
export async function updateAppSettingsAction(entries: Record<string, string>): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  await updateAppSettings(entries);
  refreshAll();
  return { ok: true };
}

// ═══════════ 홍보물품 ═══════════
export async function createPromoItemAction(input: PromoItemInput): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await createPromoItem(input));
}
export async function updatePromoItemAction(id: string, input: PromoItemInput): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await updatePromoItem(id, input));
}
export async function setPromoItemStatusAction(id: string, status: "사용" | "사용중지"): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await setPromoItemStatus(id, status));
}
export async function promoTxnAction(input: PromoTxnInput): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await promoTxn({ ...input, createdBy: auth.session.name }));
}
export async function cancelPromoTxnAction(txnId: string, reason: string): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await cancelPromoTxn(txnId, reason, auth.session.name));
}
export async function adjustPromoStockAction(itemId: string, actualQty: number, reason: string): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await adjustPromoStock(itemId, actualQty, reason, auth.session.name));
}
// 출고 신청은 로그인한 누구나 (신청자 정보는 폼 입력값 + 세션 기본값)
export async function createPromoRequestAction(input: PromoRequestInput): Promise<ActionResult> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  return wrap(await createPromoRequest(input));
}
export async function decidePromoRequestAction(
  id: string, decision: "승인" | "반려" | "취소", rejectReason?: string
): Promise<ActionResult> {
  // 본인 신청 취소는 일반 사용자도 가능, 승인/반려는 관리자만
  if (decision === "취소") {
    const session = await currentSession();
    if (!session) return { ok: false, error: "로그인이 필요합니다." };
    return wrap(await decidePromoRequest(id, decision, session.name));
  }
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await decidePromoRequest(id, decision, auth.session.name, rejectReason));
}
export async function completePromoRequestAction(id: string): Promise<ActionResult> {
  const auth = await requireManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  return wrap(await completePromoRequest(id, auth.session.name));
}
