"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCw, LogIn } from "lucide-react";
import { SoftCard } from "@/components/soft/SoftCard";
import { SoftButton } from "@/components/soft/SoftButton";

// 서버 렌더링 중 예외가 나도 Vercel 기본 "Application error" 흰 화면 대신
// 원인 코드(digest)와 복구 수단을 보여준다.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[sadan] unhandled error", error);
  }, [error]);

  return (
    <div className="ceramic-page flex min-h-screen items-center justify-center px-4 py-10 text-ceramic-ink">
      <div className="relative w-full max-w-md">
        <SoftCard large className="p-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[20px] ceramic-pink grain">
            <AlertTriangle className="h-7 w-7 text-rose-900/70" />
          </span>
          <h1 className="text-lg font-bold tracking-tight">일시적인 오류가 발생했습니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-ceramic-sub">
            페이지를 불러오는 중 문제가 생겼습니다. 다시 시도하거나 로그인 화면으로 돌아가 주세요.
            문제가 계속되면 아래 오류 코드를 관리자에게 알려 주세요.
          </p>

          {error.digest && (
            <p className="mt-4 rounded-2xl ceramic-inset px-3.5 py-2 font-mono text-[12px] text-ceramic-sub">
              오류 코드: {error.digest}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <SoftButton variant="primary" className="w-full" onClick={() => reset()}>
              <RotateCw className="h-4 w-4" /> 다시 시도
            </SoftButton>
            <SoftButton variant="secondary" className="w-full" onClick={() => { window.location.href = "/"; }}>
              <LogIn className="h-4 w-4" /> 로그인 화면으로
            </SoftButton>
          </div>
        </SoftCard>
      </div>
    </div>
  );
}
