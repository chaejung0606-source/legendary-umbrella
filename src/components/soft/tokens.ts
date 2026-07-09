// 무광 세라믹 랜딩(/welcome)에서 반복되는 디자인 값 상수.
// 라운드/그림자/색은 여기 한 곳에서만 조정하면 전 컴포넌트에 반영된다.

export const RADIUS = {
  card: "rounded-[28px]",
  cardLg: "rounded-[36px]",
  badge: "rounded-[16px]",
  pill: "rounded-full",
} as const;

// 세라믹 표면 변형(globals.css 의 클래스와 1:1 매핑)
export const SURFACE = {
  surface: "ceramic grain",
  surface2: "ceramic-2 grain",
  inset: "ceramic-inset",
  mint: "ceramic-mint grain",
  sky: "ceramic-sky grain",
  pink: "ceramic-pink grain",
  sage: "ceramic-sage grain",
} as const;

export type SurfaceVariant = keyof typeof SURFACE;

// 진행바/악센트 색 (강한 원색 금지 — 민트/하늘/세이지/핑크 파스텔)
export const ACCENT = {
  mint: "#8FB9A8",
  sky: "#8FB6CC",
  sage: "#9FB7A4",
  pink: "#D9A7A0",
} as const;

export type AccentKey = keyof typeof ACCENT;
