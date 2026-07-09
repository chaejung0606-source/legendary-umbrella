"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SoftToggleProps {
  defaultOn?: boolean;
  label?: string;
  onChange?: (on: boolean) => void;
}

// 무광 세라믹 캡슐 토글 — 플라스틱 스위치 느낌 배제, 실제 상태 변경(useState).
export function SoftToggle({ defaultOn = false, label, onChange }: SoftToggleProps) {
  const [on, setOn] = useState(defaultOn);
  function toggle() {
    const next = !on;
    setOn(next);
    onChange?.(next);
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      {label && <span className="text-sm font-medium text-ceramic-sub">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label ?? "토글"}
        onClick={toggle}
        className={cn(
          "relative h-8 w-14 rounded-full transition-colors duration-300",
          on ? "ceramic-mint" : "ceramic-inset"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full transition-[left] duration-300 ease-out",
            "ceramic-btn",
            on ? "left-7" : "left-1"
          )}
        />
      </button>
    </label>
  );
}
