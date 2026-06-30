import * as XLSX from "xlsx";
import { formatDate } from "../format";

// Excel export helpers. Each returns an xlsx file Buffer in a layout close to
// the source ledger so exports round-trip naturally.

function aoaToBuffer(sheetName: string, aoa: (string | number | null)[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export interface AssetExportRow {
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
  rfid: string | null;
  usageRaw: string | null;
  usageType: string;
  tagStatus: string;
}

const ASSET_HEADERS = [
  "연번", "지출문서", "관리기관", "대분류", "중분류", "분류코드", "취득날짜", "품명", "규격",
  "취득단가", "번호", "장소", "호실", "건축물코드", "관리번호(보존)", "관리번호(계산)",
  "RFID번호", "사용처(원본)", "사용유형", "태그상태",
];

export function exportAssets(rows: AssetExportRow[]): Buffer {
  const aoa: (string | number | null)[][] = [ASSET_HEADERS];
  for (const a of rows) {
    aoa.push([
      a.serialNo, a.expenseDoc, a.managingOrg, a.majorCategory, a.middleCategory, a.classificationCode,
      a.acquiredAt ? formatDate(a.acquiredAt) : null, a.itemName, a.spec, a.unitPrice, a.itemNo,
      a.place, a.room, a.buildingCode, a.lockedManagementNo, a.generatedManagementNo,
      a.rfid, a.usageRaw, a.usageType, a.tagStatus === "none" ? "" : a.tagStatus,
    ]);
  }
  return aoaToBuffer("자산관리대장", aoa);
}

export function exportRfidMissing(rows: AssetExportRow[]): Buffer {
  const headers = ["연번", "관리번호", "품명", "규격", "대분류", "중분류", "장소", "호실", "사용유형"];
  const aoa: (string | number | null)[][] = [headers];
  for (const a of rows) {
    aoa.push([a.serialNo, a.lockedManagementNo ?? a.generatedManagementNo, a.itemName, a.spec, a.majorCategory, a.middleCategory, a.place, a.room, a.usageType]);
  }
  return aoaToBuffer("RFID미등록", aoa);
}

export interface NotebookExportRow {
  managementNo: string | null;
  notebookNo: number | null;
  status: string;
  currentHolder: string | null;
  note: string | null;
}

export function exportNotebooks(rows: NotebookExportRow[]): Buffer {
  const headers = ["관리번호", "번호", "상태", "현재 사용자", "비고"];
  const aoa: (string | number | null)[][] = [headers];
  for (const n of rows) aoa.push([n.managementNo, n.notebookNo, n.status, n.currentHolder, n.note]);
  return aoaToBuffer("노트북대여현황", aoa);
}

export interface MaterialExportRow {
  serialNo: number | null;
  expenseDoc: string | null;
  acquiredAt: Date | null;
  itemName: string;
  spec: string | null;
  unitPrice: number;
  currentQty: number;
  amount: number;
  location: string | null;
  room: string | null;
}

export function exportMaterials(rows: MaterialExportRow[]): Buffer {
  const headers = ["연번", "지출문서", "취득날짜", "품명", "규격", "단가", "현재수량", "금액(단가x수량)", "장소", "호실"];
  const aoa: (string | number | null)[][] = [headers];
  for (const m of rows) {
    aoa.push([m.serialNo, m.expenseDoc, m.acquiredAt ? formatDate(m.acquiredAt) : null, m.itemName, m.spec, m.unitPrice, m.currentQty, m.amount, m.location, m.room]);
  }
  return aoaToBuffer("연구재료재고", aoa);
}
