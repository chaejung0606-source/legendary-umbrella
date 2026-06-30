"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { MonthlyAcquisitionPoint } from "@/types";
import { formatCurrency } from "@/lib/format";

export function MonthlyAssetChart({ data }: { data: MonthlyAcquisitionPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a48cf2" />
            <stop offset="100%" stopColor="#cdbdf8" />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9a93b5" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9a93b5" }} width={36} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "rgba(164,140,242,0.08)" }}
          contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 8px 30px -12px rgba(124,99,230,0.35)", fontSize: 12 }}
          formatter={(value: number, name) => (name === "count" ? [`${value}건`, "등록 건수"] : [formatCurrency(value), "취득금액"])}
        />
        <Bar dataKey="count" radius={[8, 8, 8, 8]} maxBarSize={34}>
          {data.map((d, i) => (
            <Cell key={i} fill="url(#barGrad)" opacity={0.55 + 0.45 * (d.count / max)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
