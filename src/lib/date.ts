// 앱이 말하는 "오늘"은 언제나 **한국 시간(Asia/Seoul)** 기준이다.
//
// 왜 별도 모듈인가:
//   1) 서버(Vercel)는 UTC 로 동작한다. `new Date().toISOString().slice(0,10)` 를 쓰면
//      매일 09:00(KST) 이전에는 날짜가 하루 밀려 대여일자·수불일자가 어제로 기록된다.
//   2) 예전에는 `pools.TODAY` 라는 **고정 문자열**을 런타임에서도 그대로 썼다.
//      더미 데이터 생성의 결정성을 위한 값이었는데 실제 저장·표시에까지 쓰이면서
//      날짜가 과거에 멈춰버렸다. 그래서 런타임용 "오늘"을 여기로 분리한다.
//   3) 서버·클라이언트 모두 타임존을 Asia/Seoul 로 고정하므로 두 곳의 값이 같다
//      (하이드레이션 불일치 없음).

const YMD_KST = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 오늘 날짜 (KST, "YYYY-MM-DD") */
export function todayKst(): string {
  return YMD_KST.format(new Date());
}

/** 이번 달 (KST, "YYYY-MM") */
export function thisMonthKst(): string {
  return todayKst().slice(0, 7);
}

/** "YYYY-MM-DD" 에 일수를 더한 날짜 ("YYYY-MM-DD"). 음수면 과거. */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** 두 날짜(YYYY-MM-DD) 사이의 일수 차이 (to - from). 시간대 영향 없이 계산한다. */
export function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}
