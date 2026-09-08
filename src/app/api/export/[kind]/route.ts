import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { todayKst } from "@/lib/date";
import { filterAssets, getConsumables, getMonthlyAcquisition, getCategoryRatio, getDashboardStats, getPromoItemsWithStock, getPromoTxns, getCategories, getBuildings } from "@/data";
import { verifySession, normalizePerms, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

// 내보내기 종류별로 필요한 메뉴 권한.
// 미들웨어(src/middleware.ts)는 화면 경로만 보호하므로 /api/* 는 여기서 직접 인증한다.
// (구글시트 연동용 /api/sheets 와 진단용 /api/health 만 의도적으로 공개다.)
const REQUIRED_PERM: Record<string, string> = {
  assets: "assets",
  "asset-template": "assets",
  consumables: "consumables",
  promo: "promo",
  "promo-ledger": "promo",
  report: "dashboard",
};

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

  // ── 인증/권한 ── 원장 전체가 담긴 파일이므로 로그인 + 해당 메뉴 권한을 요구한다.
  const needed = REQUIRED_PERM[kind];
  if (!needed) {
    return NextResponse.json({ error: `지원하지 않는 내보내기 유형: ${kind}` }, { status: 400 });
  }
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!normalizePerms(session.perms).includes(needed)) {
    return NextResponse.json({ error: "이 자료를 내려받을 권한이 없습니다." }, { status: 403 });
  }

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
    return workbookResponse(wb, `자산원장_${todayKst()}.xlsx`);
  }

  if (kind === "consumables") {
    const rows = (await getConsumables()).map((c) => ({
      품명: c.itemName, 규격: c.specification, 단위: c.unit, 현재재고: c.currentQty, 안전재고: c.safetyQty,
      단가: c.unitPrice, 재고금액: c.unitPrice * c.currentQty, 보관장소: c.location, 호실: c.roomName,
      최근입고: c.lastInboundAt, 최근출고: c.lastOutboundAt, 상태: c.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), "소모품재고");
    return workbookResponse(wb, `소모품재고_${todayKst()}.xlsx`);
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
    return workbookResponse(wb, `자산리포트_${todayKst()}.xlsx`);
  }

  if (kind === "asset-template") {
    // 복수 자산 등록용 엑셀 양식: 입력 시트 + 분류/건축물 코드표 + 작성 안내
    const [categories, buildings] = await Promise.all([getCategories(), getBuildings()]);
    const wb = XLSX.utils.book_new();

    const example = {
      지출문서: "지출-2026-001", 관리기관: "SDU사업단", 대분류: "사무용장비", 중분류: "컴퓨터",
      "취득날짜(YYYY-MM-DD)": todayKst(), "품명(필수)": "노트북컴퓨터", 규격: "16GB/512GB SSD",
      취득단가: 1450000, 번호: 1, 장소: "집현관(제2도서관)", 호실: "102호", 건축물코드: "B0000142",
      사용처: "홍길동", RFID번호: "", 태그상태: "미지정", 비고: "예시 행 — 삭제 후 사용",
    };
    const main = sheetFromRows([example]);
    main["!cols"] = Object.keys(example).map((k) => ({ wch: Math.max(12, k.length * 2) }));
    XLSX.utils.book_append_sheet(wb, main, "자산등록");

    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(
        categories.flatMap((m) =>
          m.middles.map((mid) => ({
            대분류: m.name, 중분류: mid.name, 분류코드: mid.code,
            세부품목: (mid.detailItems ?? []).join(", "),
          }))
        )
      ),
      "분류코드표"
    );
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(buildings.map((b) => ({ 건축물코드: b.code, 건축물명: b.name, 캠퍼스: b.campus }))),
      "건축물코드표"
    );
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows([
        { 항목: "필수 입력", 내용: "품명(필수) 열만 필수입니다. 나머지는 비워도 됩니다." },
        { 항목: "관리번호/연번", 내용: "자동 생성됩니다 — 입력하지 마세요. [연번]+취득일+분류코드+번호+건축물코드 규칙." },
        { 항목: "대분류/중분류", 내용: "'분류코드표' 시트의 이름을 그대로 사용하세요. 중분류가 있어야 관리번호에 분류코드가 들어갑니다." },
        { 항목: "취득날짜", 내용: "YYYY-MM-DD 형식 (예: 2026-07-14). 셀 서식이 날짜여도 됩니다." },
        { 항목: "건축물코드", 내용: "'건축물코드표' 시트의 코드를 그대로 사용하세요 (예: B0000142)." },
        { 항목: "태그상태", 내용: "부착 / 미부착 / 미발급 / 손상 중 하나. 비우면 '미지정'." },
        { 항목: "사용처", 내용: "사용자 이름, '사무실 보관', '대여용' 등 자유 입력." },
        { 항목: "행 수 제한", 내용: "한 번에 최대 500행까지 등록할 수 있습니다." },
        { 항목: "예시 행", 내용: "'자산등록' 시트의 1번째 데이터 행은 예시입니다. 지우고 실제 데이터를 입력하세요." },
      ]),
      "작성안내"
    );
    return workbookResponse(wb, `자산등록양식_${todayKst()}.xlsx`);
  }

  if (kind === "promo") {
    const rows = (await getPromoItemsWithStock()).map((i) => ({
      구분코드: i.code, 물품명: i.name, 분류: i.category, 규격: i.spec, 단위: i.unit,
      누적입고: i.totalIn, 누적출고: i.totalOut, 현재재고: i.currentQty, 예약수량: i.reservedQty, 가용재고: i.availableQty,
      안전재고: i.safetyQty, 재고상태: i.stockState, 단가: i.unitPrice, 재고금액: i.currentQty * i.unitPrice,
      구입일자: i.purchasedAt, 총구입금액: i.totalAmount, 보관장소: i.location, 담당자: i.manager,
      구매처: i.vendor, 사용상태: i.status, 비고: i.note,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), "홍보물품현황");
    return workbookResponse(wb, `홍보물품현황_${todayKst()}.xlsx`);
  }

  if (kind === "promo-ledger") {
    const [items, txns] = await Promise.all([getPromoItemsWithStock(), getPromoTxns()]);
    const byId = new Map(items.map((i) => [i.id, i]));
    const rows = [...txns]
      .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
      .map((t) => {
        const item = byId.get(t.itemId);
        return {
          일자: t.date, 구분코드: item?.code, 물품명: item?.name, 유형: t.type,
          입고수량: t.direction > 0 ? t.qty : null, 출고수량: t.direction < 0 ? t.qty : null,
          처리후재고: t.balanceAfter, 내용: t.purpose, 행사명: t.eventName,
          반출자: t.takerName, 수령자: t.receiverName, 담당자: t.manager,
          단가: t.unitPrice, 금액: t.amount, 상태: t.status, 취소사유: t.cancelReason,
          기록자: t.createdBy, 기록일시: t.createdAt,
        };
      });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), "수불관리대장");
    return workbookResponse(wb, `홍보물품_수불관리대장_${todayKst()}.xlsx`);
  }

  return NextResponse.json({ error: `지원하지 않는 내보내기 유형: ${kind}` }, { status: 400 });
}
