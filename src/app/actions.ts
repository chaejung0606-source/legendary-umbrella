"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createAsset, updateAsset, moveAsset, loanAsset, returnAsset, consumableTxn, commitImport,
  addMajorCategory, updateMajorCategory, deleteMajorCategory,
  addMiddleCategory, updateMiddleCategory, deleteMiddleCategory,
  addBuilding, updateBuilding, deleteBuilding,
  createAccount, updateAccount, deleteAccount, updateAppSettings,
  createPromoItem, updatePromoItem, setPromoItemStatus, promoTxn, cancelPromoTxn, adjustPromoStock,
  createPromoRequest, decidePromoRequest, completePromoRequest,
  type AssetInput, type ImportCommitPayload, type AccountInput, type LoanInput, type ReturnInput,
  type PromoItemInput, type PromoTxnInput, type PromoRequestInput,
} from "@/data/mutations";
import { getLaptopLoans } from "@/data";
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
