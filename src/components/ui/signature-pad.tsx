"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

/**
 * 드로잉 서명란 — 마우스/터치/펜으로 서명하고 PNG data URL 을 돌려준다.
 * 서명이 비어 있으면 onChange(null).
 */
export function SignaturePad({ onChange, height = 120 }: { onChange: (dataUrl: string | null) => void; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // 캔버스를 표시 크기에 맞춰 초기화 (레티나 대응)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1); // 점 찍기 지원
    ctx.stroke();
    commit();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    e.currentTarget.getContext("2d")?.closePath();
    commit();
  }
  function commit() {
    setHasInk(true);
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  }
  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
    onChange(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/[0.06]">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height, touchAction: "none" }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground/60">
            <span className="inline-flex items-center gap-1.5"><PenLine className="h-4 w-4" /> 여기에 서명해주세요</span>
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
          <Eraser className="h-3.5 w-3.5" /> 지우고 다시 서명
        </button>
      </div>
    </div>
  );
}
