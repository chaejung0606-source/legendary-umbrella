// 소모품 입출고/조정 이력 회귀 — 뮤테이션을 직접 호출한다(브라우저 아님).
//   입고/출고/조정이 ConsumableTxn 이력으로 정확히 남고(방향·처리후재고·사유·기록자),
//   재고 수량이 이력과 일치하는지 검증한다.
//
// 앱과 같은 DATABASE_URL 필요. **운영 DB 에는 절대 돌리지 말 것** — 테스트 데이터를 만든다.
//   npm run e2e:consumable
import { existsSync } from "node:fs";
if (existsSync(".env")) { try { process.loadEnvFile(".env"); } catch { /* */ } }
const { PrismaClient } = await import("@prisma/client");
const { createConsumableItem, consumableTxn } = await import("@/data/mutations");

const prisma = new PrismaClient();
const results: boolean[] = [], fails: string[] = [];
const log = (n: string, ok: boolean, d = "") => { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? "PASS" : "FAIL"} — ${n}${d ? ` :: ${d}` : ""}`); };

let itemId = "";
try {
  const created = await createConsumableItem({ itemName: "[E2E] 이력테스트품목", unit: "개", currentQty: 0, safetyQty: 5, unitPrice: 100 });
  if ("error" in created) throw new Error(created.error);
  itemId = created.id;

  // 입고 50
  await consumableTxn(itemId, "in", 50, "신규 구매", "[E2E] 관리자");
  // 출고 20
  await consumableTxn(itemId, "out", 20, "연구실 지급", "[E2E] 관리자");
  // 조정: 실사 결과 25 (현재 30 → -5)
  await consumableTxn(itemId, "adjust", 25, "재물조사", "[E2E] 관리자");

  const item = await prisma.consumableItem.findUnique({ where: { id: itemId } });
  const txns = await prisma.consumableTxn.findMany({ where: { itemId }, orderBy: { createdAt: "asc" } });

  log("이력 3건 기록", txns.length === 3, `${txns.length}건`);
  const [t1, t2, t3] = txns;
  log("입고: +방향·처리후 50·사유·기록자", t1?.type === "입고" && t1?.direction === 1 && t1?.qty === 50 && t1?.balanceAfter === 50 && t1?.reason === "신규 구매" && t1?.createdBy === "[E2E] 관리자");
  log("출고: -방향·처리후 30", t2?.type === "출고" && t2?.direction === -1 && t2?.qty === 20 && t2?.balanceAfter === 30);
  log("조정: 증감 5 기록·처리후 25", t3?.type === "조정" && t3?.direction === -1 && t3?.qty === 5 && t3?.balanceAfter === 25);
  log("현재 재고 = 마지막 처리후 재고", item?.currentQty === 25, `재고 ${item?.currentQty}`);

  // 재고보다 많은 출고는 거부되고 이력도 남지 않아야
  const before = (await prisma.consumableTxn.count({ where: { itemId } }));
  const over = await consumableTxn(itemId, "out", 9999, "과다 출고", "[E2E]");
  const after = (await prisma.consumableTxn.count({ where: { itemId } }));
  log("재고 초과 출고 거부 + 이력 미기록", "error" in over && after === before);
} finally {
  if (itemId) {
    await prisma.consumableTxn.deleteMany({ where: { itemId } }).catch(() => {});
    await prisma.consumableItem.delete({ where: { id: itemId } }).catch(() => {});
  }
  await prisma.$disconnect();
}
const pass = results.filter(Boolean).length;
console.log(`\n===== 소모품 이력: ${pass}/${results.length} PASS =====`);
if (fails.length) console.log("실패:", fails.join(" · "));
process.exit(pass === results.length ? 0 : 1);
