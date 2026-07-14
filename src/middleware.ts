import { NextResponse, type NextRequest } from "next/server";
import { verifySession, menuKeyForPath, firstAllowedPath, SESSION_COOKIE } from "@/lib/session";

// 앱 내부 경로 보호 + 메뉴별 권한 강제.
// - 미로그인 → 로그인(/) 으로
// - 권한 없는 메뉴 접근 → 접근 가능한 첫 메뉴로
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const key = menuKeyForPath(req.nextUrl.pathname);
  const perms = session.perms ?? [];
  if (key && !perms.includes(key)) {
    const url = req.nextUrl.clone();
    url.pathname = firstAllowedPath(perms);
    url.search = "";
    // 이동 대상이 현재 경로와 같으면(권한 전무) 로그인으로
    if (url.pathname === req.nextUrl.pathname) url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// 앱 내부 경로만 보호. /api/sheets 등은 구글시트 연동 위해 공개 유지(matcher 제외).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assets/:path*",
    "/imports/:path*",
    "/laptop-loans/:path*",
    "/loans/:path*",
    "/promo/:path*",
    "/consumables/:path*",
    "/rfid/:path*",
    "/seats/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
