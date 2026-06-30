import * as XLSX from "xlsx";
import { SHEET } from "../constants";
import { classifyUsage } from "../usage";
import { generateManagementNo } from "../management-number";

// Pure workbook → structured rows parser. Deliberately free of any DB
// dependency so it can be unit-tested against the real .xlsm. Date serials are
// normalized, blank pre-numbered rows are detected, and a per-row validation
// report (file-internal only) is produced. Cross-checks against existing DB
// state (RFID/관리번호 already present) live in import.ts.

// ── primitive cell helpers ─────────────────────────────────────
function getCell(ws: XLSX.WorkSheet, row: number, col: number): unknown {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const cell = ws[addr];
  return cell ? cell.v : null;
}

function sheetBounds(ws: XLSX.WorkSheet): { maxRow: number; maxCol: number } {
  const ref = ws["!ref"];
  if (!ref) return { maxRow: 0, maxCol: 0 };
  const range = XLSX.utils.decode_range(ref);
  return { maxRow: range.e.r + 1, maxCol: range.e.c + 1 };
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Math.round(v);
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

// Excel serial / Date / string → Date normalized to noon UTC of its calendar
// date (avoids timezone-boundary drift while keeping the right Y-M-D).
export function normalizeExcelDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), 12));
  }
  if (typeof v === "number") {
    // 25569 = Excel serial for 1970-01-01 (epoch 1899-12-30 + 1900 leap bug)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  }
  const s = String(v).trim().replace(/[./]/g, "-");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
}

// ── parsed row shapes ──────────────────────────────────────────
export interface ParsedAsset {
  rowNo: number;
  serialNo: number | null;
  expenseDoc: string | null;
  managingOrg: string | null;
  majorCategory: string | null;
  middleCategory: string | null;
  classificationCode: number | null;
  acquiredAt: Date | null;
  itemName: string;
  spec: string | null;
  unitPrice: number;
  itemNo: number | null;
  place: string | null;
  room: string | null;
  buildingCode: string | null;
  lockedManagementNo: string | null;
  generatedManagementNo: string | null;
  managementNoMismatch: boolean;
  rfid: string | null;
  usageRaw: string | null;
  usageType: string;
  assigneeName: string | null;
  usageNeedsReview: boolean;
  tagStatus: string;
  note: string | null;
}

export interface ParsedMaterial {
  rowNo: number;
  serialNo: number | null;
  expenseDoc: string | null;
  managingOrg: string | null;
  acquiredAt: Date | null;
  itemName: string;
  spec: string | null;
  unitPrice: number;
  qty: number;
  location: string | null;
  room: string | null;
  hasDataIssue: boolean;
  dataIssueNote: string | null;
}

export interface ParsedMajor {
  code: number;
  name: string;
}
export interface ParsedMiddle {
  code: number;
  name: string;
  majorCode: number;
  majorName: string;
  detailItems: string;
}
export interface ParsedBuilding {
  code: string;
  name: string;
  campus: string;
}
export interface ParsedSeatSlot {
  slot: "desktop" | "monitor" | "printer" | "phone";
  rawValue: string | null;
  needsReview: boolean;
  reviewNote: string | null;
}
export interface ParsedSeat {
  code: string;
  occupantName: string | null;
  slots: ParsedSeatSlot[];
}
export interface ParsedNotebook {
  rowNo: number;
  managementNo: string;
  notebookNo: number | null;
  status: string; // 보관 | 직원사용
  holder: string | null;
  note: string | null;
}

export interface ParseIssue {
  sheet: string;
  rowNo: number | null;
  severity: "error" | "warning" | "info";
  field: string | null;
  message: string;
  rawValue: string | null;
}

export interface ParsedWorkbook {
  assets: ParsedAsset[];
  materials: ParsedMaterial[];
  majors: ParsedMajor[];
  middles: ParsedMiddle[];
  buildings: ParsedBuilding[];
  seats: ParsedSeat[];
  notebooks: ParsedNotebook[];
  issues: ParseIssue[];
  skippedAssetRows: number; // 품명 없는 사전 번호 행
  sheetsPresent: string[];
}

export function readWorkbook(data: ArrayBuffer | Buffer | Uint8Array): XLSX.WorkBook {
  return XLSX.read(data, { type: "buffer", cellDates: true });
}

// ── tag status from the 4 tag columns ──
function tagStatusFrom(attached: unknown, unattached: unknown, unissued: unknown, damaged: unknown): string {
  if (toStr(damaged)) return "손상";
  if (toStr(unissued)) return "미발급";
  if (toStr(unattached)) return "미부착";
  if (toStr(attached)) return "부착";
  return "none";
}

