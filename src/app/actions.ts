"use server";
import { revalidatePath } from "next/cache";
import type { LoanStatus } from "@/types";
import {
  createAsset, updateAsset, moveAsset, loanLaptop, returnLaptop, consumableTxn, commitImport,
  type AssetInput, type ImportCommitPayload,
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

export async function loanLaptopAction(
  loanId: string,
  userName: string,
  dueAt: string | null
): Promise<ActionResult> {
  if (!userName?.trim()) return { ok: false, error: "사용자 이름을 입력해주세요." };
  const loan = loanLaptop(loanId, userName.trim(), dueAt);
  if (!loan) return { ok: false, error: "대여 항목을 찾을 수 없습니다." };
  refreshAll();
  return { ok: true };
}

export async function returnLaptopAction(
  loanId: string,
  afterStatus: LoanStatus,
  damaged: boolean
): Promise<ActionResult> {
  const loan = returnLaptop(loanId, afterStatus, damaged);
  if (!loan) return { ok: false, error: "대여 항목을 찾을 수 없습니다." };
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
