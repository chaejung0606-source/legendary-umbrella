import { PrismaClient } from "@prisma/client";
import { generateDataset } from "../src/data/generate";

// 최초 1회만 더미 데이터를 DB에 시드한다. 각 테이블은 비어 있을 때만 채우므로
// 재배포(재시드)해도 사용자가 편집한 데이터는 유지된다(idempotent).
const prisma = new PrismaClient();

async function main() {
  const ds = generateDataset();

  if ((await prisma.account.count()) === 0) {
    await prisma.account.createMany({ data: ds.accounts });
    console.log(`  ✓ accounts ${ds.accounts.length}`);
  }

  if ((await prisma.majorCategory.count()) === 0) {
    for (const m of ds.categories) {
      await prisma.majorCategory.create({ data: { id: m.id, code: m.code, name: m.name } });
      if (m.middles.length) {
        await prisma.middleCategory.createMany({
          data: m.middles.map((mid) => ({
            id: mid.id, code: mid.code, name: mid.name, majorId: m.id, detailItems: mid.detailItems ?? [],
          })),
        });
      }
    }
    console.log(`  ✓ categories ${ds.categories.length}`);
  }

  if ((await prisma.building.count()) === 0) {
    await prisma.building.createMany({ data: ds.buildings.map((b) => ({ id: b.id, code: b.code, campus: b.campus, name: b.name })) });
    console.log(`  ✓ buildings ${ds.buildings.length}`);
  }

  if ((await prisma.asset.count()) === 0) {
    await prisma.asset.createMany({ data: ds.assets.map((a) => ({ ...a })) });
    console.log(`  ✓ assets ${ds.assets.length}`);
  }

  if ((await prisma.laptopLoan.count()) === 0) {
    await prisma.laptopLoan.createMany({ data: ds.laptopLoans.map((l) => ({ ...l })) });
    console.log(`  ✓ laptopLoans ${ds.laptopLoans.length}`);
  }

  if ((await prisma.consumableItem.count()) === 0) {
    await prisma.consumableItem.createMany({ data: ds.consumables.map((c) => ({ ...c })) });
    console.log(`  ✓ consumables ${ds.consumables.length}`);
  }

  if ((await prisma.seat.count()) === 0) {
    await prisma.seat.createMany({
      data: ds.seats.map((s) => ({ id: s.id, code: s.code, occupantName: s.occupantName ?? null, assets: s.assets as object })),
    });
    console.log(`  ✓ seats ${ds.seats.length}`);
  }

  console.log("Seed done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
