import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { MENU_PERMISSIONS } from "./menus";

// 데모용 세션(JWT) — DB/실인증 없이 인메모리 계정 기반. 쿠키에 서명된 토큰 저장.
// AUTH_SECRET 미설정 시 개발용 기본 시크릿 사용(운영에서는 반드시 교체).
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me-in-production-please"
);

export const SESSION_COOKIE = "sadan_session";

export interface SessionPayload extends JWTPayload {
  sub: string; // account id
  email: string;
  name: string;
  role: string;
  perms: string[]; // 로그인 시점의 메뉴 권한
}

export async function signSession(p: { sub: string; email: string; name: string; role: string; perms: string[] }): Promise<string> {
  return new SignJWT({ email: p.email, name: p.name, role: p.role, perms: p.perms })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// 경로 → 필요한 메뉴 권한 키
export function menuKeyForPath(pathname: string): string | null {
  if (pathname.startsWith("/assets/new")) return "assets.create";
  if (pathname.startsWith("/assets")) return "assets";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/imports")) return "imports";
  if (pathname.startsWith("/laptop-loans")) return "loans";
  if (pathname.startsWith("/loans")) return "loans";
  if (pathname.startsWith("/consumables")) return "consumables";
  if (pathname.startsWith("/rfid")) return "rfid";
  if (pathname.startsWith("/seats")) return "seats";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

// 권한 목록에서 접근 가능한 첫 메뉴의 경로 (로그인 후 진입점 / 접근 거부 시 이동)
const PRIORITY = ["dashboard", "assets", "loans", "consumables", "rfid", "seats", "reports", "settings", "assets.create"];
export function firstAllowedPath(perms: string[]): string {
  for (const key of PRIORITY) {
    if (perms.includes(key)) return MENU_PERMISSIONS.find((m) => m.key === key)!.href;
  }
  return "/";
}
