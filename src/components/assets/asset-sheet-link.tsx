import Link from "next/link";
import { Sheet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 자산 원장 헤더의 구글시트 바로가기.
 * 주소는 설정 > 구글시트 연동의 '자산 현황 시트 URL'(앱 설정 sheet.assets.url)에서 읽는다 — 코드에 하드코딩하지 않는다.
 * https 주소만 링크로 쓰고, 미등록이면 설정 권한자에게는 설정 화면으로, 그 외에는 비활성 버튼으로 안내한다. */
export function AssetSheetLink({ url, canConfigure }: { url?: string; canConfigure: boolean }) {
  const href = url && /^https:\/\//i.test(url.trim()) ? url.trim() : null;
  if (href) {
    return (
      <Button asChild variant="outline">
        <a href={href} target="_blank" rel="noopener noreferrer" title="자산 현황 구글시트 열기 (새 탭)">
          <Sheet className="h-4 w-4" /> 구글시트 <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </Button>
    );
  }
  if (canConfigure) {
    return (
      <Button asChild variant="outline">
        <Link href="/settings?tab=sheets" title="설정 > 구글시트 연동에서 '자산 현황 시트 URL'을 등록하세요">
          <Sheet className="h-4 w-4" /> 구글시트 연결
        </Link>
      </Button>
    );
  }
  return (
    <Button variant="outline" disabled title="관리자가 설정에서 자산 현황 시트 주소를 등록하면 열 수 있습니다">
      <Sheet className="h-4 w-4" /> 구글시트
    </Button>
  );
}
