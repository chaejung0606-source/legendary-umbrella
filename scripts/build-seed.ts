/**
 * 실제 자산관리대장(.xlsm)을 파싱해 prisma/seed-data.json 을 생성한다.
 * 사용: npx tsx scripts/build-seed.ts <xlsm 경로>
 * 생성된 JSON 이 시드의 단일 소스가 된다 (관리번호는 파일의 보존값 그대로).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readWorkbook, parseWorkbook } from "../src/lib/excel/parse";

const SRC = process.argv[2];
if (!SRC) { console.error("usage: tsx scripts/build-seed.ts <xlsm>"); process.exit(1); }

// 시드 타임스탬프는 파일 기준일로 고정(결정적) — 대장 파일명 기준 2026-06-11
const TS = "2026-06-11T09:00:00.000Z";

const USAGE_SET = new Set(["개인사용", "좌석사용", "사무실보관", "대여용", "소모품", "미확인"]);
const normalizeUsage = (v: string) => {
  const c = (v ?? "").replace(/\s+/g, "");
  return USAGE_SET.has(c) ? c : "미확인";
};

const wb = readWorkbook(readFileSync(SRC));
const p = parseWorkbook(wb);

const assets = p.assets.map((a, i) => ({
  id: `asset-${a.serialNo ?? i + 1}`,
  legacyRowNo: a.serialNo,
  expenditureDocument: a.expenseDoc,
  managingOrganization: a.managingOrg,
  majorCategory: a.majorCategory ?? "기타자산",
  middleCategory: a.middleCategory ?? "기타자산",
  classificationCode: a.classificationCode,
  acquiredDate: a.acquiredAt ? a.acquiredAt.toISOString().slice(0, 10) : null,
  itemName: a.itemName,
  specification: a.spec,
  unitPrice: a.unitPrice,
  sequenceNo: a.itemNo,
  place: a.place,
  roomName: a.room,
  buildingCode: a.buildingCode,
  generatedManagementNo: a.generatedManagementNo,
  lockedManagementNo: a.lockedManagementNo ?? a.generatedManagementNo,
  schoolRfidNo: a.rfid,
  usageType: normalizeUsage(a.usageType),
  currentUserName: a.assigneeName && a.assigneeName.length > 1 ? a.assigneeName : null,
  currentLocationNote: a.assigneeName && a.assigneeName.length === 1 ? `${a.assigneeName}좌석` : a.usageRaw,
  tagStatus: a.tagStatus === "none" ? "미지정" : a.tagStatus,
  assetStatus: "정상",
  memo: a.note,
  createdAt: TS,
  updatedAt: TS,
  deletedAt: null,
}));

const byMgmt = new Map(assets.filter((a) => a.lockedManagementNo).map((a) => [a.lockedManagementNo!, a]));

const loans = p.notebooks.flatMap((n, i) => {
  const asset = byMgmt.get(n.managementNo);
  if (!asset) return [];
  const status = n.status === "직원사용" ? "직원사용" : "보관";
  if (status === "직원사용") {
    asset.assetStatus = "대여중";
    asset.currentUserName = n.holder ?? asset.currentUserName;
  } else {
    asset.assetStatus = "보관중";
  }
  return [{
    id: `loan-${asset.id}`,
    assetId: asset.id,
    managementNo: n.managementNo,
    itemName: asset.itemName || `사업단 노트북 #${n.notebookNo ?? i + 1}`,
    status,
    userName: n.holder,
    loanedAt: status === "직원사용" ? "2026-06-11" : null,
    dueAt: null,
    returnedAt: null,
    note: n.note && n.note !== n.holder ? n.note : null,
    isNotebook: true,
  }];
});

const consumables = p.materials.map((m, i) => ({
  id: `con-${i + 1}`,
  itemName: m.itemName,
  specification: m.spec,
  unitPrice: m.unitPrice,
  currentQty: m.qty,
  safetyQty: 0,
  unit: "개",
  location: m.location,
  roomName: m.room,
  expenditureDocument: m.expenseDoc,
  lastInboundAt: m.acquiredAt ? m.acquiredAt.toISOString().slice(0, 10) : null,
  lastOutboundAt: null,
  status: m.qty === 0 ? "소진" : "정상",
}));

const SLOT_LABEL: Record<string, string> = { desktop: "데스크톱", monitor: "모니터", printer: "프린터", phone: "전화기" };
const seats = p.seats.map((s) => ({
  id: `seat-${s.code}`,
  code: s.code,
  occupantName: s.occupantName,
  assets: s.slots.map((sl) => ({ slot: sl.slot, label: SLOT_LABEL[sl.slot], rawValue: sl.rawValue, needsReview: sl.needsReview })),
}));

// 기준정보 — 파일의 자산분류/건축물 시트 그대로
const categories = p.majors.map((maj) => ({
  id: `maj-${maj.code}`,
  code: maj.code,
  name: maj.name,
  middles: p.middles
    .filter((mid) => mid.majorCode === maj.code)
    .map((mid, idx) => ({
      id: `mid-${maj.code}-${mid.code}-${idx}`,
      code: mid.code,
      name: mid.name,
      detailItems: mid.detailItems ? mid.detailItems.split(",").map((s) => s.trim()).filter(Boolean) : [],
    })),
}));

const buildings = p.buildings.map((b) => ({ id: `b-${b.code}`, code: b.code, campus: b.campus, name: b.name }));

const out = { version: 2, source: "자산관리대장 260611", assets, loans, consumables, seats, categories, buildings };
const dest = join(__dirname, "..", "prisma", "seed-data.json");
writeFileSync(dest, JSON.stringify(out));
console.log("written:", dest);
console.log("assets:", assets.length, "loans:", loans.length, "consumables:", consumables.length, "seats:", seats.length, "categories:", categories.length, "(middles:", categories.reduce((n, c) => n + c.middles.length, 0), ") buildings:", buildings.length);
console.log("mgmtNo 일치 검증:", assets.every((a) => !a.generatedManagementNo || a.generatedManagementNo === a.lockedManagementNo) ? "OK(전건 일치)" : "불일치 존재(보존값 우선 저장)");
