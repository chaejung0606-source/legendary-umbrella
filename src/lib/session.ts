import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { MENU_PERMISSIONS } from "./menus";

// 세션(JWT) — 서명된 쿠키에 계정/권한을 담는다.
//
// AUTH_SECRET 이 없으면 개발용 기본 시크릿으로 떨어진다. 이 값은 저장소에 그대로
// 적혀 있으므로, 배포 환경에서 이 상태가 되면 **누구나 관리자 세션 쿠키를 위조**할 수 있다.
// 운영을 중단시키지 않기 위해 여기서 막지는 않되, 아래 두 곳에서 드러나게 한다.
//   - 서버 로그: 프로덕션에서 기본값이면 시작 시 1회 경고
//   - /api/health: auth 필드로 "기본값(위험)" 노출 → 로그인 없이 점검 가능
const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me-in-production-please";

/** 배포 환경인데 AUTH_SECRET 이 비어 있어 개발용 기본 시크릿을 쓰고 있는 상태 */
export const usingDefaultSecret =
  process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET;

if (usingDefaultSecret) {
  console.error(
    "[보안 경고] AUTH_SECRET 이 설정되지 않아 저장소에 공개된 기본 시크릿으로 세션에 서명하고 있습니다. " +
      "세션 쿠키 위조가 가능하니 Vercel 환경변수에 AUTH_SECRET 을 즉시 설정하세요 (openssl rand -base64 32)."
  );
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || DEV_FALLBACK_SECRET);

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

// 경로 → 필요한 메뉴 권한 키 (자산 등록 /assets/new 는 자산 원장 권한에 포함)
export function menuKeyForPath(pathname: string): string | null {
  if (pathname.startsWith("/assets")) return "assets";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/laptop-loans")) return "loans";
  if (pathname.startsWith("/loans")) return "loans";
  if (pathname.startsWith("/promo")) return "promo";
  if (pathname.startsWith("/consumables")) return "consumables";
  if (pathname.startsWith("/rfid")) return "rfid";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

// 세션/계정에서 온 권한 값을 항상 문자열 배열로 정규화한다.
// 구버전 쿠키처럼 perms 가 아예 없는 토큰이 들어와도 터지지 않게 한다.
export function normalizePerms(perms: unknown): string[] {
  return Array.isArray(perms) ? perms.filter((p): p is string => typeof p === "string") : [];
}

// 권한 목록에서 접근 가능한 첫 메뉴의 경로 (로그인 후 진입점 / 접근 거부 시 이동)
// 접근 가능한 메뉴가 하나도 없으면 "/"(로그인 화면)을 돌려준다.
const PRIORITY = ["dashboard", "assets", "loans", "consumables", "promo", "rfid", "settings"];
export function firstAllowedPath(perms: unknown): string {
  const list = normalizePerms(perms);
  for (const key of PRIORITY) {
    if (!list.includes(key)) continue;
    const menu = MENU_PERMISSIONS.find((m) => m.key === key);
    if (menu) return menu.href;
  }
  return "/";
}
