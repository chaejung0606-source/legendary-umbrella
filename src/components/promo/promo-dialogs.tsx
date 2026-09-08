"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackagePlus, PackageMinus, ClipboardCheck, FileText, Ban } from "lucide-react";
import type { PromoItemWithStock } from "@/types";
import { PROMO_IN_TYPES, PROMO_OUT_TYPES, PROMO_OUT_PURPOSES } from "@/types";
import { todayKst } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import {
  createPromoItemAction, updatePromoItemAction, promoTxnAction, adjustPromoStockAction,
  cancelPromoTxnAction, createPromoRequestAction, decidePromoRequestAction,
} from "@/app/actions";

type ActionResult = { ok: true } | { ok: false; error: string };

/** 공통: 액션 실행 + 토스트 + 새로고침 훅 */
function useSubmit(onDone: () => void) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<ActionResult>, successTitle: string, successDesc?: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast({ kind: "success", title: successTitle, description: successDesc });
        onDone();
        router.refresh();
      } else {
        toast({ kind: "error", title: "처리 실패", description: result.error });
      }
    });
  return { pending, run };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;

/** 물품 등록/수정 */
export function PromoItemDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item?: PromoItemWithStock | null }) {
  const { pending, run } = useSubmit(onClose);
  const isEdit = !!item;

  function submit(fd: FormData) {
    const input = {
      code: str(fd, "code"), name: str(fd, "name"), category: opt(fd, "category"), spec: opt(fd, "spec"),
      unit: str(fd, "unit") || "개", location: opt(fd, "location"), manager: opt(fd, "manager"),
      vendor: opt(fd, "vendor"), purchasedAt: opt(fd, "purchasedAt"),
      unitPrice: Number(fd.get("unitPrice") ?? 0) || 0, safetyQty: Number(fd.get("safetyQty") ?? 0) || 0,
      docNo: opt(fd, "docNo"), note: opt(fd, "note"),
    };
    run(
      () => (isEdit ? updatePromoItemAction(item.id, input) : createPromoItemAction(input)),
      isEdit ? "물품 수정 완료" : "물품 등록 완료",
      `${input.name} (${input.code})`
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-brand-700" /> 홍보물품 {isEdit ? "수정" : "등록"}</DialogTitle>
          <DialogDescription>재고 수량은 직접 입력하지 않고 입고/출고 기록으로만 계산됩니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="구분코드" required hint="예: P, Q"><Input name="code" required defaultValue={item?.code} placeholder="A" maxLength={8} /></Field>
            <Field label="물품명" required className="col-span-2"><Input name="name" required defaultValue={item?.name} placeholder="예: 곰두리 수건" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="분류"><Input name="category" defaultValue={item?.category ?? "기념품"} /></Field>
            <Field label="규격"><Input name="spec" defaultValue={item?.spec ?? ""} placeholder="예: 40x80cm" /></Field>
            <Field label="단위"><Input name="unit" defaultValue={item?.unit ?? "개"} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="보관장소"><Input name="location" defaultValue={item?.location ?? "집현관 102호"} /></Field>
            <Field label="담당자"><Input name="manager" defaultValue={item?.manager ?? ""} /></Field>
            <Field label="구매처"><Input name="vendor" defaultValue={item?.vendor ?? ""} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="구입일자"><Input name="purchasedAt" type="date" defaultValue={item?.purchasedAt ?? ""} /></Field>
            <Field label="단가(원)"><Input name="unitPrice" type="number" min={0} defaultValue={item?.unitPrice ?? 0} /></Field>
            <Field label="안전재고" hint="이하로 떨어지면 알림"><Input name="safetyQty" type="number" min={0} defaultValue={item?.safetyQty ?? 0} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="지출문서번호"><Input name="docNo" defaultValue={item?.docNo ?? ""} /></Field>
            <Field label="비고"><Input name="note" defaultValue={item?.note ?? ""} /></Field>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />} {isEdit ? "수정 저장" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 입고 처리 */
export function PromoInboundDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: PromoItemWithStock | null }) {
  const { pending, run } = useSubmit(onClose);
  if (!item) return null;

  function submit(fd: FormData) {
    if (!item) return;
    run(
      () => promoTxnAction({
        itemId: item.id, date: str(fd, "date"), type: str(fd, "type"), qty: Number(fd.get("qty")),
        purpose: opt(fd, "purpose"), manager: opt(fd, "manager"), docNo: opt(fd, "docNo"),
        unitPrice: Number(fd.get("unitPrice") ?? 0) || null,
      }),
      "입고 완료", `${item.name} ${fd.get("qty")}${item.unit} 입고 기록`
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-brand-700" /> 입고 처리</DialogTitle>
          <DialogDescription>{item.name} ({item.code}) · 현재 재고 {item.currentQty}{item.unit}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="입고일자" required><Input name="date" type="date" required defaultValue={todayKst()} /></Field>
            <Field label="입고 유형" required>
              <NativeSelect name="type" defaultValue="추가입고" required>
                {PROMO_IN_TYPES.filter((t) => t !== "조정증가").map((t) => <option key={t}>{t}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="수량" required><Input name="qty" type="number" min={1} required placeholder="0" /></Field>
            <Field label="단가(원)" hint="구입 입고 시"><Input name="unitPrice" type="number" min={0} /></Field>
          </div>
          <Field label="내용/사유"><Input name="purpose" placeholder="예: 2차 제작분 납품" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="담당자"><Input name="manager" /></Field>
            <Field label="지출문서번호"><Input name="docNo" /></Field>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />} 입고 기록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 출고 처리 (관리자 직접 출고) */
export function PromoOutboundDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: PromoItemWithStock | null }) {
  const { pending, run } = useSubmit(onClose);
  if (!item) return null;

  function submit(fd: FormData) {
    if (!item) return;
    run(
      () => promoTxnAction({
        itemId: item.id, date: str(fd, "date"), type: str(fd, "type"), qty: Number(fd.get("qty")),
        purpose: str(fd, "purpose") || "행사 배부", eventName: opt(fd, "eventName"),
        takerName: opt(fd, "takerName"), receiverName: opt(fd, "receiverName"), manager: opt(fd, "manager"),
      }),
      "출고 완료", `${item.name} ${fd.get("qty")}${item.unit} 출고 기록`
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageMinus className="h-5 w-5 text-pastel-coralInk" /> 출고 처리</DialogTitle>
          <DialogDescription>
            {item.name} ({item.code}) · 현재 {item.currentQty}{item.unit}
            {item.reservedQty > 0 && ` (예약 ${item.reservedQty} 제외 시 가용 ${item.availableQty})`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="출고일자" required><Input name="date" type="date" required defaultValue={todayKst()} /></Field>
            <Field label="출고 유형" required>
              <NativeSelect name="type" defaultValue="출고" required>
                {PROMO_OUT_TYPES.filter((t) => t !== "조정감소").map((t) => <option key={t}>{t}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="수량" required hint={`최대 ${item.currentQty}`}><Input name="qty" type="number" min={1} max={item.currentQty} required placeholder="0" /></Field>
            <Field label="사용 목적" required>
              <NativeSelect name="purpose" defaultValue="행사 배부" required>
                {PROMO_OUT_PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <Field label="행사명"><Input name="eventName" placeholder="예: 데이터라이브러리 개관식" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="반출자"><Input name="takerName" /></Field>
            <Field label="수령자"><Input name="receiverName" /></Field>
            <Field label="담당자"><Input name="manager" /></Field>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageMinus className="h-4 w-4" />} 출고 기록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 재고 실사 조정 */
export function PromoAdjustDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: PromoItemWithStock | null }) {
  const { pending, run } = useSubmit(onClose);
  if (!item) return null;

  function submit(fd: FormData) {
    if (!item) return;
    run(
      () => adjustPromoStockAction(item.id, Number(fd.get("actualQty")), str(fd, "reason")),
      "실사 조정 완료", `${item.name} 재고를 ${fd.get("actualQty")}${item.unit}로 조정`
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-brand-700" /> 재고 실사 조정</DialogTitle>
          <DialogDescription>
            {item.name} ({item.code}) · 장부 재고 {item.currentQty}{item.unit}. 실제 수량을 입력하면 차이만큼 조정 기록이 추가됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <Field label="실사 수량 (실제 보유)" required><Input name="actualQty" type="number" min={0} required defaultValue={item.currentQty} /></Field>
          <Field label="조정 사유" required><Input name="reason" required placeholder="예: 2026-07 정기 실사 결과 반영" /></Field>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} 조정 기록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 수불 기록 취소 (삭제 대신 취소 기록 추가) */
export function PromoCancelTxnDialog({ open, onClose, txn }: {
  open: boolean; onClose: () => void;
  txn: { id: string; label: string } | null;
}) {
  const { pending, run } = useSubmit(onClose);
  if (!txn) return null;

  function submit(fd: FormData) {
    if (!txn) return;
    run(() => cancelPromoTxnAction(txn.id, str(fd, "reason")), "기록 취소 완료", "취소 기록이 대장에 추가되었습니다.");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-pastel-coralInk" /> 수불 기록 취소</DialogTitle>
          <DialogDescription>
            {txn.label} — 기록은 삭제되지 않고 반대 방향의 취소 기록이 추가되어 이력이 보존됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <Field label="취소 사유" required><Input name="reason" required placeholder="예: 수량 오입력" /></Field>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} 취소 처리
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 출고 신청서 (일반 사용자 포함 누구나) */
export function PromoRequestDialog({ open, onClose, items, userName }: {
  open: boolean; onClose: () => void;
  items: PromoItemWithStock[];
  userName: string;
}) {
  const { pending, run } = useSubmit(onClose);
  const [itemId, setItemId] = useState("");
  const active = items.filter((i) => i.status === "사용");
  const picked = active.find((i) => i.id === itemId);

  function submit(fd: FormData) {
    run(
      () => createPromoRequestAction({
        itemId: str(fd, "itemId"), qty: Number(fd.get("qty")), outType: str(fd, "outType") || "출고",
        purpose: str(fd, "purpose"), eventName: opt(fd, "eventName"), eventDate: opt(fd, "eventDate"),
        requesterName: str(fd, "requesterName"), requesterAffiliation: opt(fd, "requesterAffiliation"), requesterPhone: opt(fd, "requesterPhone"),
      }),
      "출고 신청 완료", "관리자 승인 후 출고됩니다."
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setItemId(""); onClose(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-brand-700" /> 홍보물품 출고 신청서</DialogTitle>
          <DialogDescription>신청 → 관리자 승인(수량 예약) → 출고완료 순서로 처리됩니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
          <Field label="물품" required>
            <NativeSelect name="itemId" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              <option value="" disabled>물품 선택</option>
              {active.map((i) => (
                <option key={i.id} value={i.id} disabled={i.availableQty <= 0}>
                  [{i.code}] {i.name} — 가용 {i.availableQty}{i.unit}{i.availableQty <= 0 ? " (재고 없음)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="신청 수량" required hint={picked ? `가용 ${picked.availableQty}${picked.unit}` : undefined}>
              <Input name="qty" type="number" min={1} max={picked?.availableQty || undefined} required />
            </Field>
            <Field label="사용 목적" required>
              <NativeSelect name="purpose" defaultValue="행사 배부" required>
                {PROMO_OUT_PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="행사명"><Input name="eventName" placeholder="예: 신입생 오리엔테이션" /></Field>
            <Field label="행사/사용일"><Input name="eventDate" type="date" min={todayKst()} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="신청자" required><Input name="requesterName" required defaultValue={userName} /></Field>
            <Field label="소속"><Input name="requesterAffiliation" placeholder="예: 사업단" /></Field>
            <Field label="전화번호"><Input name="requesterPhone" type="tel" placeholder="010-0000-0000" /></Field>
          </div>
          <input type="hidden" name="outType" value="출고" />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} 신청 제출
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 신청 반려 (사유 필수) */
export function PromoRejectDialog({ open, onClose, request }: {
  open: boolean; onClose: () => void;
  request: { id: string; label: string } | null;
}) {
  const { pending, run } = useSubmit(onClose);
  const [reason, setReason] = useState("");
  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-pastel-coralInk" /> 출고 신청 반려</DialogTitle>
          <DialogDescription>{request.label}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => decidePromoRequestAction(request.id, "반려", reason), "반려 처리 완료");
          }}
          className="space-y-3"
        >
          <Field label="반려 사유" required><Input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="예: 재고 부족으로 다음 분기 신청 바랍니다" /></Field>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} 반려
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
