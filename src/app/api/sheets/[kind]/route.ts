import { NextRequest, NextResponse } from "next/server";
import { filterAssets, getConsumables, getLaptopLoans, getPromoItemsWithStock, getPromoTxns } from "@/data";

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
    // '사업단 자산관리 대장' 엑셀 양식의 컬럼 순서 그대로 내보낸다.
    // 플랫폼에서 자산을 새로 등록하면 이 CSV 에 즉시 반영되어 구글시트가 자동으로 가져간다.
    const { rows } = await filterAssets({ page: 1, pageSize: Number.MAX_SAFE_INTEGER });
    const headers = [
      "연번", "지출문서", "관리기관", "대분류", "중분류", "분류코드", "취득날짜", "품명", "규격",
      "취득단가", "번호", "장소", "호실", "건축물코드", "관리번호", "RFID번호(학교)",
      "사용유형", "사용자", "사용처", "태그상태", "자산상태", "비고",
    ];
    const data = rows.map((a) => [
      a.legacyRowNo, a.expenditureDocument, a.managingOrganization, a.majorCategory, a.middleCategory,
      a.classificationCode, a.acquiredDate, a.itemName, a.specification,
      a.unitPrice, a.sequenceNo, a.place, a.roomName, a.buildingCode,
      a.lockedManagementNo ?? a.generatedManagementNo, a.schoolRfidNo,
      a.usageType, a.currentUserName, a.currentLocationNote, a.tagStatus, a.assetStatus, a.memo,
    ]);
    return csvResponse(toCsv(headers, data));
  }

  if (kind === "loans") {
    // 자산 대여 관리 대장 양식 항목 그대로 내보낸다.
    const headers = [
      "관리번호", "품명", "구분", "상태",
      "대여일자", "사유", "대여자", "소속(사번/학번)", "전화번호", "관리자",
      "반납예정", "반납일자", "반납자", "반납자 소속", "반납자 전화번호", "반납 관리자", "비고",
    ];
    const data = (await getLaptopLoans()).map((l) => [
      l.managementNo, l.itemName, l.isNotebook ? "노트북" : "일반자산", l.status,
      l.loanedAt, l.reason, l.userName, l.userAffiliation, l.userPhone, l.loanManager,
      l.dueAt, l.returnedAt, l.returnerName, l.returnerAffiliation, l.returnerPhone, l.returnManager, l.note,
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

  if (kind === "promo") {
    // 홍보물품 수불관리대장: 물품 요약 + 시간순 수불 기록을 한 시트에 담는다.
    const [items, txns] = await Promise.all([getPromoItemsWithStock(), getPromoTxns()]);
    const byId = new Map(items.map((i) => [i.id, i]));
    const headers = [
      "일자", "구분코드", "물품명", "유형", "입고수량", "출고수량", "처리후재고",
      "내용", "행사명", "반출자", "수령자", "담당자", "상태", "취소사유", "기록자",
    ];
    const data = [...txns]
      .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
      .map((t) => {
        const item = byId.get(t.itemId);
        return [
          t.date, item?.code, item?.name, t.type,
          t.direction > 0 ? t.qty : null, t.direction < 0 ? t.qty : null, t.balanceAfter,
          t.purpose, t.eventName, t.takerName, t.receiverName, t.manager, t.status, t.cancelReason, t.createdBy,
        ];
      });
    return csvResponse(toCsv(headers, data));
  }

  return NextResponse.json({ error: `지원하지 않는 시트 유형: ${kind} (assets · loans · materials · promo)` }, { status: 400 });
}
