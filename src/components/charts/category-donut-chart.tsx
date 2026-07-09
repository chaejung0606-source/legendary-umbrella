"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryRatioPoint } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";

export function CategoryDonutChart({ data }: { data: CategoryRatioPoint[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={66} outerRadius={96} paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 8px 30px -12px rgba(120,150,135,0.4)", fontSize: 12 }}
              formatter={(value: number, _n, p) => [`${formatNumber(value)}건 · ${formatCurrency((p?.payload as CategoryRatioPoint)?.amount)}`, (p?.payload as CategoryRatioPoint)?.name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{formatNumber(total)}</span>
          <span className="text-xs text-muted-foreground">전체 자산</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">{formatNumber(d.count)}건</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
