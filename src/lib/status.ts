import type { AssetStatus, TagStatus, UsageType, LoanStatus, ConsumableStatus, ImportSeverity } from "@/types";

// 파스텔 톤 → Tailwind 클래스 매핑. 모든 배지/상태 표시가 이 토큰을 공유한다.
export type Tone =
  | "lavender" | "purple" | "pink" | "rose" | "sky" | "mint" | "cream" | "apricot" | "coral" | "slate";

export const toneClasses: Record<Tone, string> = {
  lavender: "bg-pastel-lavender text-pastel-lavenderInk",
  purple: "bg-pastel-purple text-pastel-purpleInk",
  pink: "bg-pastel-pink text-pastel-pinkInk",
  rose: "bg-pastel-rose text-pastel-roseInk",
  sky: "bg-pastel-sky text-pastel-skyInk",
  mint: "bg-pastel-mint text-pastel-mintInk",
  cream: "bg-pastel-cream text-pastel-creamInk",
  apricot: "bg-pastel-apricot text-pastel-apricotInk",
  coral: "bg-pastel-coral text-pastel-coralInk",
  slate: "bg-muted text-muted-foreground",
};

// 카드 등 큰 면적용 (연한 배경 + 진한 잉크)
export const surfaceClasses: Record<Tone, string> = toneClasses;

export const assetStatusTone: Record<AssetStatus, Tone> = {
  정상: "mint",
  사용중: "sky",
  보관중: "lavender",
  대여중: "purple",
  점검필요: "cream",
  수리중: "apricot",
  분실: "coral",
  폐기예정: "slate",
};

export const tagStatusTone: Record<TagStatus | "미지정", Tone> = {
  부착: "mint",
  미부착: "cream",
  미발급: "slate",
  손상: "coral",
  미지정: "slate",
};

export const usageTone: Record<UsageType, Tone> = {
  개인사용: "sky",
  좌석사용: "lavender",
  사무실보관: "slate",
  대여용: "purple",
  소모품: "cream",
  미확인: "slate",
};

export const loanTone: Record<LoanStatus, Tone> = {
  보관: "mint",
  직원사용: "sky",
  대여중: "apricot",
  수리: "cream",
  분실: "coral",
  폐기: "slate",
};

export const consumableTone: Record<ConsumableStatus, Tone> = {
  정상: "mint",
  부족: "cream",
  소진: "coral",
};

export const severityTone: Record<ImportSeverity, Tone> = {
  error: "coral",
  warning: "cream",
  info: "sky",
};

/** 범용 진입점 — 종류와 값을 받아 톤을 돌려준다. */
export function getStatusColor(
  kind: "asset" | "tag" | "usage" | "loan" | "consumable" | "severity",
  value: string
): Tone {
  switch (kind) {
    case "asset": return assetStatusTone[value as AssetStatus] ?? "slate";
    case "tag": return tagStatusTone[value as TagStatus] ?? "slate";
    case "usage": return usageTone[value as UsageType] ?? "slate";
    case "loan": return loanTone[value as LoanStatus] ?? "slate";
    case "consumable": return consumableTone[value as ConsumableStatus] ?? "slate";
    case "severity": return severityTone[value as ImportSeverity] ?? "slate";
    default: return "slate";
  }
}
