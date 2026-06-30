import { USAGE_TYPES, SEAT_CODES } from "./constants";

// Classify the free-text 사용처 column into a structured usage type so the
// ledger is not just a string blob. Rules are derived from the real source
// values (개인 이름, 좌석코드 A~O, 사무실 보관, 소모품, 대여용 노트북, 미확인 …).
// Anything ambiguous is classified on a best-effort basis AND flagged
// `needsReview` so a human can confirm rather than the platform guessing
// silently.

export interface UsageClassification {
  usageType: string; // one of USAGE_TYPES values
  assigneeName: string | null; // 사용자 / 좌석 / 팀
  needsReview: boolean;
  reason: string;
}

const KOREAN_NAME = /^[가-힣]{2,4}$/;
const COMPANY_HINT = /(주식회사|\(주\)|㈜|회사|서비스|개발)/;

export function classifyUsage(raw: string | null | undefined): UsageClassification {
  const value = (raw ?? "").toString().trim();

  if (!value) {
    return { usageType: USAGE_TYPES.미확인, assigneeName: null, needsReview: false, reason: "빈 값" };
  }

  // 소모품
  if (value.includes("소모품")) {
    return { usageType: USAGE_TYPES.소모품, assigneeName: null, needsReview: false, reason: "소모품 키워드" };
  }

  // 대여용 / 노트북
  if (value.includes("대여") || value.includes("노트북")) {
    return { usageType: USAGE_TYPES.대여용, assigneeName: null, needsReview: false, reason: "대여 키워드" };
  }

  // 사무실 보관 / 공용(회의실)
  if (value.includes("보관")) {
    return { usageType: USAGE_TYPES.사무실보관, assigneeName: null, needsReview: false, reason: "보관 키워드" };
  }
  if (value.includes("회의실")) {
    return { usageType: USAGE_TYPES.사무실보관, assigneeName: "회의실", needsReview: false, reason: "회의실 공용" };
  }

  // 미확인 (명시적)
  if (value === "?" ) {
    return { usageType: USAGE_TYPES.미확인, assigneeName: null, needsReview: true, reason: "물음표" };
  }
  if (value.startsWith("미확인")) {
    const rest = value.replace(/^미확인/, "").trim();
    return {
      usageType: USAGE_TYPES.미확인,
      assigneeName: rest || null,
      needsReview: true,
      reason: "미확인 접두",
    };
  }

  // 좌석 사용 — 단일 대문자 A~O (해당 좌석에 사용자명이 없는 경우 좌석코드로 기재됨)
  if (value.length === 1 && SEAT_CODES.includes(value.toUpperCase())) {
    return {
      usageType: USAGE_TYPES.좌석사용,
      assigneeName: value.toUpperCase(),
      needsReview: false,
      reason: "좌석코드",
    };
  }

  // 회사/벤더로 보이는 값 → 미확인 + 검토
  if (COMPANY_HINT.test(value)) {
    return { usageType: USAGE_TYPES.미확인, assigneeName: value, needsReview: true, reason: "업체로 추정" };
  }

  // 깨끗한 한글 인명 → 개인 사용
  if (KOREAN_NAME.test(value)) {
    return { usageType: USAGE_TYPES.개인사용, assigneeName: value, needsReview: false, reason: "인명" };
  }

  // 그 외 (공백/숫자/괄호 등 혼합: "이세영 11번", "이세영 12번(권석재)", "A자리 옆 책상 위(방주희)")
  // → 개인 사용으로 추정하되 검토 필요. 괄호 안 이름이 있으면 그것을 우선 사용자로 추출.
  const paren = value.match(/\(([^)]+)\)/);
  const leading = value.split(/[\s(]/)[0];
  const candidate = paren?.[1]?.trim() || leading || value;
  return {
    usageType: USAGE_TYPES.개인사용,
    assigneeName: candidate || value,
    needsReview: true,
    reason: "복합 문자열 — 사용자 추정",
  };
}
