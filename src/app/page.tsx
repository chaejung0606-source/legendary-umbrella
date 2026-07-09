import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession, firstAllowedPath, SESSION_COOKIE } from "@/lib/session";
import { LoginForm } from "@/components/soft/LoginForm";

// 사이트 첫 화면 = 로그인. 이미 로그인돼 있으면 접근 가능한 첫 메뉴로 이동.
export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (session) redirect(sp.next?.startsWith("/") ? sp.next : firstAllowedPath(session.perms));

  return <LoginForm next={sp.next} />;
}
