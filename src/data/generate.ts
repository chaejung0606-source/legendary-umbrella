import type {
  Asset, LaptopLoan, ConsumableItem, Seat, SeatAsset, ImportJob, ImportError, AuditLog, LoanStatus,
  Account, AssetMajorCategory, Building,
} from "@/types";
import { Rng, shuffle } from "@/lib/rng";
import { generateManagementNumber } from "@/lib/management-number";
import { MAJOR_CATEGORIES, BUILDINGS } from "./categories";
import { ROLE_PRESETS } from "@/lib/menus";
import {
  GEN_SEED, TODAY, MAJOR_PLAN, ITEM_TEMPLATES, NOTEBOOK_TEMPLATE, NOTEBOOK_COUNT, RFID_REGISTERED,
  MISMATCH_COUNT, PEOPLE, PLACES, USAGE_WEIGHTS, STATUS_WEIGHTS, TAG_WEIGHTS, SEAT_CODES, CONSUMABLE_TEMPLATES,
  LEGACY_TOTAL_ACQUISITION,
} from "./pools";

export interface Dataset {
  assets: Asset[];
  laptopLoans: LaptopLoan[];
  consumables: ConsumableItem[];
  seats: Seat[];
  importJob: ImportJob;
  auditLogs: AuditLog[];
  // 편집 가능한 기준정보 (관리번호 생성의 로우데이터) + 계정
  categories: AssetMajorCategory[];
  buildings: Building[];
  accounts: Account[];
}

// 깊은 복사 — 편집 시 원본 상수(MAJOR_CATEGORIES/BUILDINGS)를 오염시키지 않도록.
function seedCategories(): AssetMajorCategory[] {
  return MAJOR_CATEGORIES.map((m) => ({ ...m, middles: m.middles.map((mid) => ({ ...mid })) }));
}
function seedBuildings(): Building[] {
  return BUILDINGS.map((b) => ({ ...b }));
}
function seedAccounts(): Account[] {
  return [
    { id: "acc-1", name: "시스템 관리자", email: "admin@sadan.local", password: "admin1234", role: "admin", permissions: ROLE_PRESETS.admin, active: true, createdAt: `${TODAY}T09:00:00.000Z` },
    { id: "acc-2", name: "자산관리 담당자", email: "manager@sadan.local", password: "manager1234", role: "asset_manager", permissions: ROLE_PRESETS.asset_manager, active: true, createdAt: `${TODAY}T09:00:00.000Z` },
    { id: "acc-3", name: "감사 조회자", email: "auditor@sadan.local", password: "auditor1234", role: "auditor", permissions: ROLE_PRESETS.auditor, active: true, createdAt: `${TODAY}T09:00:00.000Z` },
  ];
}

