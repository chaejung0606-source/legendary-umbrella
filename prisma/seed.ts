import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// 초기 계정 + 기준정보 일부 시드. 화면은 더미 데이터(src/data)로 동작하므로
// 이 시드는 추후 실제 연동 시 출발점이다.
const prisma = new PrismaClient();

const USERS = [
  { email: process.env.SEED_ADMIN_EMAIL ?? "admin@sadan.local", name: process.env.SEED_ADMIN_NAME ?? "시스템 관리자", role: "admin", pw: process.env.SEED_ADMIN_PASSWORD ?? "admin1234" },
  { email: "manager@sadan.local", name: "자산담당자", role: "asset_manager", pw: "demo1234" },
  { email: "auditor@sadan.local", name: "감사담당", role: "auditor", pw: "demo1234" },
  { email: "user@sadan.local", name: "일반사용자", role: "user", pw: "demo1234" },
];

const MAJORS: { code: number; name: string; middles: { code: number; name: string }[] }[] = [
  { code: 4, name: "가구", middles: [{ code: 401, name: "책상" }, { code: 404, name: "의자" }, { code: 410, name: "파티션" }] },
  { code: 5, name: "사무용장비", middles: [{ code: 501, name: "컴퓨터" }, { code: 503, name: "출력장비" }] },
  { code: 7, name: "전산장비", middles: [{ code: 701, name: "서버" }, { code: 702, name: "스토리지" }] },
];

const BUILDINGS = [
  { code: "B0000142", campus: "강원대학교 춘천캠퍼스", name: "집현관(제2도서관)" },
  { code: "B0000038", campus: "강원대학교 춘천캠퍼스", name: "보듬관" },
];

async function main() {
  console.log("Seeding users…");
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: { email: u.email, name: u.name, role: u.role, isActive: true, passwordHash: await bcrypt.hash(u.pw, 10) },
    });
    console.log(`  ✓ ${u.role.padEnd(14)} ${u.email}`);
  }

  console.log("Seeding 자산분류 코드…");
  for (const maj of MAJORS) {
    const major = await prisma.assetMajorCategory.upsert({
      where: { code: maj.code }, update: { name: maj.name }, create: { code: maj.code, name: maj.name },
    });
    for (const mid of maj.middles) {
      const exists = await prisma.assetMiddleCategory.findFirst({ where: { code: mid.code, name: mid.name, majorCategoryId: major.id } });
      if (!exists) await prisma.assetMiddleCategory.create({ data: { code: mid.code, name: mid.name, majorCategoryId: major.id } });
    }
  }

  console.log("Seeding 건축물 코드…");
  for (const b of BUILDINGS) {
    await prisma.building.upsert({ where: { code: b.code }, update: { name: b.name, campus: b.campus }, create: b });
  }

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
