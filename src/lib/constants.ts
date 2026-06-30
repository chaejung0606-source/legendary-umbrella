// Central catalogue of the string-typed enums used across the platform.
// Kept here (rather than as Prisma native enums) so the schema stays portable
// between SQLite and PostgreSQL. UI labels live alongside the codes.

// ─────────────────────────────────────────────────────────────
// Roles & permissions
// ─────────────────────────────────────────────────────────────
export const ROLES = {
  admin: "관리자",
  asset_manager: "자산담당자",
  user: "일반사용자",
  auditor: "감사/조회자",
} as const;
export type Role = keyof typeof ROLES;
export const ROLE_LIST = Object.keys(ROLES) as Role[];

// Capability matrix. A single source of truth for `can(role, capability)`.
export const CAPABILITIES = {
  // read
  view: ["admin", "asset_manager", "user", "auditor"],
  viewReports: ["admin", "asset_manager", "user", "auditor"],
  // asset lifecycle
  assetCreate: ["admin", "asset_manager"],
  assetEdit: ["admin", "asset_manager"],
  assetDelete: ["admin", "asset_manager"],
  assetMove: ["admin", "asset_manager"],
  // sensitive fields — 취득금액 / RFID / 관리번호
  editSensitive: ["admin", "asset_manager"],
  // notebook lend/return
  loanManage: ["admin", "asset_manager"],
  loanRequest: ["admin", "asset_manager", "user"],
  // tags
  tagManage: ["admin", "asset_manager"],
  // materials
  materialManage: ["admin", "asset_manager"],
  // seats
  seatManage: ["admin", "asset_manager"],
  // import / export
  importData: ["admin", "asset_manager"],
  exportData: ["admin", "asset_manager", "auditor"],
  // admin only
  manageUsers: ["admin"],
} as const;
export type Capability = keyof typeof CAPABILITIES;

export function can(role: string | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly string[]).includes(role);
}

// ─────────────────────────────────────────────────────────────
// 사용 유형 (usage types) — 사용처 문자열을 구조화한 결과
// ─────────────────────────────────────────────────────────────
export const USAGE_TYPES = {
  개인사용: "개인 사용",
  좌석사용: "좌석 사용",
  사무실보관: "사무실 보관",
  대여용: "대여용",
  소모품: "소모품",
  미확인: "미확인",
} as const;
export type UsageTypeKey = keyof typeof USAGE_TYPES;
export const USAGE_TYPE_VALUES = Object.values(USAGE_TYPES);

// ─────────────────────────────────────────────────────────────
// 노트북 상태
// ─────────────────────────────────────────────────────────────
export const NOTEBOOK_STATUS = {
  보관: "보관",
  직원사용: "직원 사용",
  대여중: "대여 중",
  수리: "수리",
  분실: "분실",
  폐기: "폐기",
} as const;
export type NotebookStatusKey = keyof typeof NOTEBOOK_STATUS;
export const NOTEBOOK_STATUS_LIST = Object.keys(NOTEBOOK_STATUS) as NotebookStatusKey[];
// "in stock"-ish states for dashboard counts
export const NOTEBOOK_AVAILABLE_STATES: NotebookStatusKey[] = ["보관"];
export const NOTEBOOK_OUT_STATES: NotebookStatusKey[] = ["직원사용", "대여중"];

// ─────────────────────────────────────────────────────────────
// 태그 상태
// ─────────────────────────────────────────────────────────────
export const TAG_STATUS = {
  부착: "부착",
  미부착: "미부착",
  미발급: "미발급",
  손상: "손상",
  none: "없음",
} as const;
export type TagStatusKey = keyof typeof TAG_STATUS;
export const TAG_STATUS_LIST = Object.keys(TAG_STATUS) as TagStatusKey[];

// ─────────────────────────────────────────────────────────────
// Seat slots
// ─────────────────────────────────────────────────────────────
export const SEAT_SLOTS = {
  desktop: "데스크톱",
  monitor: "모니터",
  printer: "프린터",
  phone: "전화기",
} as const;
export type SeatSlotKey = keyof typeof SEAT_SLOTS;
export const SEAT_SLOT_LIST = Object.keys(SEAT_SLOTS) as SeatSlotKey[];
export const SEAT_CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];

// ─────────────────────────────────────────────────────────────
// Material transactions
// ─────────────────────────────────────────────────────────────
export const MATERIAL_TXN_TYPES = {
  in: "입고",
  out: "출고",
  adjust: "조정",
} as const;
export type MaterialTxnType = keyof typeof MATERIAL_TXN_TYPES;

// ─────────────────────────────────────────────────────────────
// Import / audit
// ─────────────────────────────────────────────────────────────
export const IMPORT_STATUS = {
  pending: "검증 대기",
  validated: "검증 완료",
  committed: "반영 완료",
  failed: "실패",
  discarded: "취소됨",
} as const;
export type ImportStatusKey = keyof typeof IMPORT_STATUS;

export const SEVERITY = {
  error: "오류",
  warning: "경고",
  info: "정보",
} as const;
export type Severity = keyof typeof SEVERITY;

// Canonical sheet names in the source workbook.
export const SHEET = {
  assets: "사업단 자산관리 대장",
  materials: "연구재료",
  classification: "자산분류 코드",
  buildings: "건축물 코드",
  seats: "사무실 자리",
  notebooks: "노트북 대여 현황",
} as const;
