"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 숫자형 페이지네이션: |« ‹ 1 2 … 10 › »| + 페이지 직접 입력( n / total ).
 * 페이지 번호는 10개 단위 블록으로 표시한다. URL 의 ?page= 쿼리를 갱신한다.
 */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [input, setInput] = useState(String(page));
  useEffect(() => setInput(String(page)), [page]);

  if (totalPages <= 1) return null;

  function go(p: number) {
    const target = Math.min(Math.max(1, p), totalPages);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    router.push(`${pathname}?${params.toString()}`);
  }
  function jump() {
    const n = Number(input);
    if (Number.isFinite(n) && n >= 1) go(Math.round(n));
    else setInput(String(page));
  }

  const blockStart = Math.floor((page - 1) / 10) * 10 + 1;
  const blockEnd = Math.min(blockStart + 9, totalPages);
  const numbers = Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);

  const navBtn =
    "grid h-8 w-8 place-items-center rounded-lg bg-card text-muted-foreground shadow-soft ring-1 ring-black/[0.05] transition hover:text-foreground disabled:opacity-35 disabled:pointer-events-none";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
      <nav className="flex items-center gap-1" aria-label="페이지 이동">
        <button className={navBtn} onClick={() => go(1)} disabled={page === 1} aria-label="첫 페이지">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button className={navBtn} onClick={() => go(page - 1)} disabled={page === 1} aria-label="이전 페이지">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            onClick={() => go(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 rounded-lg px-2 text-sm tabular-nums transition",
              n === page
                ? "bg-brand-200 font-bold text-brand-900 shadow-soft"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
        <button className={navBtn} onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="다음 페이지">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className={navBtn} onClick={() => go(totalPages)} disabled={page === totalPages} aria-label="마지막 페이지">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </nav>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") jump(); }}
          onBlur={jump}
          inputMode="numeric"
          aria-label="페이지 번호 입력"
          className="h-8 w-14 rounded-lg bg-card px-2 text-center tabular-nums shadow-soft ring-1 ring-black/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="tabular-nums">/ {totalPages}</span>
      </div>
    </div>
  );
}
