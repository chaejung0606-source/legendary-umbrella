/**
 * E2E 신청자 테스트 계정을 만든다(이미 있으면 갱신).
 *
 * e2e/applicant.e2e.mjs 는 신청자 역할 계정을 전제로 하는데, 계정 이름이
 * `[E2E-TEST] 신청자` 여야 홍보 신청 취소(본인 확인: requesterName === 계정 이름)까지 통과한다.
 * 이 조건을 매번 손으로 맞추다 틀리기 쉬워 스크립트로 고정한다.
 *
 * 운영 DB 에서는 절대 실행하지 말 것 — 테스트 전용 계정을 만든다.
 * 값은 모두 환경변수로 덮어쓸 수 있다(저장소에 운영 계정 정보를 두지 않는다).
 *
 *   npm run db:seed-e2e
 */
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

if (existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* 형식이 깨진 .env 는 무시한다 */
  }
}

const EMAIL = process.env.E2E_EMAIL ?? "applicant@e2e.local";
const PASSWORD = process.env.E2E_PW ?? "test1234";
const NAME = process.env.E2E_NAME ?? "[E2E-TEST] 신청자";
const PERMISSIONS = ["dashboard", "assets", "loans", "consumables", "promo"];

async function main() {
  const prisma = new PrismaClient({ log: ["error"] });
  try {
    const password = await hashPassword(PASSWORD);
    const base = { name: NAME, password, role: "user", permissions: PERMISSIONS, active: true };
    await prisma.account.upsert({
      where: { email: EMAIL },
      update: base,
      create: { id: "acc-e2e-applicant", email: EMAIL, createdAt: new Date().toISOString(), ...base },
    });
    console.log(`E2E 신청자 계정 준비 완료: ${EMAIL} (${NAME})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
