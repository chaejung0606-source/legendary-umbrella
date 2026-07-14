// 메뉴별 권한 부여용 카탈로그. 계정에 부여하는 권한 단위는 "메뉴"다.
// 자산 등록(단일/복수)은 자산 원장 메뉴에 포함된다.
export interface MenuPermission {
  key: string;
  label: string;
  href: string;
}

export const MENU_PERMISSIONS: MenuPermission[] = [
  { key: "dashboard", label: "대시보드", href: "/dashboard" },
  { key: "assets", label: "자산 원장", href: "/assets" },
  { key: "loans", label: "대여 관리", href: "/loans" },
  { key: "consumables", label: "연구재료/소모품", href: "/consumables" },
  { key: "promo", label: "홍보물품 관리", href: "/promo" },
  { key: "rfid", label: "RFID/태그 관리", href: "/rfid" },
  { key: "settings", label: "설정", href: "/settings" },
];

export const ALL_MENU_KEYS = MENU_PERMISSIONS.map((m) => m.key);

// 역할 기본 권한 프리셋 (계정 생성 시 초기값으로 사용)
export const ROLE_PRESETS: Record<string, string[]> = {
  admin: ALL_MENU_KEYS,
  asset_manager: ["dashboard", "assets", "loans", "consumables", "promo", "rfid"],
  user: ["dashboard", "assets", "loans", "consumables", "promo"],
  auditor: ["dashboard", "assets", "rfid"],
};
