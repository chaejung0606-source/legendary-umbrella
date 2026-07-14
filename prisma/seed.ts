import { PrismaClient } from "@prisma/client";
import seedData from "./seed-data.json";
import promoSeed from "./promo-seed.json";

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
        permissions: ["dashboard", "assets", "loans", "consumables", "promo", "rfid", "settings"],
        active: true,
        createdAt: new Date().toISOString(),
      },
    });
    console.log("  ✓ 기본 관리자 계정 생성 (accounts 비어 있었음)");
  }

  // 기존 계정에 신규 메뉴(promo) 권한 부여 — 감사자(auditor) 제외, 이미 있으면 무변경
  const accounts = await prisma.account.findMany();
  for (const acc of accounts) {
    if (acc.role !== "auditor" && !acc.permissions.includes("promo")) {
      await prisma.account.update({
        where: { id: acc.id },
        data: { permissions: [...acc.permissions, "promo"] },
      });
      console.log(`  ✓ 계정 ${acc.email} 에 홍보물품 메뉴 권한 추가`);
    }
  }

  // 홍보물품: 테이블이 비어 있을 때만 엑셀 이관 데이터 삽입 (편집 데이터 보존)
  if ((await prisma.promoItem.count()) === 0) {
    const promo = promoSeed as unknown as { items: object[]; txns: object[] };
    await prisma.promoItem.createMany({ data: promo.items as never });
    await prisma.promoTxn.createMany({ data: promo.txns as never });
    console.log(`  ✓ 홍보물품 이관: items ${promo.items.length} · txns ${promo.txns.length}`);
  }

  // 앱 설정 기본값: 없을 때만 생성 (사용자 편집값 보존)
  // 2026-07-14 A1에 "진짜" IMPORTDATA 수식 + 서식(제목행 스타일·날짜·천단위 쉼표)이
  // 포함된 시트 (XLSX 변환 방식). 이전 CSV 방식 시트들은 수식이 텍스트로 저장돼 동작하지 않았다.
  const DEFAULT_SETTINGS: Record<string, string> = {
    publicBaseUrl: "https://sadan-asset-platform.vercel.app",
    "sheet.assets.url": "https://docs.google.com/spreadsheets/d/1syITPiok7gFsAYW5nwMhuLhbUt2adFNvKIsg5I2IP8Q/edit",
    "sheet.loans.url": "https://docs.google.com/spreadsheets/d/18TKjmH_tXZngJvdPb4Fyv2QMXV5YQXJ7VpKIjke6gNI/edit",
    "sheet.materials.url": "https://docs.google.com/spreadsheets/d/12niFsSowEslx2xFQCjhpxREZWP5X7E5QmyA0ohRbMr8/edit",
    "sheet.promo.url": "https://docs.google.com/spreadsheets/d/1OJVUcXNxXo_hNSzuqMTNcMbaVzxT1mk-sHuXrJGHjxI/edit",
  };
  // 예전 시트(수식이 텍스트였거나 서식 없음) ID — 설정값이 이 시트를 가리키고 있으면 새 시트로 교체.
  // 사용자가 직접 다른 URL 로 바꾼 경우에는 건드리지 않는다.
  const STALE_SHEET_IDS = [
    "1Kf37a1nNm0vEwxd3DtQ7G18cNofJz0FDLsVy549_HXY", "1Ew-paU_bEjmbE8wyKy-9PIpvOH4KMpVKGLnuvnlfYcI",
    "1OPtbs8Af_YyhkExNKiTWz5dLzxggrnK42UCws032emU", "1nzHpBsADzBQHzDgbAEScB2rAVBR54QKtSqvgpgKg2A4",
    "1p5ku6aSP7MNasBxUMRQOp0hhMVrtLLFhTN3frmHwW-w", "16DNlw4qGW4WcH7qSJx3t8-Z-mB-vFMdzDtMk9lrl-eM",
    "1XZK10Q4tUxZuP8tKHdZnMbRLpWPxBr1rRx0LjYZLN68", "12bP8SzCxAvLQ5OXU_r7EWxw5CrWgNpeGnSMrI-2OKRE",
    "1RRewYMdk9hH-nLcQJiMPYSVipvorYdE2zN1vtJ0u5sU", "1o1-BjamkIooxYl1pQ6gRmaIQWCtx_iW7GmhZyTMGYy0",
    "1ff3TMbTVxg8yrWxA2DMkpwcX17A1BMLGP6cuDy3fZFU", "11j9SpCxCkmdwKOTX0_QBdox6oF1gJbItdbNjoR48iBw",
  ];
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = await prisma.appSetting.findUnique({ where: { key } });
    if (!exists) {
      await prisma.appSetting.create({ data: { key, value } });
    } else if (STALE_SHEET_IDS.some((id) => exists.value.includes(id)) && exists.value !== value) {
      await prisma.appSetting.update({ where: { key }, data: { value } });
      console.log(`  ✓ 앱 설정 ${key} 를 새 구글시트로 교체`);
    }
  }

  console.log("Seed done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
