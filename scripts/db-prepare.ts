/**
 * 빌드 단계의 DB 준비 — 스키마 반영(db push) + 시드.
 *
 * 왜 별도 스크립트인가:
 *   build 스크립트가 `prisma db push && seed` 를 직접 실행하면, DB 가 잠시 내려가거나
 *   접속 정보가 만료된 순간 **빌드 전체가 실패**해 배포가 아예 만들어지지 않는다.
 *   그러면 DB 와 무관한 화면(로그인 등)의 수정 사항도 배포되지 못한다.
 *
 * 그래서 순서를 이렇게 둔다:
 *   1) 먼저 DB 에 실제로 연결되는지 확인한다.
 *   2) 연결되면 db push + seed 를 실행하고, 여기서 실패하면 빌드를 중단한다
 *      (스키마가 실제로 거부된 상황이므로 덮고 넘어가면 안 된다).
 *   3) 연결 자체가 안 되면 크게 경고만 남기고 빌드는 계속한다.
 *      앱은 배포되고, DB 가 필요한 화면만 런타임 오류 화면으로 안내된다.
 *
 * 설정값은 모두 환경변수에서 읽는다(저장소에 접속 정보를 두지 않는다):
 *   DATABASE_URL · DIRECT_URL   — Prisma 접속 문자열
 *   DB_PREPARE_STRICT=1         — 연결 실패도 빌드 실패로 처리(엄격 모드)
 *   DB_PREPARE_TIMEOUT_MS       — 연결 확인 제한 시간 (기본 15000)
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

// Prisma CLI 는 .env 를 자동으로 읽지만 이 스크립트는 그렇지 않다.
// 로컬에서 동일하게 동작하도록 .env 가 있으면 읽어 온다.
// 배포 환경(Vercel 등)에는 .env 파일이 없고 플랫폼 환경변수가 이미 주입돼 있다.
if (existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* 형식이 깨진 .env 는 무시하고 플랫폼 환경변수만 사용한다 */
  }
}

const STRICT = process.env.DB_PREPARE_STRICT === "1";
const TIMEOUT_MS = Number(process.env.DB_PREPARE_TIMEOUT_MS ?? 15_000);

function banner(lines: string[]) {
  const width = Math.max(...lines.map((l) => [...l].length)) + 2;
  console.warn("\n" + "─".repeat(width));
  for (const l of lines) console.warn(" " + l);
  console.warn("─".repeat(width) + "\n");
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: "inherit" });
}

// DB 에 실제 쿼리를 한 번 던져 연결 가능 여부를 확인한다.
// 접속 문자열 누락·호스트 없음·인증 실패 모두 "연결 불가"로 본다.
async function probe(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const missing = ["DATABASE_URL", "DIRECT_URL"].filter((k) => !process.env[k]);
  if (missing.length > 0) return { ok: false, reason: `환경변수 미설정: ${missing.join(", ")}` };

  let prisma: { $queryRaw: (s: TemplateStringsArray) => Promise<unknown>; $disconnect: () => Promise<void> };
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ log: ["error"] });
  } catch (e) {
    return { ok: false, reason: `Prisma 클라이언트 초기화 실패: ${(e as Error).message}` };
  }

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`연결 확인 ${TIMEOUT_MS}ms 초과`)), TIMEOUT_MS)),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message.split("\n").slice(0, 6).join(" ").trim() };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

async function main() {
  const result = await probe();

  if (!result.ok) {
    banner([
      "DB 에 연결하지 못했습니다 — 스키마 반영(db push)과 시드를 건너뜁니다.",
      "",
      `사유: ${result.reason}`,
      "",
      "앱 자체는 계속 빌드·배포되지만, DB 가 필요한 화면은 런타임에 오류 화면이 뜹니다.",
      "배포 환경의 DATABASE_URL · DIRECT_URL 이 살아 있는 DB 를 가리키는지 확인하세요.",
      "빌드를 실패시키려면 DB_PREPARE_STRICT=1 로 두세요.",
    ]);
    process.exit(STRICT ? 1 : 0);
  }

  // 여기부터는 DB 가 살아 있다 → 실패하면 진짜 문제이므로 빌드를 중단한다.
  run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
  run("npx", ["tsx", "prisma/seed.ts"]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
