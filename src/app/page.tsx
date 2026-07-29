import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession, firstAllowedPath, SESSION_COOKIE } from "@/lib/session";
import { safeNextPath } from "@/lib/utils";
import { LoginForm } from "@/components/soft/LoginForm";

// 사이트 첫 화면 = 로그인. 이미 로그인돼 있으면 접근 가능한 첫 메뉴로 이동.
export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  const next = safeNextPath(sp.next);

  if (session) {
    const home = firstAllowedPath(session.perms);
    // home 이 "/" 라는 것은 접근 가능한 메뉴가 없다는 뜻(권한 미부여 또는 perms 없는 구버전 쿠키).
    // 이때 redirect("/") 를 하면 자기 자신으로 무한 이동하므로, 로그인 화면을 다시 보여준다.
    if (home !== "/") redirect(next ?? home);
    return (
      <LoginForm
        next={next ?? undefined}
        notice="이전 로그인 정보가 만료되었거나 접근 가능한 메뉴 권한이 없습니다. 다시 로그인해 주세요."
      />
    );
  }

  return <LoginForm next={next ?? undefined} />;
}
