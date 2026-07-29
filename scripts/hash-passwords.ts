/**
 * 남아 있는 평문 비밀번호를 bcrypt 해시로 일괄 변환한다.
 *
 * 평소에는 필요 없다 — 로그인할 때 자동으로 해시로 바뀐다(src/lib/password.ts 점진 전환).
 * 이 스크립트는 **오래 로그인하지 않아 평문으로 남아 있는 계정**을 정리하기 위한 것이다.
 *
 * 이미 해시된 값은 건너뛰므로 몇 번을 돌려도 안전하다(중복 해싱 없음).
 * 원래 비밀번호는 해시에서 복원할 수 없으므로, 변환 후에는 사용자가 기존 비밀번호로
 * 로그인하는 데 아무 문제가 없지만 관리자도 값을 볼 수 없게 된다(그게 목적이다).
 *
 *   npm run db:hash-passwords            # 변환 실행
 *   npm run db:hash-passwords -- --dry   # 변환 없이 대상만 확인
 */
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { isHashed, hashPassword } from "../src/lib/password";

// Prisma CLI 와 달리 이 스크립트는 .env 를 자동으로 읽지 않는다.
// 배포 환경에는 .env 가 없고 플랫폼 환경변수가 이미 주입돼 있다(플랫폼 값이 우선).
if (existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* 형식이 깨진 .env 는 무시한다 */
  }
}

const DRY_RUN = process.argv.includes("--dry");

async function main() {
  const prisma = new PrismaClient({ log: ["error"] });
  try {
    const accounts = await prisma.account.findMany({ select: { id: true, email: true, password: true } });
    const plain = accounts.filter((a) => !isHashed(a.password));

    console.log(`계정 ${accounts.length}개 · 해시 완료 ${accounts.length - plain.length}개 · 평문 ${plain.length}개`);
    if (plain.length === 0) {
      console.log("변환할 계정이 없습니다.");
      return;
    }

    for (const acc of plain) {
      if (DRY_RUN) {
        console.log(`  (dry) ${acc.email}`);
        continue;
      }
      await prisma.account.update({ where: { id: acc.id }, data: { password: await hashPassword(acc.password) } });
      console.log(`  ✓ ${acc.email}`);
    }

    console.log(DRY_RUN ? "\n--dry 모드 — 아무것도 바꾸지 않았습니다." : `\n${plain.length}개 계정을 해시로 변환했습니다.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
