import bcrypt from "bcryptjs";

/**
 * 비밀번호 저장/검증 — bcrypt 해시.
 *
 * 이전 버전은 평문을 그대로 저장하고 문자 비교로 로그인을 처리했다.
 * 비교 로직만 해시로 바꾸면 기존 계정이 전원 로그인 불가가 되므로 **점진 전환**을 쓴다:
 *   - 저장값이 해시면 bcrypt 로 검증한다.
 *   - 저장값이 평문이면 기존처럼 비교하고, 성공한 순간 해시로 바꿔 저장한다(needsUpgrade).
 * 사용자는 평소처럼 로그인만 하면 되고, 로그인 불가 구간이 생기지 않는다.
 *
 * 모든 계정이 전환된 뒤 평문 경로를 제거하면 끝난다.
 * 오래 로그인하지 않아 남아 있는 계정은 `npm run db:hash-passwords` 로 일괄 변환한다.
 */

// bcrypt 비용 계수. 값을 올리면 검증이 느려지는 대신 무차별 대입에 더 강해진다.
const COST = 10;

// bcrypt 해시는 항상 $2a$ / $2b$ / $2y$ 로 시작하고 60자다.
// 평문 비밀번호가 우연히 이 형태일 가능성은 사실상 없다.
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export function isHashed(stored: string | null | undefined): boolean {
  return !!stored && BCRYPT_PATTERN.test(stored);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

/** 저장값이 이미 해시면 그대로, 평문이면 해시해서 돌려준다(중복 해싱 방지). */
export async function ensureHashed(stored: string): Promise<string> {
  return isHashed(stored) ? stored : hashPassword(stored);
}

export interface VerifyResult {
  /** 비밀번호 일치 여부 */
  ok: boolean;
  /** 평문으로 저장돼 있어 해시로 교체해야 하는 상태(일치했을 때만 true) */
  needsUpgrade: boolean;
}

export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<VerifyResult> {
  if (!stored) return { ok: false, needsUpgrade: false };

  if (isHashed(stored)) {
    return { ok: await bcrypt.compare(plain, stored), needsUpgrade: false };
  }

  // 전환 전 평문 저장값 — 일치하면 호출부가 해시로 교체한다.
  const ok = stored === plain;
  return { ok, needsUpgrade: ok };
}
