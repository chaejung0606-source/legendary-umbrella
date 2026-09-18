// 홍보 출고완료 동시성 회귀 — 같은 승인 건을 동시에/중복으로 출고완료해도 재고가 한 번만 차감돼야 한다.
//
// 배경: completePromoRequest 가 "출고 기록 생성"과 "신청 상태 변경"을 분리된 두 단계로 하던 때,
//   두 관리자 동시 클릭·재시도로 같은 승인 건이 두 번 출고돼 재고가 이중 차감될 수 있었다.
//   상태 CAS(updateMany where status='승인')로 한 호출만 선점하도록 고친 뒤의 회귀 테스트다.
//
// 실제 뮤테이션을 직접 호출한다(브라우저 아님). 앱과 같은 DATABASE_URL 이 필요하며,
// **운영 DB 에는 절대 돌리지 말 것** — 테스트용 신청/수불 기록을 만든다.
//   npm run e2e:promo
import { existsSync } from "node:fs";
if (existsSync(".env")) { try { process.loadEnvFile(".env"); } catch { /* */ } }
const { PrismaClient } = await import("@prisma/client");
const { promoTxn, createPromoRequest, decidePromoRequest, completePromoRequest } = await import("@/data/mutations");

const prisma = new PrismaClient();
const balance = async (itemId: string) =>
  (await prisma.promoTxn.findMany({ where: { itemId }, select: { qty: true, direction: true } }))
    .reduce((s, r) => s + r.direction * r.qty, 0);

const results: boolean[] = [];
const log = (n: string, ok: boolean, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} — ${n}${d ? ` :: ${d}` : ""}`); };
const QTY = 3;

try {
  const item = await prisma.promoItem.findFirst({ orderBy: { code: "asc" } });
  if (!item) throw new Error("홍보물품이 없습니다.");
  await promoTxn({ itemId: item.id, date: "2026-01-01", type: "최초입고", qty: 100, purpose: "[E2E] 동시성 준비" });
  const before = await balance(item.id);

  const req = await createPromoRequest({ itemId: item.id, qty: QTY, outType: "행사 배부", purpose: "[E2E] 동시성", requesterName: "[E2E] 테스터" });
  if ("error" in req) throw new Error("신청 생성: " + req.error);
  const approve = await decidePromoRequest(req.id, "승인", "[E2E] 관리자");
  if ("error" in approve) throw new Error("승인: " + approve.error);

  // 같은 승인 건을 동시에 두 번 출고완료
  const [r1, r2] = await Promise.all([
    completePromoRequest(req.id, "관리자A"),
    completePromoRequest(req.id, "관리자B"),
  ]);
  const after = await balance(item.id);
  const oks = [r1, r2].filter((r) => "ok" in r).length;
  const rejected = [r1, r2].some((r) => "error" in r);
  const finalReq = await prisma.promoRequest.findUnique({ where: { id: req.id } });

  log("재고는 신청 수량만큼만 1회 차감", before - after === QTY, `${before} → ${after} (기대 차감 ${QTY})`);
  log("출고완료 성공은 정확히 1건", oks === 1, `성공 ${oks}`);
  log("나머지 호출은 거부", rejected, JSON.stringify([r1, r2]));
  log("신청 상태 출고완료 + 수불 연결", finalReq?.status === "출고완료" && !!finalReq?.txnId, `${finalReq?.status}`);

  // 정리
  if (finalReq?.txnId) await prisma.promoTxn.deleteMany({ where: { id: finalReq.txnId } });
  await prisma.promoRequest.delete({ where: { id: req.id } }).catch(() => {});
  await prisma.promoTxn.deleteMany({ where: { itemId: item.id, purpose: "[E2E] 동시성 준비" } });
} finally {
  await prisma.$disconnect();
}
const pass = results.filter(Boolean).length;
console.log(`\n===== 홍보 출고 동시성: ${pass}/${results.length} PASS =====`);
process.exit(pass === results.length ? 0 : 1);