// 2024-07 ~ 2026-06 월 목록 + 가중치 (초기 대량 + 2026 신규 스파이크).
function buildMonths(): [string, number][] {
  const months: [string, number][] = [];
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2024 && m < 7) continue;
      if (y === 2026 && m > 6) continue;
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      let w = 4;
      if (y === 2024 && m >= 7 && m <= 10) w = 30; // 초기 대량 도입
      if (y === 2025 && (m === 2 || m === 3)) w = 10;
      if (y === 2026 && (m === 1 || m === 2)) w = 16; // 노트북/장비 추가
      if (y === 2026 && m === 6) w = 9; // 이번 달 신규
      months.push([ym, w]);
    }
  }
  return months;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateDataset(seed = GEN_SEED): Dataset {
  const rng = new Rng(seed);
  const months = buildMonths();
  const assets: Asset[] = [];
  const seqByCode = new Map<number, number>();
  let serial = 1;

  for (const plan of MAJOR_PLAN) {
    const middleWeights = plan.middles.map((m) => [m, m[2]] as const);
    for (let i = 0; i < plan.count; i++) {
      const [middleName, code] = rng.weighted(middleWeights);
      const templates = ITEM_TEMPLATES[middleName] ?? ITEM_TEMPLATES["기타자산"];
      const tpl = rng.pick(templates);
      const ym = rng.weighted(months);
      const acquiredDate = `${ym}-${String(rng.int(1, 28)).padStart(2, "0")}`;
      const loc = rng.weighted([[PLACES[0], 80], [PLACES[1], 14], [PLACES[2], 6]]);
      const room = rng.pick(loc.rooms);
      const seq = (seqByCode.get(code) ?? 0) + 1;
      seqByCode.set(code, seq);
      const usage = rng.weighted(USAGE_WEIGHTS);
      const status = rng.weighted(STATUS_WEIGHTS);
      const tag = rng.weighted(TAG_WEIGHTS);
      const price = rng.roundTo(rng.int(tpl.min, tpl.max), 100);
      const user =
        usage === "개인사용" ? rng.pick(PEOPLE) : usage === "좌석사용" ? rng.pick(SEAT_CODES) : null;

      const generated = generateManagementNumber({
        serialNo: serial, acquiredAt: acquiredDate, classificationCode: code, itemNo: seq, buildingCode: loc.building,
      });
      const createdAt = addDays(acquiredDate, rng.int(0, 4)) + "T09:00:00.000Z";

      assets.push({
        id: `asset-${serial}`,
        legacyRowNo: serial,
        expenditureDocument: `2024084700${rng.int(1, 2)}-${acquiredDate.replace(/-/g, "")}-${seq % 9 + 1}`,
        managingOrganization: "산학협력단",
        majorCategory: plan.major,
        middleCategory: middleName,
        classificationCode: code,
        acquiredDate,
        itemName: tpl.item,
        specification: tpl.spec,
        unitPrice: price,
        sequenceNo: seq,
        place: loc.place,
        roomName: room,
        buildingCode: loc.building,
        generatedManagementNo: generated,
        lockedManagementNo: generated,
        schoolRfidNo: null,
        usageType: usage,
        currentUserName: user && user.length > 1 ? user : null,
        currentLocationNote: user && user.length === 1 ? `${user}좌석` : null,
        tagStatus: tag,
        assetStatus: status,
        memo: null,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      });
      serial++;
    }
  }

  // ── 노트북 45대: 컴퓨터 자산 일부를 노트북으로 지정 + 대여 상태 부여 ──
  const computerIdx = assets
    .map((a, idx) => ({ a, idx }))
    .filter((x) => x.a.middleCategory === "컴퓨터")
    .slice(0, NOTEBOOK_COUNT);
  const loanPlan: LoanStatus[] = [
    ...Array(27).fill("보관"), ...Array(15).fill("직원사용"), ...Array(2).fill("대여중"), ...Array(1).fill("수리"),
  ] as LoanStatus[];
  const laptopLoans: LaptopLoan[] = [];
  computerIdx.forEach(({ a }, n) => {
    const status = loanPlan[n] ?? "보관";
    a.itemName = NOTEBOOK_TEMPLATE.item;
    a.specification = NOTEBOOK_TEMPLATE.spec;
    a.unitPrice = rng.roundTo(rng.int(NOTEBOOK_TEMPLATE.min, NOTEBOOK_TEMPLATE.max), 100);
    a.usageType = "대여용";
    a.assetStatus = status === "보관" ? "보관중" : status === "수리" ? "수리중" : "대여중";
    const user = status === "직원사용" || status === "대여중" ? rng.pick(PEOPLE) : null;
    a.currentUserName = user;
    const loanedAt = user ? addDays(TODAY, -rng.int(3, 120)) : null;
    const dueAt = status === "대여중" ? addDays(TODAY, rng.int(0, 6)) : null;
    laptopLoans.push({
      id: `loan-${a.id}`, assetId: a.id, managementNo: a.lockedManagementNo ?? "", itemName: `사업단 노트북 #${n + 1}`,
      status, userName: user, loanedAt, dueAt, returnedAt: null,
      note: status === "수리" ? "키보드 A/S" : status === "대여중" ? "반납 임박" : null,
      isNotebook: true,
    });
  });

  // ── 단가 보정: 합계를 레거시 대장 총 취득금액에 비례 정렬 ──
  const rawTotal = assets.reduce((s, a) => s + a.unitPrice, 0);
  const factor = LEGACY_TOTAL_ACQUISITION / rawTotal;
  for (const a of assets) a.unitPrice = Math.max(1000, rng.roundTo(a.unitPrice * factor, 100));

  // ── RFID 부여: 정확히 RFID_REGISTERED 건, 그 중 18건은 동일 값(중복 시연) ──
  const order = shuffle(assets.map((_, i) => i), rng);
  const dupRfid = "KKR-PB-25342543-00000036";
  for (let k = 0; k < RFID_REGISTERED; k++) {
    const a = assets[order[k]];
    a.schoolRfidNo = k < 18 ? dupRfid : `KKR-PB-${25252987 + k}-${String(33 + k).padStart(8, "0")}`;
  }

  // ── 관리번호 불일치 시연: 일부 자산의 보존번호를 변형 ──
  for (let k = 0; k < MISMATCH_COUNT; k++) {
    const a = assets[order[RFID_REGISTERED + k]];
    if (a.lockedManagementNo) a.lockedManagementNo = a.lockedManagementNo.replace(/B0000\d{3}$/, "B0000999");
  }

  // ── 연구재료/소모품 (status 는 수량으로 계산) ──
  const consumables: ConsumableItem[] = CONSUMABLE_TEMPLATES.map((t, i) => {
    const currentQty = rng.int(t.min, t.max);
    const status = currentQty === 0 ? "소진" : currentQty < t.safety ? "부족" : "정상";
    return {
      id: `con-${i + 1}`, itemName: t.itemName, specification: t.spec, unitPrice: t.price,
      currentQty, safetyQty: t.safety, unit: t.unit, location: PLACES[0].place, roomName: rng.pick(["101호", "102호"]),
      expenditureDocument: `202408470002-${addDays(TODAY, -rng.int(40, 400)).replace(/-/g, "")}-${i + 1}`,
      lastInboundAt: addDays(TODAY, -rng.int(40, 400)), lastOutboundAt: rng.chance(0.8) ? addDays(TODAY, -rng.int(1, 60)) : null,
      status,
    };
  });

  // ── 좌석 A~O ──
  const seatPeople = shuffle(PEOPLE, rng);
  const seats: Seat[] = SEAT_CODES.map((code, i) => {
    const occupant = i < 11 ? seatPeople[i] : null;
    const slots: SeatAsset[] = [
      { slot: "desktop", label: "데스크톱", rawValue: String(rng.int(1, 800)), needsReview: false },
      { slot: "monitor", label: "모니터", rawValue: i === 1 ? "695694" : `${rng.int(1, 40)},${rng.int(1, 40)}`, needsReview: i === 1 },
      { slot: "printer", label: "프린터", rawValue: String(rng.int(20, 800)), needsReview: false },
      { slot: "phone", label: "전화기", rawValue: String(rng.int(24, 800)), needsReview: false },
    ];
    return { id: `seat-${code}`, code, occupantName: occupant, assets: slots };
  });

  // ── 가져오기 작업: 검증 수치는 데이터에서 계산 ──
  const rfidValues = assets.map((a) => a.schoolRfidNo).filter(Boolean) as string[];
  const rfidCounts = rfidValues.reduce<Record<string, number>>((m, v) => ((m[v] = (m[v] ?? 0) + 1), m), {});
  const rfidDuplicate = Object.values(rfidCounts).reduce((s, c) => s + (c > 1 ? c - 1 : 0), 0);
  const rfidMissing = assets.filter((a) => !a.schoolRfidNo).length;
  const mismatch = assets.filter((a) => a.lockedManagementNo !== a.generatedManagementNo).length;

  const errorRows: ImportError[] = [];
  assets.filter((a) => a.lockedManagementNo !== a.generatedManagementNo).slice(0, 4).forEach((a, i) =>
    errorRows.push({
      id: `e-mm-${i}`, sheet: "사업단 자산관리 대장", rowNo: (a.legacyRowNo ?? 0) + 1, field: "관리번호",
      type: "관리번호 불일치", rawValue: a.lockedManagementNo, severity: "warning",
      message: `보존 관리번호와 계산값 불일치 (계산: ${a.generatedManagementNo})`,
    })
  );
  errorRows.push({
    id: "e-rfid", sheet: "사업단 자산관리 대장", rowNo: 767, field: "RFID번호", type: "RFID 중복",
    rawValue: dupRfid, severity: "warning", message: `동일 RFID ${rfidCounts[dupRfid] ?? 0}건 중복 — 반영 여부 선택 필요`,
  });
  errorRows.push({
    id: "e-seat", sheet: "사무실 자리", rowNo: 4, field: "모니터", type: "검토 필요",
    rawValue: "695694", severity: "info", message: "번호가 붙어 있음 — 자동 확정하지 않고 검토 필요",
  });
  errorRows.push({
    id: "e-mat", sheet: "연구재료", rowNo: 15, field: "품명", type: "유효성", rawValue: "`",
    severity: "warning", message: "유효하지 않은 품명 — 가져오지 않음",
  });

  const importJob: ImportJob = {
    id: "job-1", fileName: "자산관리대장_260611.xlsm", status: "validated",
    createdAt: `${TODAY}T10:12:00.000Z`, createdBy: "manager@sadan.local",
    sheets: [
      { name: "사업단 자산관리 대장", recognized: true, rowCount: assets.length, target: "Asset" },
      { name: "연구재료", recognized: true, rowCount: consumables.length, target: "ConsumableItem" },
      { name: "자산분류 코드", recognized: true, rowCount: 36, target: "AssetCategory" },
      { name: "건축물 코드", recognized: true, rowCount: 238, target: "Building" },
      { name: "사무실 자리", recognized: true, rowCount: 15, target: "Seat" },
      { name: "노트북 대여 현황", recognized: true, rowCount: NOTEBOOK_COUNT, target: "LaptopLoan" },
    ],
    validation: {
      totalAssets: assets.length, importable: assets.length, errors: 0,
      warnings: mismatch + 1 + 1, rfidMissing, rfidDuplicate, managementNoMismatch: mismatch,
    },
    errorRows,
  };

  // ── 감사 로그 (최근) ──
  const recentAssets = [...assets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const auditLogs: AuditLog[] = [
    { id: "a1", entityType: "import", action: "import", summary: `엑셀 가져오기 검증 완료 (${assets.length}건)`, actor: "manager@sadan.local", createdAt: `${TODAY}T10:12:00.000Z` },
    ...recentAssets.map((a, i) => ({
      id: `a-as-${i}`, entityType: "asset", entityId: a.id, action: "create",
      summary: `자산 등록: ${a.itemName} (${a.lockedManagementNo})`, actor: "manager@sadan.local", createdAt: a.createdAt,
    })),
    { id: "a-loan", entityType: "laptop", action: "loan", summary: "노트북 대여 처리: 전상철", actor: "manager@sadan.local", createdAt: `${addDays(TODAY, -1)}T14:03:00.000Z` },
  ];

  return {
    assets, laptopLoans, consumables, seats, importJob, auditLogs,
    categories: seedCategories(), buildings: seedBuildings(), accounts: seedAccounts(),
  };
}
