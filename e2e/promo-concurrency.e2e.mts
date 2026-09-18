// 홍보 동시성/방어 회귀 — 뮤테이션을 직접 호출한다(브라우저 아님).
//   1) 출고완료: 같은 승인 건 동시/중복 처리 시 재고 1회만 차감 (CAS)
//   2) 승인: 같은 물품의 서로 다른 신청을 동시 승인해도 예약 합이 재고를 넘지 않음 (Serializable)
//   3) 단가·안전재고 음수 → 0 으로 정규화
//
// 앱과 같은 DATABASE_URL 필요. **운영 DB 에는 절대 돌리지 말 것** — 테스트 데이터를 만든다.
//   npm run e2e:promo
import { existsSync } from "node:fs";
if (existsSync(".env")) { try { process.loadEnvFile(".env"); } catch { /* */ } }
const { PrismaClient } = await import("@prisma/client");
const { promoTxn, createPromoItem, createPromoRequest, decidePromoRequest, completePromoRequest } = await import("@/data/mutations");

const prisma = new PrismaClient();
const balance = async (itemId: string) =>
  (await prisma.promoTxn.findMany({ where: { itemId }, select: { qty: true, direction: true } }))
    .reduce((s, r) => s + r.direction * r.qty, 0);
const results: boolean[] = [], fails: string[] = [];
const log = (n: string, ok: boolean, d = "") => { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? "PASS" : "FAIL"} — ${n}${d ? ` :: ${d}` : ""}`); };
const uniqCode = () => "Z" + Date.now().toString(36).slice(-5).toUpperCase();

try {
  // ── 1) 출고완료 이중 차감 방지 ──
  {
    const item = await prisma.promoItem.findFirst({ orderBy: { code: "asc" } });
    if (!item) throw new Error("홍보물품 없음");
    await promoTxn({ itemId: item.id, date: "2026-01-01", type: "최초입고", qty: 100, purpose: "[E2E] 준비" });
    const before = await balance(item.id);
    const req = await createPromoRequest({ itemId: item.id, qty: 3, outType: "행사 배부", purpose: "[E2E] 출고완료", requesterName: "[E2E]" });
    if ("error" in req) throw new Error(req.error);
    await decidePromoRequest(req.id, "승인", "[E2E]");
    const [c1, c2] = await Promise.all([completePromoRequest(req.id, "A"), completePromoRequest(req.id, "B")]);
    const after = await balance(item.id);
    log("출고완료 재고 1회만 차감", before - after === 3, `${before}→${after}`);
    log("출고완료 성공 1건 · 나머지 거부", [c1, c2].filter((r) => "ok" in r).length === 1 && [c1, c2].some((r) => "error" in r));
    const fr = await prisma.promoRequest.findUnique({ where: { id: req.id } });
    if (fr?.txnId) await prisma.promoTxn.deleteMany({ where: { id: fr.txnId } });
    await prisma.promoRequest.delete({ where: { id: req.id } }).catch(() => {});
    await prisma.promoTxn.deleteMany({ where: { itemId: item.id, purpose: "[E2E] 준비" } });
  }

  // ── 2) 동시 승인 초과 예약 방지 ──
  {
    const code = uniqCode();
    const created = await createPromoItem({ code, name: "[E2E] 동시승인", unit: "개" });
    if ("error" in created) throw new Error(created.error);
    const itemId = created.id;
    await promoTxn({ itemId, date: "2026-01-01", type: "최초입고", qty: 5, purpose: "[E2E] 승인준비" });
    const r1 = await createPromoRequest({ itemId, qty: 3, outType: "행사 배부", purpose: "[E2E] 승인1", requesterName: "[E2E]" });
    const r2 = await createPromoRequest({ itemId, qty: 3, outType: "행사 배부", purpose: "[E2E] 승인2", requesterName: "[E2E]" });
    if ("error" in r1 || "error" in r2) throw new Error("신청 생성 실패");
    const [a1, a2] = await Promise.all([decidePromoRequest(r1.id, "승인", "A"), decidePromoRequest(r2.id, "승인", "B")]);
    const okCount = [a1, a2].filter((r) => "ok" in r).length;
    const approvedSum = (await prisma.promoRequest.aggregate({ _sum: { qty: true }, where: { itemId, status: "승인" } }))._sum.qty ?? 0;
    log("동시 승인 중 1건만 성공(3+3 > 재고 5)", okCount === 1, `성공 ${okCount}`);
    log("예약 합계 ≤ 재고", approvedSum <= 5, `예약 ${approvedSum} ≤ 5`);
    // 정리
    await prisma.promoRequest.deleteMany({ where: { itemId } });
    await prisma.promoTxn.deleteMany({ where: { itemId } });
    await prisma.promoItem.delete({ where: { id: itemId } }).catch(() => {});
  }

  // ── 3) 단가·안전재고 음수 정규화 ──
  {
    const code = uniqCode();
    const created = await createPromoItem({ code, name: "[E2E] 음수단가", unit: "개", unitPrice: -100, safetyQty: -5 });
    if ("error" in created) throw new Error(created.error);
    log("음수 단가·안전재고 → 0 정규화", created.unitPrice === 0 && created.safetyQty === 0, `단가 ${created.unitPrice}, 안전 ${created.safetyQty}`);
    await prisma.promoItem.delete({ where: { id: created.id } }).catch(() => {});
  }
} finally {
  await prisma.$disconnect();
}
const pass = results.filter(Boolean).length;
console.log(`\n===== 홍보 동시성/방어: ${pass}/${results.length} PASS =====`);
if (fails.length) console.log("실패:", fails.join(" · "));
process.exit(pass === results.length ? 0 : 1);
