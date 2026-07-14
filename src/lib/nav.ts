import {
  LayoutDashboard, Boxes, PlusCircle, Upload, Laptop, FlaskConical,
  ScanLine, Armchair, BarChart3, Settings, ArrowLeftRight, Gift, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  tone?: string; // pill accent
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/assets", label: "자산 원장", icon: Boxes },
  { href: "/assets/new", label: "자산 등록", icon: PlusCircle, exact: true },
  { href: "/imports", label: "엑셀 가져오기", icon: Upload },
  { href: "/loans", label: "대여 관리", icon: ArrowLeftRight },
  { href: "/laptop-loans", label: "노트북 대여현황", icon: Laptop },
  { href: "/consumables", label: "연구재료/소모품", icon: FlaskConical },
  { href: "/promo", label: "홍보물품 관리", icon: Gift },
  { href: "/rfid", label: "RFID/태그 관리", icon: ScanLine },
  { href: "/seats", label: "좌석/배치 현황", icon: Armchair },
  { href: "/reports", label: "통계/리포트", icon: BarChart3 },
  { href: "/settings", label: "설정", icon: Settings },
];
