"use server";
import { revalidatePath } from "next/cache";
import type { LoanStatus } from "@/types";
import {
  createAsset, updateAsset, moveAsset, loanAsset, returnAsset, consumableTxn, commitImport,
  addMajorCategory, updateMajorCategory, deleteMajorCategory,
  addMiddleCategory, updateMiddleCategory, deleteMiddleCategory,
  addBuilding, updateBuilding, deleteBuilding,
  createAccount, updateAccount, deleteAccount,
  type AssetInput, type ImportCommitPayload, type AccountInput,
} from "@/data/mutations";

// 인메모리 데이터셋을 변경하는 서버 액션.
// 성공 시 전체 경로를 재검증해 대시보드 지표까지 즉시 반영한다.

type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function createAssetAction(
  input: AssetInput
): Promise<ActionResult<{ id: string; managementNo: string | null }>> {
  if (!input.itemName?.trim()) return { ok: false, error: "품명은 필수입니다." };
  const asset = createAsset(input);
  refreshAll();
  return { ok: true, id: asset.id, managementNo: asset.lockedManagementNo };
}

export async function updateAssetAction(
  id: string,
  input: AssetInput
): Promise<ActionResult<{ id: string; managementNo: string | null }>> {
  const asset = updateAsset(id, input);
  if (!asset) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true, id: asset.id, managementNo: asset.lockedManagementNo };
}

export async function moveAssetAction(
  id: string,
  move: { place: string; roomName?: string | null; userName?: string | null; note?: string | null }
): Promise<ActionResult> {
  if (!move.place?.trim()) return { ok: false, error: "이동할 장소를 입력해주세요." };
  const asset = moveAsset(id, move);
  if (!asset) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

export async function loanAssetAction(
  assetId: string,
  userName: string,
  dueAt: string | null
): Promise<ActionResult> {
  if (!userName?.trim()) return { ok: false, error: "사용자 이름을 입력해주세요." };
  const loan = loanAsset(assetId, userName.trim(), dueAt);
  if (!loan) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

export async function returnAssetAction(
  assetId: string,
  afterStatus: LoanStatus,
  damaged: boolean
): Promise<ActionResult> {
  const loan = returnAsset(assetId, afterStatus, damaged);
  if (!loan) return { ok: false, error: "자산을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

export async function consumableTxnAction(
  itemId: string,
  type: "in" | "out" | "adjust",
  qty: number
): Promise<ActionResult> {
  if (!Number.isFinite(qty) || qty < 0 || (type !== "adjust" && qty === 0)) {
    return { ok: false, error: "수량을 올바르게 입력해주세요." };
  }
  const result = consumableTxn(itemId, type, Math.round(qty));
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
  const counts = commitImport(payload);
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
  return wrap(addMajorCategory({ code, name }));
}
export async function updateMajorAction(id: string, code: number, name: string): Promise<ActionResult> {
  return wrap(updateMajorCategory(id, { code, name }));
}
export async function deleteMajorAction(id: string): Promise<ActionResult> {
  return wrap(deleteMajorCategory(id));
}
export async function addMiddleAction(majorId: string, code: number, name: string, detailItems: string): Promise<ActionResult> {
  return wrap(addMiddleCategory(majorId, { code, name, detailItems }));
}
export async function updateMiddleAction(id: string, code: number, name: string, detailItems: string): Promise<ActionResult> {
  return wrap(updateMiddleCategory(id, { code, name, detailItems }));
}
export async function deleteMiddleAction(id: string): Promise<ActionResult> {
  return wrap(deleteMiddleCategory(id));
}

// ─── 기준정보: 건축물 코드 ───
export async function addBuildingAction(code: string, name: string, campus: string): Promise<ActionResult> {
  return wrap(addBuilding({ code, name, campus }));
}
export async function updateBuildingAction(id: string, code: string, name: string, campus: string): Promise<ActionResult> {
  return wrap(updateBuilding(id, { code, name, campus }));
}
export async function deleteBuildingAction(id: string): Promise<ActionResult> {
  return wrap(deleteBuilding(id));
}

// ─── 계정 / 권한 ───
export async function createAccountAction(input: AccountInput): Promise<ActionResult> {
  return wrap(createAccount(input));
}
export async function updateAccountAction(id: string, input: AccountInput): Promise<ActionResult> {
  return wrap(updateAccount(id, input));
}
export async function deleteAccountAction(id: string): Promise<ActionResult> {
  return wrap(deleteAccount(id));
}
