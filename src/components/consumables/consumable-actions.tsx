"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Download, Loader2 } from "lucide-react";
import type { ConsumableItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { consumableTxnAction } from "@/app/actions";

type TxnType = "in" | "out" | "adjust";

const TXN_META: Record<TxnType, { title: string; qtyLabel: string; verb: string }> = {
  in: { title: "소모품 입고", qtyLabel: "입고 수량", verb: "입고" },
  out: { title: "소모품 출고", qtyLabel: "출고 수량", verb: "출고" },
  adjust: { title: "재고 조정", qtyLabel: "조정 후 재고 수량", verb: "조정" },
};

// 소모품 페이지 상단 액션: 입고/출고/재고 조정 다이얼로그 + 엑셀 다운로드.
export function ConsumableActions({ items }: { items: Pick<ConsumableItem, "id" | "itemName" | "currentQty" | "unit">[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<TxnType | null>(null);
  const [pending, startTransition] = useTransition();
  const meta = type ? TXN_META[type] : null;

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
          description: "재고와 상태가 데모 데이터에 반영되었습니다. (서버 재시작 시 초기화)",
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
      <Button variant="soft" size="sm" onClick={() => setType("in")}><ArrowDownToLine className="h-4 w-4" /> 입고</Button>
      <Button variant="soft" size="sm" onClick={() => setType("out")}><ArrowUpFromLine className="h-4 w-4" /> 출고</Button>
      <Button variant="soft" size="sm" onClick={() => setType("adjust")}><SlidersHorizontal className="h-4 w-4" /> 재고 조정</Button>
      <Button asChild variant="outline" size="sm">
        <a href="/api/export/consumables" download><Download className="h-4 w-4" /> 엑셀</a>
      </Button>

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
