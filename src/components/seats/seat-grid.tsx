import { Monitor, MonitorSmartphone, Printer, Phone, AlertTriangle, UserRound } from "lucide-react";
import type { Seat, SeatAsset } from "@/types";
import { cn } from "@/lib/utils";

const SLOT_ICON: Record<SeatAsset["slot"], React.ComponentType<{ className?: string }>> = {
  desktop: MonitorSmartphone,
  monitor: Monitor,
  printer: Printer,
  phone: Phone,
};

export function SeatGrid({ seats }: { seats: Seat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {seats.map((seat) => {
        const empty = !seat.occupantName;
        return (
          <div
            key={seat.id}
            className={cn(
              "rounded-card p-5 shadow-soft ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg",
              empty ? "bg-muted/50" : "bg-card"
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className={cn("grid h-11 w-11 place-items-center rounded-2xl text-lg font-bold", empty ? "bg-card text-muted-foreground" : "bg-pastel-lavender text-pastel-lavenderInk")}>
                {seat.code}
              </span>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">좌석 {seat.code}</div>
                {empty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">미배정</span>
                ) : (
                  <div className="flex items-center gap-1.5 font-semibold"><UserRound className="h-3.5 w-3.5 text-pastel-lavenderInk" />{seat.occupantName}</div>
                )}
              </div>
            </div>
            <ul className="space-y-1.5">
              {seat.assets.map((slot) => {
                const Icon = SLOT_ICON[slot.slot];
                return (
                  <li key={slot.slot} className="flex items-center justify-between gap-2 rounded-xl bg-background/60 px-2.5 py-1.5 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" /> {slot.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">{slot.rawValue ?? "-"}</span>
                      {slot.needsReview && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-pastel-apricot px-1.5 py-0.5 text-[10px] font-semibold text-pastel-apricotInk">
                          <AlertTriangle className="h-3 w-3" /> 검토
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
