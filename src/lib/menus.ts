// 메뉴별 권한 부여용 카탈로그. 계정에 부여하는 권한 단위는 "메뉴"다.
export interface MenuPermission {
  key: string;
  label: string;
  href: string;
}

export const MENU_PERMISSIONS: MenuPermission[] = [
  { key: "dashboard", label: "대시보드", href: "/dashboard" },
  { key: "assets", label: "자산 원장", href: "/assets" },
  { key: "assets.create", label: "자산 등록", href: "/assets/new" },
  { key: "imports", label: "엑셀 가져오기", href: "/imports" },
  { key: "loans", label: "대여 관리", href: "/laptop-loans" },
  { key: "consumables", label: "연구재료/소모품", href: "/consumables" },
  { key: "rfid", label: "RFID/태그 관리", href: "/rfid" },
  { key: "seats", label: "좌석/배치 현황", href: "/seats" },
  { key: "reports", label: "통계/리포트", href: "/reports" },
  { key: "settings", label: "설정", href: "/settings" },
];

export const ALL_MENU_KEYS = MENU_PERMISSIONS.map((m) => m.key);

// 역할 기본 권한 프리셋 (계정 생성 시 초기값으로 사용)
export const ROLE_PRESETS: Record<string, string[]> = {
  admin: ALL_MENU_KEYS,
  asset_manager: ["dashboard", "assets", "assets.create", "imports", "loans", "consumables", "rfid", "seats", "reports"],
  user: ["dashboard", "assets", "loans", "consumables", "seats"],
  auditor: ["dashboard", "assets", "reports", "rfid"],
};
