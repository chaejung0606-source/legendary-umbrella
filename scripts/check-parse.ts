// Scratch verification of the pure parser against a source workbook.
// Usage: tsx scripts/check-parse.ts <path-to.xlsm>
import { readWorkbook, parseWorkbook } from "../src/lib/excel/parse";
import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: tsx scripts/check-parse.ts <file.xlsm>");
  process.exit(1);
}
const buf = fs.readFileSync(path);
const wb = readWorkbook(buf);
const p = parseWorkbook(wb);

const errors = p.issues.filter((i) => i.severity === "error");
const warnings = p.issues.filter((i) => i.severity === "warning");
const totalAcq = p.assets.reduce((s, a) => s + a.unitPrice, 0);
const mgmtMatch = p.assets.filter((a) => a.lockedManagementNo && a.lockedManagementNo === a.generatedManagementNo).length;
const mgmtMismatch = p.assets.filter((a) => a.managementNoMismatch).length;
const withLocked = p.assets.filter((a) => a.lockedManagementNo).length;
const distinctMgmt = new Set(p.assets.map((a) => a.lockedManagementNo).filter(Boolean)).size;
const withRfid = p.assets.filter((a) => a.rfid).length;
const usageBreakdown: Record<string, number> = {};
for (const a of p.assets) usageBreakdown[a.usageType] = (usageBreakdown[a.usageType] ?? 0) + 1;

console.log("─── PARSE RESULT ───────────────────────────────");
console.log("sheets present     :", p.sheetsPresent.length);
console.log("assets (품명 보유) :", p.assets.length, "  (expected 906)");
console.log("skipped blank rows :", p.skippedAssetRows, "  (expected 15)");
console.log("locked mgmt nos    :", withLocked, " distinct:", distinctMgmt, "  dup:", withLocked - distinctMgmt);
console.log("generated==locked  :", mgmtMatch, "/", withLocked);
console.log("mgmt mismatch flags:", mgmtMismatch);
console.log("assets w/ RFID     :", withRfid);
console.log("total acquisition  :", totalAcq.toLocaleString("ko-KR"), "원  (expected 1,171,911,757)");
console.log("majors             :", p.majors.length);
console.log("middles            :", p.middles.length);
console.log("buildings          :", p.buildings.length, "  (expected 238)");
console.log("seats              :", p.seats.length, "  (expected 15: A~O)");
console.log("notebooks          :", p.notebooks.length, "  (expected 45)");
console.log("  notebook status  :", JSON.stringify(p.notebooks.reduce((m: Record<string, number>, n) => ((m[n.status] = (m[n.status] ?? 0) + 1), m), {})));
console.log("materials          :", p.materials.length);
console.log("  w/ data issue    :", p.materials.filter((m) => m.hasDataIssue).length);
console.log("usage breakdown    :", JSON.stringify(usageBreakdown));
console.log("issues             : errors=", errors.length, " warnings=", warnings.length, " info=", p.issues.length - errors.length - warnings.length);
console.log("─── sample mgmt-number dup errors (file-internal) ───");
errors.slice(0, 5).forEach((e) => console.log("  ", e.rowNo, e.field, e.message, e.rawValue));
console.log("─── RFID dup warnings ───");
p.issues.filter((i) => i.field === "RFID번호").slice(0, 5).forEach((e) => console.log("  ", e.message, "->", e.rawValue));

// assertions
const ok =
  p.assets.length === 906 &&
  p.skippedAssetRows === 15 &&
  distinctMgmt === withLocked &&
  errors.length === 0 &&
  p.buildings.length === 238 &&
  p.seats.length === 15 &&
  p.notebooks.length === 45;
console.log("\nASSERTIONS:", ok ? "✅ PASS" : "❌ FAIL");
process.exit(ok ? 0 : 1);
