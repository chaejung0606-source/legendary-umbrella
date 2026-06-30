import { toYyyyMmDd } from "./format";

// Management number rule, preserved verbatim from the source workbook formula:
//   ="["&연번&"]"&TEXT(취득날짜,"yyyymmdd")&분류코드&번호&건축물코드
// e.g.  [1]202407315011B0000142
//
// The platform stores the imported value as `lockedManagementNo` (never
// recomputed) and the computed value as `generatedManagementNo`, so a drift
// between the two can be surfaced as a validation warning.

export interface ManagementNumberParts {
  serialNo?: number | null; // 연번
  acquiredAt?: Date | string | null; // 취득날짜
  classificationCode?: number | string | null; // 분류코드
  itemNo?: number | string | null; // 번호
  buildingCode?: string | null; // 건축물코드
}

/**
 * Compute the management number from its parts.
 * Returns `null` when a required part is missing (cannot form a valid number).
 */
export function generateManagementNo(parts: ManagementNumberParts): string | null {
  const { serialNo, acquiredAt, classificationCode, itemNo, buildingCode } = parts;
  const dateStr = toYyyyMmDd(acquiredAt ?? null);
  if (
    serialNo === null ||
    serialNo === undefined ||
    !dateStr ||
    classificationCode === null ||
    classificationCode === undefined ||
    classificationCode === "" ||
    itemNo === null ||
    itemNo === undefined ||
    itemNo === "" ||
    !buildingCode
  ) {
    return null;
  }
  return `[${serialNo}]${dateStr}${classificationCode}${itemNo}${buildingCode}`;
}

/** Spec-named alias. 관리번호 = "[" + 연번 + "]" + yyyyMMdd + 분류코드 + 번호 + 건축물코드 */
export function generateManagementNumber(parts: ManagementNumberParts): string | null {
  return generateManagementNo(parts);
}

/**
 * Compare an imported (locked) management number against the value the rule
 * would produce. `mismatch` is true only when both exist and differ.
 */
export function evaluateManagementNo(
  locked: string | null | undefined,
  parts: ManagementNumberParts
): { generated: string | null; mismatch: boolean } {
  const generated = generateManagementNo(parts);
  const lockedTrim = locked?.trim() || null;
  const mismatch = !!lockedTrim && !!generated && lockedTrim !== generated;
  return { generated, mismatch };
}
