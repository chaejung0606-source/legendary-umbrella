import { NextRequest, NextResponse } from "next/server";
import { filterAssets, getConsumables, getLaptopLoans } from "@/data";

export const dynamic = "force-dynamic";

// 구글시트 IMPORTDATA 연동용 공개 CSV 엔드포인트.
// 구글시트 셀에 =IMPORTDATA("<이 URL>") 를 넣으면 구글이 주기적으로(약 1시간, 열 때마다)
// 최신 CSV 를 가져가 자동 반영한다. 별도의 API 자격증명/서비스 계정이 필요 없다.
// 자산/대여/재료 3종을 지원한다.

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // CSV 이스케이프: 쉼표/따옴표/개행 포함 시 큰따옴표로 감싸고 내부 따옴표는 두 번.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  // 엑셀/구글시트 한글 인식을 위해 UTF-8 BOM 을 붙인다.
  return "﻿" + lines.join("\r\n");
}

function csvResponse(csv: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // 구글시트가 항상 최신을 가져가도록 캐시 방지
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;

  if (kind === "assets") {
    const { rows } = await filterAssets({ page: 1, pageSize: Number.MAX_SAFE_INTEGER });
    const headers = ["연번", "관리번호", "품명", "규격", "대분류", "중분류", "분류코드", "취득일", "취득단가", "장소", "호실", "건축물코드", "사용유형", "사용자", "RFID번호", "태그상태", "자산상태"];
    const data = rows.map((a) => [
      a.legacyRowNo, a.lockedManagementNo, a.itemName, a.specification, a.majorCategory, a.middleCategory,
      a.classificationCode, a.acquiredDate, a.unitPrice, a.place, a.roomName, a.buildingCode,
      a.usageType, a.currentUserName, a.schoolRfidNo, a.tagStatus, a.assetStatus,
    ]);
    return csvResponse(toCsv(headers, data));
  }

  if (kind === "loans") {
    const headers = ["관리번호", "품명", "구분", "상태", "사용자", "대여일", "반납예정", "반납일", "비고"];
    const data = (await getLaptopLoans()).map((l) => [
      l.managementNo, l.itemName, l.isNotebook ? "노트북" : "일반자산", l.status, l.userName,
      l.loanedAt, l.dueAt, l.returnedAt, l.note,
    ]);
    return csvResponse(toCsv(headers, data));
  }

  if (kind === "materials") {
    const headers = ["품명", "규격", "단위", "현재재고", "안전재고", "단가", "재고금액", "보관장소", "호실", "최근입고", "최근출고", "상태"];
    const data = (await getConsumables()).map((c) => [
      c.itemName, c.specification, c.unit, c.currentQty, c.safetyQty, c.unitPrice, c.unitPrice * c.currentQty,
      c.location, c.roomName, c.lastInboundAt, c.lastOutboundAt, c.status,
    ]);
    return csvResponse(toCsv(headers, data));
  }

  return NextResponse.json({ error: `지원하지 않는 시트 유형: ${kind} (assets · loans · materials)` }, { status: 400 });
}
