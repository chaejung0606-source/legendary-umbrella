"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, ArrowLeftRight, ArrowUpRight, RotateCcw, Loader2 } from "lucide-react";
import type { LoanStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { moveAssetAction, loanAssetAction, returnAssetAction } from "@/app/actions";

// 자산 상세 헤더의 액션 버튼 묶음: 수정 / 이동 처리 / 대여·반납 처리 (전체 자산 대상).
export function AssetActions({
  assetId,
  itemName,
  onLoan,
}: {
  assetId: string;
  itemName: string;
  onLoan: boolean; // 현재 대여/사용 중 여부
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<"move" | "loan" | "return" | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successTitle: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({ kind: "success", title: successTitle, description: "변경 내용이 데모 데이터에 반영되었습니다. (서버 재시작 시 초기화)" });
        setDialog(null);
        router.refresh();
      } else {
        toast({ kind: "error", title: "처리 실패", description: result.error });
      }
    });
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild><Link href={`/assets/${assetId}/edit`}><Pencil className="h-4 w-4" /> 수정</Link></Button>
        <Button variant="outline" onClick={() => setDialog("move")}><ArrowLeftRight className="h-4 w-4" /> 이동 처리</Button>
        {onLoan ? (
          <Button variant="secondary" onClick={() => setDialog("return")}><RotateCcw className="h-4 w-4" /> 반납 처리</Button>
        ) : (
          <Button variant="secondary" onClick={() => setDialog("loan")}><ArrowUpRight className="h-4 w-4" /> 대여 처리</Button>
        )}
      </div>

      {/* 이동 처리 */}
      <Dialog open={dialog === "move"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자산 이동 처리</DialogTitle>
            <DialogDescription>{itemName}의 위치와 사용자를 변경합니다.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () => moveAssetAction(assetId, {
                  place: String(fd.get("place") ?? ""),
                  roomName: String(fd.get("roomName") ?? "") || null,
                  userName: String(fd.get("userName") ?? "") || null,
                  note: String(fd.get("note") ?? "") || null,
                }),
                "이동 처리 완료"
              );
            }}
            className="space-y-3"
          >
            <Field label="이동할 장소" required><Input name="place" required placeholder="예: 집현관(제2도서관)" /></Field>
            <Field label="호실"><Input name="roomName" placeholder="예: 102호" /></Field>
            <Field label="사용자 (비우면 미지정)"><Input name="userName" placeholder="이름" /></Field>
            <Field label="이동 사유 메모"><Input name="note" placeholder="예: 사무실 재배치" /></Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} 이동 처리</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 대여 처리 */}
      <Dialog open={dialog === "loan"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>대여 처리</DialogTitle>
            <DialogDescription>{itemName}을(를) 대여 상태로 변경합니다.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () => loanAssetAction(assetId, String(fd.get("userName") ?? ""), String(fd.get("dueAt") ?? "") || null),
                "대여 처리 완료"
              );
            }}
            className="space-y-3"
          >
            <Field label="사용자" required><Input name="userName" required placeholder="이름" /></Field>
            <Field label="예정 반납일"><Input name="dueAt" type="date" /></Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} 대여 처리</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 반납 처리 */}
      <Dialog open={dialog === "return"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반납 처리</DialogTitle>
            <DialogDescription>{itemName}을(를) 반납 처리합니다.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () => returnAssetAction(assetId, String(fd.get("afterStatus") ?? "보관") as LoanStatus, fd.get("damaged") === "on"),
                "반납 처리 완료"
              );
            }}
            className="space-y-3"
          >
            <Field label="반납 후 상태">
              <NativeSelect name="afterStatus" defaultValue="보관">
                <option>보관</option><option>수리</option><option>분실</option><option>폐기</option>
              </NativeSelect>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="damaged" /> 손상 있음</label>
            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} 반납 처리</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
