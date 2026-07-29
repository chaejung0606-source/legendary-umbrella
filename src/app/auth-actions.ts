"use server";
import { cookies } from "next/headers";
import { verifyLogin } from "@/data/mutations";
import { signSession, firstAllowedPath, SESSION_COOKIE } from "@/lib/session";

type LoginResult = { ok: true; redirect: string } | { ok: false; error: string };

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  let result: Awaited<ReturnType<typeof verifyLogin>>;
  try {
    result = await verifyLogin(email, password);
  } catch (e) {
    // DB 접속 실패 등 — 예외를 그대로 던지면 로그인 화면이 통째로 오류 화면으로 바뀐다.
    // 폼은 그대로 두고 안내만 보여준다(원인은 서버 로그로 남긴다).
    console.error("[login] 계정 조회 실패", e);
    return { ok: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요." };
  }
  if ("error" in result) return { ok: false, error: result.error };

  const token = await signSession({
    sub: result.id,
    email: result.email,
    name: result.name,
    role: result.role,
    perms: result.permissions,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return { ok: true, redirect: firstAllowedPath(result.permissions) };
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
