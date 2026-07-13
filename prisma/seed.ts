import { PrismaClient } from "@prisma/client";
import seedData from "./seed-data.json";

/**
 * 시드 정책 (버전드):
 * - 데이터 소스는 실제 자산관리대장에서 생성한 prisma/seed-data.json (관리번호 = 파일 보존값).
 * - SeedMeta.seedVersion < seed-data.version 이면 자산/대여/소모품/좌석/기준정보를
 *   파일 기준으로 교체한다. 같으면 아무것도 건드리지 않는다 → 이후 편집 데이터 보존.
 * - 계정(Account)은 어떤 경우에도 삭제하지 않는다. 비어 있을 때만 기본 관리자 1개 생성.
 */
const prisma = new PrismaClient();

const DATA = seedData as unknown as {
  version: number;
  assets: object[];
  loans: object[];
  consumables: object[];
  seats: { id: string; code: string; occupantName: string | null; assets: object }[];
  categories: { id: string; code: number; name: string; middles: { id: string; code: number; name: string; detailItems: string[] }[] }[];
  buildings: object[];
};

async function main() {
  const meta = await prisma.seedMeta.findUnique({ where: { key: "seedVersion" } });
  const current = meta ? Number(meta.value) : 0;

  if (current < DATA.version) {
    console.log(`Reseeding data v${current} → v${DATA.version} (자산관리대장 기준, 계정은 보존)…`);
    await prisma.$transaction([
      prisma.laptopLoan.deleteMany({}),
      prisma.asset.deleteMany({}),
      prisma.consumableItem.deleteMany({}),
      prisma.seat.deleteMany({}),
      prisma.middleCategory.deleteMany({}),
      prisma.majorCategory.deleteMany({}),
      prisma.building.deleteMany({}),
    ]);
    await prisma.asset.createMany({ data: DATA.assets as never });
    await prisma.laptopLoan.createMany({ data: DATA.loans as never });
    await prisma.consumableItem.createMany({ data: DATA.consumables as never });
    await prisma.seat.createMany({ data: DATA.seats as never });
    for (const m of DATA.categories) {
      await prisma.majorCategory.create({ data: { id: m.id, code: m.code, name: m.name } });
      if (m.middles.length) {
        await prisma.middleCategory.createMany({
          data: m.middles.map((mid) => ({ ...mid, majorId: m.id })),
        });
      }
    }
    await prisma.building.createMany({ data: DATA.buildings as never });
    await prisma.seedMeta.upsert({
      where: { key: "seedVersion" },
      update: { value: String(DATA.version) },
      create: { key: "seedVersion", value: String(DATA.version) },
    });
    console.log(`  ✓ assets ${DATA.assets.length} · loans ${DATA.loans.length} · consumables ${DATA.consumables.length} · seats ${DATA.seats.length} · categories ${DATA.categories.length} · buildings ${DATA.buildings.length}`);
  } else {
    console.log(`Seed v${current} 최신 — 데이터 유지(편집 보존).`);
  }

  // 계정: 비어 있을 때만 기본 관리자 생성 (사용자 생성 계정은 절대 건드리지 않음)
  if ((await prisma.account.count()) === 0) {
    await prisma.account.create({
      data: {
        id: "acc-1",
        name: process.env.SEED_ADMIN_NAME ?? "시스템 관리자",
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@sadan.local",
        password: process.env.SEED_ADMIN_PASSWORD ?? "admin1234",
        role: "admin",
        permissions: ["dashboard", "assets", "assets.create", "imports", "loans", "consumables", "rfid", "seats", "reports", "settings"],
        active: true,
        createdAt: new Date().toISOString(),
      },
    });
    console.log("  ✓ 기본 관리자 계정 생성 (accounts 비어 있었음)");
  }

  console.log("Seed done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
