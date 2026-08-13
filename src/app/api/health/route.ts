import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DB 연결 상태 확인용 공개 엔드포인트. 두 가지 역할을 겸한다.
//
// 1) 진단 — 로그인이 안 될 때 "접속 문제인지 계정 문제인지"를 로그인 없이 가려낸다.
//    로그인 자체가 막힌 상황에서 써야 하므로 인증 뒤에 둘 수 없다.
// 2) keep-alive — vercel.json 의 cron 이 매일 이 경로를 호출한다.
//    실제 쿼리(SELECT 1 + count)를 실행하므로 Supabase 가 "비활성"으로 보지 않아
//    무료 플랜의 자동 일시정지를 막는다. 쿼리를 없애면 keep-alive 효과가 사라진다.
//
// 접속 문자열·호스트·계정 등 내부 정보는 절대 내보내지 않고 상태만 돌려준다.
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const accounts = await prisma.account.count();
    return NextResponse.json(
      {
        ok: true,
        db: "연결됨",
        accounts, // 계정이 0 이면 로그인 가능한 사용자가 없다는 뜻
        ms: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // 원인(호스트·자격증명)은 서버 로그에만 남기고 응답에는 담지 않는다.
    return NextResponse.json(
      {
        ok: false,
        db: "연결 실패",
        hint: "배포 환경의 DATABASE_URL · DIRECT_URL 을 확인하세요.",
        ms: Date.now() - startedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
