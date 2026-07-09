"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Hash, Building2, FolderTree } from "lucide-react";
import type { AssetMajorCategory, Building } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import {
  addMajorAction, updateMajorAction, deleteMajorAction,
  addMiddleAction, updateMiddleAction, deleteMiddleAction,
  addBuildingAction, updateBuildingAction, deleteBuildingAction,
} from "@/app/actions";

type Dlg =
  | { t: "major-add" }
  | { t: "major-edit"; id: string; code: number; name: string }
  | { t: "middle-add"; majorId: string; majorName: string }
  | { t: "middle-edit"; id: string; code: number; name: string; detail: string }
  | { t: "building-add" }
  | { t: "building-edit"; id: string; code: string; name: string; campus: string }
  | null;

export function ReferenceManager({ categories, buildings }: { categories: AssetMajorCategory[]; buildings: Building[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"category" | "building">("category");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successTitle: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast({ kind: "success", title: successTitle, description: "기준정보가 반영되어 이후 자산 등록의 관리번호 생성에 즉시 적용됩니다." });
        setDlg(null);
        router.refresh();
      } else {
        toast({ kind: "error", title: "처리 실패", description: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 관리번호 생성 설명 */}
      <div className="rounded-2xl bg-accent/60 p-4 text-sm">
        <div className="mb-1.5 flex items-center gap-1.5 font-bold"><Hash className="h-4 w-4 text-pastel-lavenderInk" /> 관리번호는 이렇게 만들어집니다</div>
        <p className="font-mono text-xs bg-card rounded-lg px-3 py-2 my-2 overflow-x-auto pastel-scroll">
          [연번] + 취득일(yyyyMMdd) + <b className="text-pastel-lavenderInk">분류코드</b> + 번호 + <b className="text-pastel-mintInk">건축물코드</b>
        </p>
        <p className="text-muted-foreground">
          예) <code className="font-mono">[1]202407315011B0000142</code> — 연번 1, 취득일 2024-07-31, 분류코드 <b>501</b>, 번호 1, 건축물코드 <b>B0000142</b>.
          이 중 <b className="text-pastel-lavenderInk">분류코드</b>는 아래 &lsquo;자산분류 코드&rsquo;의 중분류에서, <b className="text-pastel-mintInk">건축물코드</b>는 &lsquo;건축물 코드&rsquo;에서 가져옵니다.
          여기서 코드를 추가·수정하면 자산 등록 화면의 선택지와 관리번호 자동 생성에 바로 반영됩니다.
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5">
        <button onClick={() => setTab("category")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === "category" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><FolderTree className="h-4 w-4" /> 자산분류 코드</button>
        <button onClick={() => setTab("building")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === "building" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Building2 className="h-4 w-4" /> 건축물 코드</button>
      </div>

      {tab === "category" ? (
        <div className="space-y-3">
          <div className="flex justify-end"><Button size="sm" variant="soft" onClick={() => setDlg({ t: "major-add" })}><Plus className="h-4 w-4" /> 대분류 추가</Button></div>
          {categories.map((maj) => (
            <div key={maj.id} className="rounded-2xl bg-muted/40 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <span className="rounded-lg bg-pastel-lavender px-2 py-0.5 font-mono text-xs text-pastel-lavenderInk">{maj.code}</span>
                  {maj.name}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDlg({ t: "middle-add", majorId: maj.id, majorName: maj.name })}><Plus className="h-3.5 w-3.5" /> 중분류</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDlg({ t: "major-edit", id: maj.id, code: maj.code, name: maj.name })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => deleteMajorAction(maj.id), "대분류 삭제 완료")}><Trash2 className="h-3.5 w-3.5 text-pastel-coralInk" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {maj.middles.length === 0 && <span className="text-xs text-muted-foreground">중분류 없음</span>}
                {maj.middles.map((mid) => (
                  <span key={mid.id} className="group inline-flex items-center gap-1.5 rounded-xl bg-card px-2.5 py-1.5 text-xs shadow-soft">
                    <span className="font-mono font-semibold text-pastel-lavenderInk">{mid.code}</span>
                    {mid.name}
                    <button onClick={() => setDlg({ t: "middle-edit", id: mid.id, code: mid.code, name: mid.name, detail: (mid.detailItems ?? []).join(", ") })} className="opacity-40 transition hover:opacity-100"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => run(() => deleteMiddleAction(mid.id), "중분류 삭제 완료")} className="opacity-40 transition hover:opacity-100"><Trash2 className="h-3 w-3 text-pastel-coralInk" /></button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end"><Button size="sm" variant="soft" onClick={() => setDlg({ t: "building-add" })}><Plus className="h-4 w-4" /> 건축물 추가</Button></div>
          <div className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-black/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">건축물코드</th>
                  <th className="px-4 py-2.5 font-medium">건축물명</th>
                  <th className="px-4 py-2.5 font-medium">캠퍼스</th>
                  <th className="px-4 py-2.5 text-right font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.id} className="border-b border-black/[0.04] last:border-0 hover:bg-accent/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-pastel-mintInk">{b.code}</td>
                    <td className="px-4 py-2.5 font-medium">{b.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.campus}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDlg({ t: "building-edit", id: b.id, code: b.code, name: b.name, campus: b.campus })}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => run(() => deleteBuildingAction(b.id), "건축물 삭제 완료")}><Trash2 className="h-3.5 w-3.5 text-pastel-coralInk" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 다이얼로그들 */}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          {dlg?.t === "major-add" && (
            <FormDialog title="대분류 추가" onSubmit={(fd) => run(() => addMajorAction(Number(fd.get("code")), String(fd.get("name"))), "대분류 추가 완료")} pending={pending}>
              <Field label="대분류 코드" required><Input name="code" type="number" required placeholder="예: 11" /></Field>
              <Field label="대분류명" required><Input name="name" required placeholder="예: 실험기기" /></Field>
            </FormDialog>
          )}
          {dlg?.t === "major-edit" && (
            <FormDialog title="대분류 수정" onSubmit={(fd) => run(() => updateMajorAction(dlg.id, Number(fd.get("code")), String(fd.get("name"))), "대분류 수정 완료")} pending={pending}>
              <Field label="대분류 코드" required><Input name="code" type="number" required defaultValue={dlg.code} /></Field>
              <Field label="대분류명" required><Input name="name" required defaultValue={dlg.name} /></Field>
            </FormDialog>
          )}
          {dlg?.t === "middle-add" && (
            <FormDialog title={`중분류 추가 · ${dlg.majorName}`} onSubmit={(fd) => run(() => addMiddleAction(dlg.majorId, Number(fd.get("code")), String(fd.get("name")), String(fd.get("detail"))), "중분류 추가 완료")} pending={pending}>
              <Field label="분류코드" required hint="관리번호에 들어감"><Input name="code" type="number" required placeholder="예: 511" /></Field>
              <Field label="중분류명" required><Input name="name" required placeholder="예: 계측기" /></Field>
              <Field label="세부품목 (쉼표 구분)"><Input name="detail" placeholder="예: 오실로스코프, 멀티미터" /></Field>
            </FormDialog>
          )}
          {dlg?.t === "middle-edit" && (
            <FormDialog title="중분류 수정" onSubmit={(fd) => run(() => updateMiddleAction(dlg.id, Number(fd.get("code")), String(fd.get("name")), String(fd.get("detail"))), "중분류 수정 완료")} pending={pending}>
              <Field label="분류코드" required hint="관리번호에 들어감"><Input name="code" type="number" required defaultValue={dlg.code} /></Field>
              <Field label="중분류명" required><Input name="name" required defaultValue={dlg.name} /></Field>
              <Field label="세부품목 (쉼표 구분)"><Input name="detail" defaultValue={dlg.detail} /></Field>
            </FormDialog>
          )}
          {dlg?.t === "building-add" && (
            <FormDialog title="건축물 추가" onSubmit={(fd) => run(() => addBuildingAction(String(fd.get("code")), String(fd.get("name")), String(fd.get("campus"))), "건축물 추가 완료")} pending={pending}>
              <Field label="건축물코드" required hint="관리번호에 들어감"><Input name="code" required placeholder="예: B0000300" className="font-mono" /></Field>
              <Field label="건축물명" required><Input name="name" required placeholder="예: 공학1호관" /></Field>
              <Field label="캠퍼스"><Input name="campus" defaultValue="강원대학교 춘천캠퍼스" /></Field>
            </FormDialog>
          )}
          {dlg?.t === "building-edit" && (
            <FormDialog title="건축물 수정" onSubmit={(fd) => run(() => updateBuildingAction(dlg.id, String(fd.get("code")), String(fd.get("name")), String(fd.get("campus"))), "건축물 수정 완료")} pending={pending}>
              <Field label="건축물코드" required hint="관리번호에 들어감"><Input name="code" required defaultValue={dlg.code} className="font-mono" /></Field>
              <Field label="건축물명" required><Input name="name" required defaultValue={dlg.name} /></Field>
              <Field label="캠퍼스"><Input name="campus" defaultValue={dlg.campus} /></Field>
            </FormDialog>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormDialog({ title, onSubmit, pending, children }: { title: string; onSubmit: (fd: FormData) => void; pending: boolean; children: React.ReactNode }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>기준정보를 편집하면 이후 자산 등록의 관리번호 생성에 반영됩니다.</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }} className="space-y-3">
        {children}
        <DialogFooter><Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} 저장</Button></DialogFooter>
      </form>
    </>
  );
}
