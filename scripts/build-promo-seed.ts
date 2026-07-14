/**
 * 홍보물품 엑셀 2종을 파싱해 prisma/promo-seed.json 을 생성한다.
 *   파일1: 홍보물품관리대장(기념품 수량 현황) — 품목 행 + 하위 반출 행, 수식 재고
 *   파일2: 홍보물품 수불관리대장 — 물품별 시트(P/Q/R/U), 구분코드·납품일자·수량·보관장소
 * 사용: npx tsx scripts/build-promo-seed.ts <관리대장.xlsx> <수불관리대장.xlsx>
 * 병합 규칙: 물품명 기준 병합, 구분코드는 파일2 우선, 없으면 A부터 미사용 문자 자동 부여.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";

const [f1, f2] = process.argv.slice(2);
if (!f1 || !f2) { console.error("usage: tsx scripts/build-promo-seed.ts <관리대장> <수불대장>"); process.exit(1); }

const TS = "2026-07-13T09:00:00.000Z";
const num = (v: string) => Number(String(v).replace(/[^\d.-]/g, "")) || 0;
// "10/23/24" | "25-09-22" → YYYY-MM-DD
function toDate(v: string): string | null {
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); // M/D/YY
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/); // YY-MM-DD
  if (m) return `${m[1].length === 2 ? "20" + m[1] : m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

interface RawItem { name: string; buyDate: string | null; amount: number; inQty: number; note: string; outs: { date: string | null; qty: number; note: string }[]; }

// ── 파일1 파싱 ──
const wb1 = XLSX.readFile(f1, { cellDates: false });
const rows1 = XLSX.utils.sheet_to_json<string[]>(wb1.Sheets[wb1.SheetNames[0]], { header: 1, raw: false, defval: "" });
const items: RawItem[] = [];
let cur: RawItem | null = null;
for (const r of rows1.slice(2)) {
  const [seq, buyDate, name, amount, inQty, outDate, outQty, , note] = r.map((c) => String(c ?? "").trim());
  if (name && (seq || inQty)) {
    cur = { name, buyDate: toDate(buyDate), amount: num(amount), inQty: num(inQty), note: "", outs: [] };
    items.push(cur);
  } else if (name && !seq) {
    // 이름만 있는 계획 행 (코쇼 가방/키링/장우산 등)
    cur = { name, buyDate: null, amount: 0, inQty: 0, note: "구매 예정(대장 등재)", outs: [] };
    items.push(cur);
  } else if (cur && (outQty || outDate || note)) {
    if (outQty) cur.outs.push({ date: toDate(outDate), qty: num(outQty), note });
    else if (note && !cur.outs.length && !cur.note) cur.note = note; // 행사 예정 비고
  }
}

// ── 파일2 파싱 (시트별: 구분/물품명/납품일자/수량/보관장소) ──
const wb2 = XLSX.readFile(f2, { cellDates: false });
const deliveries: { code: string; name: string; date: string | null; qty: number; location: string }[] = [];
for (const sn of wb2.SheetNames) {
  const rows = XLSX.utils.sheet_to_json<string[]>(wb2.Sheets[sn], { header: 1, raw: false, defval: "" });
  const head = rows.find((r) => String(r[0]).trim() && String(r[0]).trim() !== "구분" && r[1]);
  if (!head) continue;
  deliveries.push({
    code: String(head[0]).trim(),
    name: String(head[1]).trim(),
    date: toDate(String(head[5] ?? "")),
    qty: num(String(head[6] ?? "")),
    location: String(head[8] ?? "").trim() || "집현관 102호",
  });
}

// ── 병합: 물품명 기준. 코드는 파일2 우선, 없으면 미사용 문자 자동 부여 ──
const usedCodes = new Set(deliveries.map((d) => d.code));
const codeFor = (() => {
  const alphabet = "ABCDEFGHIJKLMNOSTVWXYZ".split(""); // P/Q/R/U 는 파일2 소유
  let i = 0;
  return () => { while (usedCodes.has(alphabet[i])) i++; const c = alphabet[i]; usedCodes.add(c); return c; };
})();

interface SeedTxn { id: string; itemId: string; date: string; type: string; qty: number; direction: number; balanceAfter: number; purpose: string | null; eventName: string | null; takerName: null; receiverName: null; manager: null; docNo: null; unitPrice: number | null; amount: number | null; status: string; cancelOfId: null; cancelReason: null; createdBy: string; createdAt: string; }
const seedItems: object[] = [];
const seedTxns: SeedTxn[] = [];
let txnSeq = 0;

const names = new Set(items.map((i) => i.name));
for (const d of deliveries) if (!names.has(d.name)) items.push({ name: d.name, buyDate: d.date, amount: 0, inQty: 0, note: "", outs: [] });

for (const it of items) {
  const dl = deliveries.find((d) => d.name === it.name);
  const code = dl?.code ?? codeFor();
  const id = `promo-${code}`;
  const unitPrice = it.inQty > 0 ? Math.round(it.amount / it.inQty) : 0;
  seedItems.push({
    id, code, name: it.name, category: "기념품", spec: null, unit: "개",
    location: dl?.location ?? "집현관 102호", manager: null, vendor: null,
    purchasedAt: it.buyDate ?? dl?.date ?? null, totalAmount: it.amount, unitPrice,
    safetyQty: 0, status: "사용", docNo: null, note: it.note || null, createdAt: TS, updatedAt: TS,
  });

  // 수불 순서: 입고(구입→납품) 먼저, 그 다음 출고 — 원본에 출고일이 구입일보다 빠른 행이 있어도 재고가 음수가 되지 않게 기록
  let balance = 0;
  const push = (date: string, type: string, qty: number, dir: number, purpose: string | null, eventName: string | null, up: number | null, amt: number | null) => {
    balance += dir * qty;
    seedTxns.push({
      id: `ptxn-${++txnSeq}`, itemId: id, date, type, qty, direction: dir, balanceAfter: balance,
      purpose, eventName, takerName: null, receiverName: null, manager: null, docNo: null,
      unitPrice: up, amount: amt, status: "정상", cancelOfId: null, cancelReason: null,
      createdBy: "엑셀 이관", createdAt: TS,
    });
  };
  if (it.inQty > 0) push(it.buyDate ?? "2024-01-01", "최초입고", it.inQty, 1, "관리대장 구입 입고", null, unitPrice || null, it.amount || null);
  if (dl && dl.qty > 0) push(dl.date ?? "2025-01-01", it.inQty > 0 ? "추가입고" : "최초입고", dl.qty, 1, "수불관리대장 납품 입고", null, null, null);
  for (const o of it.outs) {
    if (o.qty <= 0) continue;
    push(o.date ?? it.buyDate ?? "2024-12-31", "출고", o.qty, -1, o.note || "행사 배부", o.note || null, null, null);
  }
}

// 수불 기록이 전혀 없는 품목은 관리대장의 구매 계획 행 — 비고로 표시
for (const it of seedItems as { id: string; note: string | null }[]) {
  if (!it.note && !seedTxns.some((t) => t.itemId === it.id)) it.note = "구매 예정(대장 등재)";
}

const out = { version: 1, items: seedItems, txns: seedTxns };
const dest = join(__dirname, "..", "prisma", "promo-seed.json");
writeFileSync(dest, JSON.stringify(out, null, 1));
console.log("written:", dest);
console.log("items:", seedItems.length, "txns:", seedTxns.length);
for (const t of seedTxns) if (t.balanceAfter < 0) console.log("⚠ 음수 재고:", t);
console.log((seedItems as { code: string; name: string }[]).map((i) => `${i.code}=${i.name}`).join(", "));