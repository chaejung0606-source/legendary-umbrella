import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 로그인 후 이동할 내부 경로만 허용한다.
// "//evil.com" · "/\evil.com" 은 브라우저가 외부 주소로 해석하므로 걸러낸다(오픈 리다이렉트 방지).
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
