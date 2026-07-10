import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { filterAssets, getConsumables, getMonthlyAcquisition, getCategoryRatio, getDashboardStats, TODAY } from "@/data";

export const dynamic = "force-dynamic";

// 자산/소모품/리포트를 실제 .xlsx 파일로 내려준다.
function sheetFromRows(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows);
}

function workbookResponse(wb: XLSX.WorkBook, fileName: string): NextResponse {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const sp = req.nextUrl.searchParams;

  if (kind === "assets") {
    const result = await filterAssets({
      q: sp.get("q") ?? undefined,
      major: sp.get("major") ?? undefined,
      middle: sp.get("middle") ?? undefined,
      place: sp.get("place") ?? undefined,
      room: sp.get("room") ?? undefined,
      usage: sp.get("usage") ?? undefined,
      status: sp.get("status") ?? undefined,
      rfid: (sp.get("rfid") ?? undefined) as never,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    });
    const rows = result.rows.map((a) => ({
      연번: a.legacyRowNo, 관리번호: a.lockedManagementNo, 품명: a.itemName, 규격: a.specification,
      대분류: a.majorCategory, 중분류: a.middleCategory, 분류코드: a.classificationCode,
      취득일: a.acquiredDate, 취득단가: a.unitPrice, 장소: a.place, 호실: a.roomName,
      건축물코드: a.buildingCode, 사용유형: a.usageType, 사용자: a.currentUserName,
      RFID번호: a.schoolRfidNo, 태그상태: a.tagStatus, 자산상태: a.assetStatus, 비고: a.memo,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), "자산원장");
    return workbookResponse(wb, `자산원장_${TODAY}.xlsx`);
  }

  if (kind === "consumables") {
    const rows = (await getConsumables()).map((c) => ({
      품명: c.itemName, 규격: c.specification, 단위: c.unit, 현재재고: c.currentQty, 안전재고: c.safetyQty,
      단가: c.unitPrice, 재고금액: c.unitPrice * c.currentQty, 보관장소: c.location, 호실: c.roomName,
      최근입고: c.lastInboundAt, 최근출고: c.lastOutboundAt, 상태: c.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), "소모품재고");
    return workbookResponse(wb, `소모품재고_${TODAY}.xlsx`);
  }

  if (kind === "report") {
    const stats = await getDashboardStats();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows([
        { 지표: "전체 자산 수", 값: stats.totalAssets },
        { 지표: "전체 취득금액(원)", 값: stats.totalAcquisition },
        { 지표: "RFID 미등록", 값: stats.rfidUnregistered },
        { 지표: "노트북 사용/대여 중", 값: stats.laptopsOut },
        { 지표: "점검 필요 자산", 값: stats.needsInspection },
        { 지표: "이번 달 신규", 값: stats.newThisMonth },
      ]),
      "요약"
    );
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows((await getMonthlyAcquisition()).map((m) => ({ 월: m.month, 등록건수: m.count, 취득금액: m.amount }))),
      "월별취득"
    );
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows((await getCategoryRatio()).map((c) => ({ 대분류: c.name, 자산수: c.count, 취득금액: c.amount }))),
      "대분류별"
    );
    return workbookResponse(wb, `자산리포트_${TODAY}.xlsx`);
  }

  return NextResponse.json({ error: `지원하지 않는 내보내기 유형: ${kind}` }, { status: 400 });
}
