"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Download, Loader2, PlusCircle } from "lucide-react";
import type { ConsumableItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { consumableTxnAction, createConsumableItemAction } from "@/app/actions";

type TxnType = "in" | "out" | "adjust";

const TXN_META: Record<TxnType, { title: string; qtyLabel: string; verb: string }> = {
  in: { title: "소모품 입고", qtyLabel: "입고 수량", verb: "입고" },
  out: { title: "소모품 출고", qtyLabel: "출고 수량", verb: "출고" },
  adjust: { title: "재고 조정", qtyLabel: "조정 후 재고 수량", verb: "조정" },
};

// 소모품 페이지 상단 액션: 입고/출고/재고 조정 다이얼로그 + 엑셀 다운로드.
export function ConsumableActions({ items, isManager = false }: { items: Pick<ConsumableItem, "id" | "itemName" | "currentQty" | "unit">[]; isManager?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<TxnType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = type ? TXN_META[type] : null;

  function submitCreate(fd: FormData) {
    const str = (k: string) => String(fd.get(k) ?? "").trim();
    const num = (k: string) => Number(fd.get(k) ?? 0) || 0;
    startTransition(async () => {
      const result = await createConsumableItemAction({
        itemName: str("itemName"),
        specification: str("specification") || null,
        unit: str("unit") || "개",
        unitPrice: num("unitPrice"),
        currentQty: num("currentQty"),
        safetyQty: num("safetyQty"),
        location: str("location") || null,
        roomName: str("roomName") || null,
        expenditureDocument: str("expenditureDocument") || null,
      });
      if (result.ok) {
        toast({ kind: "success", title: "물품 등록 완료", description: `${str("itemName")} 이(가) 재고 목록에 추가되었습니다.` });
        setCreateOpen(false);
        router.refresh();
      } else {
        toast({ kind: "error", title: "물품 등록 실패", description: result.error });
      }
    });
  }

  function submit(fd: FormData) {
    if (!type) return;
    const itemId = String(fd.get("itemId") ?? "");
    const qty = Number(fd.get("qty") ?? 0);
    const item = items.find((i) => i.id === itemId);
    startTransition(async () => {
      const result = await consumableTxnAction(itemId, type, qty);
      if (result.ok) {
        toast({
          kind: "success",
          title: `${item?.itemName ?? "품목"} ${TXN_META[type].verb} 완료`,
          description: "재고와 상태가 반영되었습니다.",
        });
        setType(null);
        router.refresh();
      } else {
        toast({ kind: "error", title: `${TXN_META[type].verb} 실패`, description: result.error });
      }
    });
  }

  return (
    <>
      {isManager && <Button size="sm" onClick={() => setCreateOpen(true)}><PlusCircle className="h-4 w-4" /> 물품 등록</Button>}
      <Button variant="soft" size="sm" onClick={() => setType("in")}><ArrowDownToLine className="h-4 w-4" /> 입고</Button>
      <Button variant="soft" size="sm" onClick={() => setType("out")}><ArrowUpFromLine className="h-4 w-4" /> 출고</Button>
      {isManager && <Button variant="soft" size="sm" onClick={() => setType("adjust")}><SlidersHorizontal className="h-4 w-4" /> 재고 조정</Button>}
      <Button asChild variant="outline" size="sm">
        <a href="/api/export/consumables" download><Download className="h-4 w-4" /> 엑셀</a>
      </Button>

      {/* 신규 물품 등록 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-brand-700" /> 연구재료/소모품 등록</DialogTitle>
            <DialogDescription>새 품목을 재고 목록에 추가합니다. 이후 수량 변경은 입고/출고/재고 조정으로 관리합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitCreate(new FormData(e.currentTarget)); }} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="품명" required className="col-span-2"><Input name="itemName" required placeholder="예: 니트릴 장갑" /></Field>
              <Field label="단위"><Input name="unit" defaultValue="개" placeholder="개 / EA / 박스" /></Field>
            </div>
            <Field label="규격"><Input name="specification" placeholder="예: M 사이즈, 100매입" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="초기 재고"><Input name="currentQty" type="number" min={0} defaultValue={0} /></Field>
              <Field label="안전재고" hint="미만이면 부족 표시"><Input name="safetyQty" type="number" min={0} defaultValue={0} /></Field>
              <Field label="단가(원)"><Input name="unitPrice" type="number" min={0} defaultValue={0} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="보관장소"><Input name="location" placeholder="예: 집현관(제2도서관)" /></Field>
              <Field label="호실"><Input name="roomName" placeholder="예: 102호" /></Field>
              <Field label="지출문서"><Input name="expenditureDocument" placeholder="문서번호" /></Field>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} 등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!type} onOpenChange={(o) => !o && setType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{meta?.title}</DialogTitle>
            <DialogDescription>
              {type === "adjust" ? "실사 결과에 맞춰 재고 수량을 직접 설정합니다." : "품목과 수량을 선택하면 재고가 즉시 반영됩니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-3">
            <Field label="품목" required>
              <NativeSelect name="itemId" required defaultValue="">
                <option value="" disabled>선택</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.itemName} (현재 {i.currentQty}{i.unit})</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={meta?.qtyLabel ?? "수량"} required>
              <Input name="qty" type="number" min={type === "adjust" ? 0 : 1} required placeholder="숫자" />
            </Field>
            <Field label="사유 메모"><Input name="reason" placeholder="예: 신규 구매 / 연구실 지급 / 재물조사" /></Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} {meta?.verb} 처리
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
