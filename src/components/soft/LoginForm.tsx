"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Mail, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";
import { SoftCard } from "@/components/soft/SoftCard";
import { SoftButton } from "@/components/soft/SoftButton";
import { loginAction } from "@/app/auth-actions";
import { APP_VERSION, APP_VERSION_DATE } from "@/data/changelog";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginAction(email, password);
      if (res.ok) {
        router.replace(next && next.startsWith("/") ? next : res.redirect);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="ceramic-page flex min-h-screen items-center justify-center px-4 py-10 text-ceramic-ink">
      {/* 곡선 배경 레이어 */}
      <div className="pointer-events-none fixed -left-24 top-10 h-72 w-72 rounded-[46%_54%_60%_40%/50%_46%_54%_50%] ceramic-mint grain opacity-50 blur-[1px]" aria-hidden />
      <div className="pointer-events-none fixed -right-24 bottom-10 h-72 w-72 rounded-[54%_46%_40%_60%/46%_54%_46%_54%] ceramic-sky grain opacity-50 blur-[1px]" aria-hidden />

      <div className="relative w-full max-w-md">
        {/* 로고 */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-[20px] ceramic-mint grain">
            <Boxes className="h-7 w-7 text-emerald-900/70" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">사업단 자산관리 플랫폼</h1>
            <p className="mt-1 text-sm text-ceramic-sub">계정으로 로그인하세요</p>
          </div>
        </div>

        <SoftCard large className="p-7">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ceramic-sub">이메일</span>
              <span className="ceramic-inset flex items-center gap-2.5 rounded-2xl px-3.5">
                <Mail className="h-4 w-4 shrink-0 text-ceramic-sage" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@sadan.local" autoComplete="username"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ceramic-sub/60"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ceramic-sub">비밀번호</span>
              <span className="ceramic-inset flex items-center gap-2.5 rounded-2xl px-3.5">
                <Lock className="h-4 w-4 shrink-0 text-ceramic-sage" />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호" autoComplete="current-password"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ceramic-sub/60"
                />
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-2xl ceramic-pink grain px-3.5 py-2.5 text-sm text-rose-900/80">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <SoftButton variant="primary" type="submit" className="w-full" aria-label="로그인">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              로그인
            </SoftButton>
          </form>

          <p className="mt-5 border-t border-ceramic-line pt-4 text-center text-[11px] leading-relaxed text-ceramic-sub">
            계정이 없거나 비밀번호를 잊으셨다면 관리자에게 문의하세요.
            <span className="mt-1 block opacity-70">v{APP_VERSION} · {APP_VERSION_DATE}</span>
          </p>
        </SoftCard>
      </div>
    </div>
  );
}
