"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 물품별 수불대장 인쇄 버튼.
 * #promo-ledger-print 영역만 보이도록 인쇄 전용 CSS를 함께 주입한다 (앱 셸 숨김).
 */
export function LedgerPrintButton() {
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> 인쇄
      </Button>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #promo-ledger-print, #promo-ledger-print * { visibility: visible; }
          #promo-ledger-print { position: absolute; inset: 0; width: 100%; padding: 0; box-shadow: none !important; }
          #promo-ledger-print .rounded-card, #promo-ledger-print .shadow-soft { box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}