// ── seat slot value classification (695694 등 붙은 번호 검토 표시) ──
function classifySeatValue(v: unknown): { raw: string | null; needsReview: boolean; note: string | null } {
  const raw = toStr(v);
  if (!raw) return { raw: null, needsReview: false, note: null };
  if (raw.includes(",")) return { raw, needsReview: true, note: "복수 번호(쉼표) — 개별 확인 필요" };
  if (!/^\d+$/.test(raw)) return { raw, needsReview: true, note: "숫자 외 값 — 확인 필요" };
  // 5자리 이상의 숫자는 3자리 번호가 붙어있는 것으로 추정 (예: 695694)
  if (raw.length >= 5) return { raw, needsReview: true, note: "번호가 붙어 있음 — 분리 확인 필요" };
  return { raw, needsReview: false, note: null };
}

export function parseWorkbook(wb: XLSX.WorkBook): ParsedWorkbook {
  const issues: ParseIssue[] = [];
  const sheetsPresent = wb.SheetNames.slice();

  // ── 자산분류 코드 ──
  const majors: ParsedMajor[] = [];
  const middles: ParsedMiddle[] = [];
  const wsClass = wb.Sheets[SHEET.classification];
  if (wsClass) {
    const { maxRow } = sheetBounds(wsClass);
    let curMajorCode: number | null = null;
    let curMajorName = "";
    for (let r = 4; r <= maxRow; r++) {
      const bCode = toInt(getCell(wsClass, r, 2)); // B 대분류코드
      const cName = toStr(getCell(wsClass, r, 3)); // C 대분류명
      const dCode = toInt(getCell(wsClass, r, 4)); // D 중분류코드
      const eName = toStr(getCell(wsClass, r, 5)); // E 중분류명
      const fItems = toStr(getCell(wsClass, r, 6)); // F 세부품목명
      if (bCode !== null && cName) {
        curMajorCode = bCode;
        curMajorName = cName;
        majors.push({ code: bCode, name: cName });
      }
      if (dCode !== null && eName && curMajorCode !== null) {
        middles.push({
          code: dCode,
          name: eName,
          majorCode: curMajorCode,
          majorName: curMajorName,
          detailItems: fItems ?? "",
        });
      }
    }
  } else {
    issues.push({ sheet: SHEET.classification, rowNo: null, severity: "warning", field: null, message: "자산분류 코드 시트가 없습니다.", rawValue: null });
  }

  // ── 건축물 코드 ──
  const buildings: ParsedBuilding[] = [];
  const wsBld = wb.Sheets[SHEET.buildings];
  if (wsBld) {
    const { maxRow } = sheetBounds(wsBld);
    for (let r = 3; r <= maxRow; r++) {
      const campus = toStr(getCell(wsBld, r, 2));
      const code = toStr(getCell(wsBld, r, 3));
      const name = toStr(getCell(wsBld, r, 4));
      if (!code) continue;
      buildings.push({ code, name: name ?? code, campus: campus ?? "" });
    }
  } else {
    issues.push({ sheet: SHEET.buildings, rowNo: null, severity: "warning", field: null, message: "건축물 코드 시트가 없습니다.", rawValue: null });
  }

  const buildingCodeSet = new Set(buildings.map((b) => b.code));
  const majorNameSet = new Set(majors.map((m) => m.name));
  const middleNameSet = new Set(middles.map((m) => m.name));

  // ── 사업단 자산관리 대장 ──
  const assets: ParsedAsset[] = [];
  const seenMgmt = new Map<string, number>(); // mgmtNo -> first rowNo
  const seenRfid = new Map<string, number[]>();
  let skippedAssetRows = 0;
  const wsAsset = wb.Sheets[SHEET.assets];
  if (wsAsset) {
    const { maxRow } = sheetBounds(wsAsset);
    for (let r = 2; r <= maxRow; r++) {
      const serialNo = toInt(getCell(wsAsset, r, 1));
      const itemName = toStr(getCell(wsAsset, r, 8));
      const lockedRaw = toStr(getCell(wsAsset, r, 15)) ?? toStr(getCell(wsAsset, r, 16));

      // 품명이 없는 사전 번호 행은 가져오지 않음
      if (!itemName) {
        if (serialNo !== null || lockedRaw) {
          skippedAssetRows++;
          issues.push({ sheet: SHEET.assets, rowNo: r, severity: "info", field: "품명", message: "품명이 없는 사전 번호 행 — 가져오지 않음", rawValue: lockedRaw });
        }
        continue;
      }

      const classificationCode = toInt(getCell(wsAsset, r, 6));
      const acquiredAt = normalizeExcelDate(getCell(wsAsset, r, 7));
      const unitPrice = toInt(getCell(wsAsset, r, 10)) ?? 0;
      const itemNo = toInt(getCell(wsAsset, r, 11));
      const buildingCode = toStr(getCell(wsAsset, r, 14));
      const rfid = toStr(getCell(wsAsset, r, 17));
      const usageRaw = toStr(getCell(wsAsset, r, 18));
      const usage = classifyUsage(usageRaw);

      const generated = generateManagementNo({ serialNo, acquiredAt, classificationCode, itemNo, buildingCode });
      const lockedManagementNo = lockedRaw;
      const managementNoMismatch = !!lockedManagementNo && !!generated && lockedManagementNo !== generated;

      const asset: ParsedAsset = {
        rowNo: r,
        serialNo,
        expenseDoc: toStr(getCell(wsAsset, r, 2)),
        managingOrg: toStr(getCell(wsAsset, r, 3)),
        majorCategory: toStr(getCell(wsAsset, r, 4)),
        middleCategory: toStr(getCell(wsAsset, r, 5)),
        classificationCode,
        acquiredAt,
        itemName,
        spec: toStr(getCell(wsAsset, r, 9)),
        unitPrice,
        itemNo,
        place: toStr(getCell(wsAsset, r, 12)),
        room: toStr(getCell(wsAsset, r, 13)),
        buildingCode,
        lockedManagementNo,
        generatedManagementNo: generated,
        managementNoMismatch,
        rfid,
        usageRaw,
        usageType: usage.usageType,
        assigneeName: usage.assigneeName,
        usageNeedsReview: usage.needsReview,
        tagStatus: tagStatusFrom(getCell(wsAsset, r, 19), getCell(wsAsset, r, 20), getCell(wsAsset, r, 21), getCell(wsAsset, r, 22)),
        note: null,
      };
      assets.push(asset);

      // ── per-row file-internal validation ──
      if (lockedManagementNo) {
        const prev = seenMgmt.get(lockedManagementNo);
        if (prev !== undefined) {
          issues.push({ sheet: SHEET.assets, rowNo: r, severity: "error", field: "관리번호", message: `파일 내 관리번호 중복 (행 ${prev})`, rawValue: lockedManagementNo });
        } else {
          seenMgmt.set(lockedManagementNo, r);
        }
      } else {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "관리번호", message: "관리번호가 비어 있음 (계산값으로 대체)", rawValue: null });
      }
      if (managementNoMismatch) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "관리번호", message: `보존 관리번호와 계산 관리번호 불일치 (계산: ${generated})`, rawValue: lockedManagementNo });
      }
      if (rfid) {
        const arr = seenRfid.get(rfid) ?? [];
        arr.push(r);
        seenRfid.set(rfid, arr);
      }
      if (!classificationCode) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "분류코드", message: "분류코드 누락", rawValue: null });
      }
      if (!buildingCode) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "건축물코드", message: "건축물코드 누락", rawValue: null });
      } else if (buildingCodeSet.size > 0 && !buildingCodeSet.has(buildingCode)) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "건축물코드", message: "기준정보에 없는 건축물코드", rawValue: buildingCode });
      }
      if (asset.majorCategory && majorNameSet.size > 0 && !majorNameSet.has(asset.majorCategory)) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "대분류", message: "기준정보에 없는 대분류", rawValue: asset.majorCategory });
      }
      if (asset.middleCategory && middleNameSet.size > 0 && !middleNameSet.has(asset.middleCategory)) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "중분류", message: "기준정보에 없는 중분류", rawValue: asset.middleCategory });
      }
      if (unitPrice <= 0) {
        issues.push({ sheet: SHEET.assets, rowNo: r, severity: "warning", field: "취득단가", message: "취득단가 누락/0", rawValue: null });
      }
    }
    // RFID duplicates within the file
    for (const [rfid, rows] of seenRfid) {
      if (rows.length > 1) {
        issues.push({ sheet: SHEET.assets, rowNo: rows[0], severity: "warning", field: "RFID번호", message: `파일 내 RFID 중복 ${rows.length}건 (행 ${rows.join(", ")})`, rawValue: rfid });
      }
    }
  } else {
    issues.push({ sheet: SHEET.assets, rowNo: null, severity: "error", field: null, message: "자산관리 대장 시트가 없습니다.", rawValue: null });
  }

  // ── 연구재료 ──
  const materials: ParsedMaterial[] = [];
  const wsMat = wb.Sheets[SHEET.materials];
  if (wsMat) {
    const { maxRow } = sheetBounds(wsMat);
    for (let r = 2; r <= maxRow; r++) {
      const itemName = toStr(getCell(wsMat, r, 6)); // F 품명
      const serialNo = toInt(getCell(wsMat, r, 2));
      if (!itemName || itemName === "`") {
        if (itemName === "`") {
          issues.push({ sheet: SHEET.materials, rowNo: r, severity: "warning", field: "품명", message: "유효하지 않은 품명 — 가져오지 않음", rawValue: itemName });
        }
        continue;
      }
      const expenseDoc = toStr(getCell(wsMat, r, 3));
      const unitPrice = toInt(getCell(wsMat, r, 8)) ?? 0;
      const qty = toInt(getCell(wsMat, r, 9)) ?? 0; // I 번호 == 수량
      const issuesForRow: string[] = [];
      if (!expenseDoc) issuesForRow.push("지출문서 누락");
      if (unitPrice <= 0) issuesForRow.push("취득단가 누락/0");
      if (qty <= 0) issuesForRow.push("수량 누락/0");
      const hasDataIssue = issuesForRow.length > 0;
      materials.push({
        rowNo: r,
        serialNo,
        expenseDoc,
        managingOrg: toStr(getCell(wsMat, r, 4)),
        acquiredAt: normalizeExcelDate(getCell(wsMat, r, 5)),
        itemName,
        spec: toStr(getCell(wsMat, r, 7)),
        unitPrice,
        qty,
        location: toStr(getCell(wsMat, r, 10)),
        room: toStr(getCell(wsMat, r, 11)),
        hasDataIssue,
        dataIssueNote: hasDataIssue ? issuesForRow.join(", ") : null,
      });
      if (hasDataIssue) {
        issues.push({ sheet: SHEET.materials, rowNo: r, severity: "warning", field: null, message: issuesForRow.join(", "), rawValue: itemName });
      }
    }
  }

  // ── 사무실 자리 ──
  const seats: ParsedSeat[] = [];
  const wsSeat = wb.Sheets[SHEET.seats];
  if (wsSeat) {
    const { maxRow } = sheetBounds(wsSeat);
    const slotCols: Array<{ slot: ParsedSeatSlot["slot"]; col: number }> = [
      { slot: "desktop", col: 4 },
      { slot: "monitor", col: 5 },
      { slot: "printer", col: 6 },
      { slot: "phone", col: 7 },
    ];
    for (let r = 3; r <= maxRow; r++) {
      const code = toStr(getCell(wsSeat, r, 2));
      if (!code) continue;
      const occupantName = toStr(getCell(wsSeat, r, 3));
      const slots: ParsedSeatSlot[] = slotCols.map(({ slot, col }) => {
        const c = classifySeatValue(getCell(wsSeat, r, col));
        if (c.needsReview) {
          issues.push({ sheet: SHEET.seats, rowNo: r, severity: "info", field: slot, message: `좌석 ${code} ${slot}: ${c.note}`, rawValue: c.raw });
        }
        return { slot, rawValue: c.raw, needsReview: c.needsReview, reviewNote: c.note };
      });
      seats.push({ code: code.toUpperCase(), occupantName, slots });
    }
  }

  // ── 노트북 대여 현황 ──
  const notebooks: ParsedNotebook[] = [];
  const wsNb = wb.Sheets[SHEET.notebooks];
  if (wsNb) {
    const { maxRow } = sheetBounds(wsNb);
    for (let r = 6; r <= maxRow; r++) {
      const mgmt = toStr(getCell(wsNb, r, 2));
      if (!mgmt || !mgmt.startsWith("[")) continue;
      const rentRaw = toStr(getCell(wsNb, r, 4)) ?? "";
      const status = rentRaw.includes("직원") ? "직원사용" : "보관";
      const holder = status === "직원사용" ? toStr(getCell(wsNb, r, 5)) : null;
      notebooks.push({
        rowNo: r,
        managementNo: mgmt,
        notebookNo: toInt(getCell(wsNb, r, 3)),
        status,
        holder,
        note: toStr(getCell(wsNb, r, 5)),
      });
    }
  }

  return {
    assets,
    materials,
    majors,
    middles,
    buildings,
    seats,
    notebooks,
    issues,
    skippedAssetRows,
    sheetsPresent,
  };
}
