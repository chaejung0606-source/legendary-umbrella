"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Pencil, Trash2, Loader2, ShieldCheck, Check, X } from "lucide-react";
import type { Account } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/badges/status-badge";
import { useToast } from "@/components/ui/toaster";
import { ROLES, ROLE_LIST } from "@/lib/constants";
import { MENU_PERMISSIONS, ROLE_PRESETS } from "@/lib/menus";
import { createAccountAction, updateAccountAction, deleteAccountAction } from "@/app/actions";

type Editing = { mode: "create" } | { mode: "edit"; account: Account } | null;

export function AccountsManager({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);
  const [pending, startTransition] = useTransition();

  // 폼 로컬 상태
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("asset_manager");
  const [perms, setPerms] = useState<string[]>(ROLE_PRESETS.asset_manager);
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");

  function openCreate() {
    setName(""); setEmail(""); setPassword(""); setRole("asset_manager"); setPerms(ROLE_PRESETS.asset_manager); setActive(true);
    setEditing({ mode: "create" });
  }
  function openEdit(a: Account) {
    setName(a.name); setEmail(a.email); setPassword(""); setRole(a.role); setPerms(a.permissions); setActive(a.active);
    setEditing({ mode: "edit", account: a });
  }
  function applyRolePreset(r: string) {
    setRole(r);
    setPerms(ROLE_PRESETS[r] ?? []);
  }
  function togglePerm(key: string) {
    setPerms((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  function save() {
    if (!editing) return;
    const input = { name, email, password: password || undefined, role, permissions: perms, active };
    startTransition(async () => {
      const result = editing.mode === "edit"
        ? await updateAccountAction(editing.account.id, input)
        : await createAccountAction(input);
      if (result.ok) {
        toast({ kind: "success", title: editing.mode === "edit" ? "계정 수정 완료" : "계정 생성 완료", description: "데모 데이터에 반영되었습니다. (서버 재시작 시 초기화)" });
        setEditing(null);
        router.refresh();
      } else {
        toast({ kind: "error", title: "저장 실패", description: result.error });
      }
    });
  }

  function remove(a: Account) {
    startTransition(async () => {
      const result = await deleteAccountAction(a.id);
      if (result.ok) {
        toast({ kind: "success", title: "계정 삭제 완료" });
        setConfirmDelete(null);
        router.refresh();
      } else {
        toast({ kind: "error", title: "삭제 실패", description: result.error });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">계정을 생성하고 메뉴별 접근 권한을 부여합니다.</p>
        <Button size="sm" onClick={openCreate}><UserPlus className="h-4 w-4" /> 계정 추가</Button>
      </div>

      <div className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-black/[0.03]">
        <div className="overflow-x-auto pastel-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05] text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">이메일(로그인)</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">허용 메뉴</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-black/[0.04] transition-colors last:border-0 hover:bg-accent/60">
                  <td className="px-4 py-3.5 font-semibold">{a.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs">{a.email}</td>
                  <td className="px-4 py-3.5"><StatusBadge label={ROLES[a.role as keyof typeof ROLES] ?? a.role} tone="lavender" dot={false} /></td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{a.permissions.length}개 메뉴</td>
                  <td className="px-4 py-3.5">
                    {a.active
                      ? <StatusBadge label="활성" tone="mint" />
                      : <StatusBadge label="비활성" tone="slate" />}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /> 수정</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(a)}><Trash2 className="h-3.5 w-3.5 text-pastel-coralInk" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.mode === "edit" ? "계정 수정" : "계정 추가"}</DialogTitle>
            <DialogDescription>로그인 정보와 메뉴별 접근 권한을 설정합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="이름" required><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="이름" /></Field>
              <Field label="이메일(로그인)" required><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="user@sadan.local" /></Field>
            </div>
            <Field
              label="비밀번호"
              required={editing?.mode === "create"}
              hint={editing?.mode === "edit" ? "변경 시에만 입력" : "4자 이상"}
            >
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required={editing?.mode === "create"}
                placeholder={editing?.mode === "edit" ? "비워두면 기존 유지" : "로그인 비밀번호"}
                autoComplete="new-password"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="역할" hint="선택 시 권한 프리셋 적용">
                <NativeSelect value={role} onChange={(e) => applyRolePreset(e.target.value)}>
                  {ROLE_LIST.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                </NativeSelect>
              </Field>
              <Field label="상태">
                <NativeSelect value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
                  <option value="1">활성</option>
                  <option value="0">비활성</option>
                </NativeSelect>
              </Field>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
                <ShieldCheck className="h-4 w-4 text-pastel-lavenderInk" /> 메뉴별 접근 권한
                <span className="ml-auto text-xs font-normal text-muted-foreground">{perms.length} / {MENU_PERMISSIONS.length} 선택</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/50 p-3 sm:grid-cols-3">
                {MENU_PERMISSIONS.map((m) => {
                  const on = perms.includes(m.key);
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => togglePerm(m.key)}
                      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition ${on ? "bg-pastel-lavender text-pastel-lavenderInk" : "bg-card text-muted-foreground ring-1 ring-black/[0.04]"}`}
                    >
                      {on ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} {editing?.mode === "edit" ? "변경 저장" : "계정 생성"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계정 삭제</DialogTitle>
            <DialogDescription>{confirmDelete?.name} ({confirmDelete?.email}) 계정을 삭제할까요? 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>취소</Button>
            <Button variant="destructive" onClick={() => confirmDelete && remove(confirmDelete)} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
