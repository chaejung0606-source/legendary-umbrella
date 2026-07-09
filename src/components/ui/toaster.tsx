"use client";
import * as React from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// 전역 알림(토스트). 기능 실행 결과와 "왜 안 되는지" 안내를 한 곳에서 처리한다.
export type ToastKind = "success" | "info" | "warning" | "error";
export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

const ToastContext = React.createContext<{
  toast: (t: Omit<ToastItem, "id">) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, { box: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { box: "bg-pastel-mint text-pastel-mintInk", icon: CheckCircle2 },
  info: { box: "bg-pastel-lavender text-pastel-lavenderInk", icon: Info },
  warning: { box: "bg-pastel-cream text-pastel-creamInk", icon: AlertTriangle },
  error: { box: "bg-pastel-coral text-pastel-coralInk", icon: XCircle },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-3), { ...t, id }]);
    // 안내문이 긴 토스트는 조금 더 오래 보여준다.
    const ttl = t.description && t.description.length > 60 ? 9000 : 5000;
    setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(400px,calc(100vw-2.5rem))] flex-col gap-2.5">
        {items.map((t) => {
          const Icon = KIND_STYLE[t.kind].icon;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-soft-lg ring-1 ring-black/[0.05] animate-fade-in-up",
                KIND_STYLE[t.kind].box
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{t.title}</div>
                {t.description && <div className="mt-0.5 text-xs leading-relaxed opacity-90">{t.description}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded-lg p-1 opacity-60 transition hover:opacity-100" aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
