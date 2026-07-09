"use server";
import { cookies } from "next/headers";
import { verifyLogin } from "@/data/mutations";
import { signSession, firstAllowedPath, SESSION_COOKIE } from "@/lib/session";

type LoginResult = { ok: true; redirect: string } | { ok: false; error: string };

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  const result = verifyLogin(email, password);
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
