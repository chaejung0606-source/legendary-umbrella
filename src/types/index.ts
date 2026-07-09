// 도메인 타입 — 더미 데이터와 컴포넌트가 공유한다. Prisma 모델과 1:1 가까운 형태로
// 정의해, 추후 DB/API 연동 시 매핑 비용을 최소화한다.

// ─── 상태 enum (문자열 유니온 + 반복용 배열) ───
export const ASSET_STATUSES = [
  "정상", "사용중", "보관중", "대여중", "점검필요", "수리중", "분실", "폐기예정",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const TAG_STATUSES = ["부착", "미부착", "미발급", "손상"] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

export const USAGE_TYPES = [
  "개인사용", "좌석사용", "사무실보관", "대여용", "소모품", "미확인",
] as const;
export type UsageType = (typeof USAGE_TYPES)[number];

export const LOAN_STATUSES = ["보관", "직원사용", "대여중", "수리", "분실", "폐기"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const CONSUMABLE_STATUSES = ["정상", "부족", "소진"] as const;
export type ConsumableStatus = (typeof CONSUMABLE_STATUSES)[number];

// ─── 기준정보 ───
export interface AssetMiddleCategory {
  id: string;
  code: number; // 분류코드 (e.g. 501)
  name: string;
  majorId: string;
  detailItems?: string[];
}
export interface AssetMajorCategory {
  id: string;
  code: number; // 1..10
  name: string;
  middles: AssetMiddleCategory[];
}
/** 화면용 통합 분류 타입 */
export type AssetCategory = AssetMajorCategory;

export interface Building {
  id: string;
  campus: string;
  code: string; // 건축물코드 (B0000142)
  name: string;
}

// ─── 자산 원장 ───
export interface Asset {
  id: string;
  legacyRowNo?: number | null; // 엑셀 연번
  expenditureDocument?: string | null; // 지출문서
  managingOrganization?: string | null; // 관리기관
  majorCategory: string; // 대분류명
  middleCategory: string; // 중분류명
  classificationCode: number | null; // 분류코드
  acquiredDate: string | null; // 취득날짜 (yyyy-MM-dd)
  itemName: string; // 품명
  specification?: string | null; // 규격
  unitPrice: number; // 취득단가 (KRW)
  sequenceNo: number | null; // 번호
  place?: string | null; // 장소
  roomName?: string | null; // 호실
  buildingCode?: string | null; // 건축물코드
  generatedManagementNo: string | null; // 플랫폼 계산 관리번호
  lockedManagementNo: string | null; // 보존 관리번호
  schoolRfidNo?: string | null; // RFID번호(학교)
  usageType: UsageType;
  currentUserName?: string | null; // 사용자
  currentLocationNote?: string | null; // 사용처 비고
  tagStatus: TagStatus | "미지정";
  assetStatus: AssetStatus;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ─── 대여 (노트북 포함 전체 자산) ───
export interface LaptopLoan {
  id: string;
  assetId: string;
  managementNo: string;
  itemName: string;
  status: LoanStatus;
  userName?: string | null;
  loanedAt?: string | null;
  dueAt?: string | null;
  returnedAt?: string | null;
  note?: string | null;
  isNotebook?: boolean; // 노트북 대여현황 메뉴 필터용
}

// ─── 계정 / 권한 ───
export interface Account {
  id: string;
  name: string;
  email: string;
  role: string; // ROLES 키 (admin/asset_manager/user/auditor) — 표시용 라벨
  permissions: string[]; // 접근 가능한 메뉴 키 목록
  active: boolean;
  createdAt: string;
}

// ─── 연구재료/소모품 ───
export interface ConsumableItem {
  id: string;
  itemName: string;
  specification?: string | null;
  unitPrice: number;
  currentQty: number;
  safetyQty: number; // 안전재고
  unit: string; // 단위 (개, EA …)
  location?: string | null;
  roomName?: string | null;
  expenditureDocument?: string | null;
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  status: ConsumableStatus;
}
export interface ConsumableMovement {
  id: string;
  itemId: string;
  type: "in" | "out" | "adjust";
  qty: number;
  reason?: string | null;
  createdAt: string;
}

// ─── 좌석/배치 ───
export interface SeatAsset {
  slot: "desktop" | "monitor" | "printer" | "phone";
  label: string; // 데스크톱/모니터/...
  managementNo?: string | null;
  rawValue?: string | null;
  needsReview?: boolean;
}
export interface Seat {
  id: string;
  code: string; // A..O
  occupantName?: string | null;
  assets: SeatAsset[];
}

// ─── 엑셀 가져오기 ───
export type ImportSeverity = "error" | "warning" | "info";
export interface ImportError {
  id: string;
  sheet: string;
  rowNo: number | null;
  field: string | null;
  type: string; // 오류 유형
  rawValue: string | null;
  message: string;
  severity: ImportSeverity;
}
export interface ImportSheetInfo {
  name: string;
  recognized: boolean;
  rowCount: number;
  target: string; // 매핑 대상
}
export interface ImportValidation {
  totalAssets: number;
  importable: number;
  errors: number;
  warnings: number;
  rfidMissing: number;
  rfidDuplicate: number;
  managementNoMismatch: number;
}
export interface ImportJob {
  id: string;
  fileName: string;
  status: "pending" | "validated" | "committed" | "failed";
  createdAt: string;
  createdBy: string;
  sheets: ImportSheetInfo[];
  validation: ImportValidation;
  errorRows: ImportError[];
}

// ─── 감사 로그 ───
export interface AuditLog {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  summary: string;
  actor: string;
  createdAt: string;
}

// ─── 대시보드 ───
export interface DashboardStats {
  totalAssets: number;
  totalAcquisition: number;
  rfidUnregistered: number;
  laptopsOut: number;
  needsInspection: number;
  newThisMonth: number;
}
export interface MonthlyAcquisitionPoint {
  month: string; // 'YYYY-MM' or '7월'
  count: number;
  amount: number;
}
export interface CategoryRatioPoint {
  name: string;
  count: number;
  amount: number;
  color: string;
}
