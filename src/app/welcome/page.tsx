import { redirect } from "next/navigation";

// 구 랜딩 경로 → 로그인으로 통합.
export default function WelcomePage() {
  redirect("/");
}
