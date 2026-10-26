"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { SeriesSwatch } from "@/components/ui";
import { formatMonthLong, formatMonthShort } from "@/lib/dates";
import { formatCents, formatCentsCompact } from "@/lib/money";
import { useChartColors } from "@/lib/theme";
import type { Series } from "@/lib/types";

export type StackedRow = { month: string; total: number } & Record<string, number>;

/** Stacked bars: one bar per month, one segment per series (income source, account, ...). */
export function StackedMonthlyChart({
  rows,
  series,
  emptyLabel = "Nothing this month",
}: {
  rows: StackedRow[];
  series: Series[];
  emptyLabel?: string;
}) {
  const c = useChartColors();
  const spansYears = rows.length > 0 && rows[0].month.slice(0, 4) !== rows[rows.length - 1].month.slice(0, 4);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonthShort(m, spansYears)}
            tick={{ fill: c.axis, fontSize: 11 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatCentsCompact(v)}
            tick={{ fill: c.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: c.grid, opacity: 0.5 }}
            content={(props) => <MonthTooltip {...props} series={series} color={c.series} emptyLabel={emptyLabel} />}
          />
          {series.map((s) => (
            <Bar
              key={s.id}
              dataKey={s.id}
              name={s.name}
              stackId="stack"
              fill={c.series(s.colorSlot)}
              stroke={c.surface}
              strokeWidth={2}
              radius={[4, 4, 4, 4]}
              maxBarSize={44}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthTooltip({
  active,
  payload,
  series,
  color,
  emptyLabel,
}: TooltipContentProps & { series: Series[]; color: (slot: number) => string; emptyLabel: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as StackedRow;
  const withValue = series.filter((s) => row[s.id] > 0);
  return (
    <div className="min-w-44 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 font-medium text-text">{formatMonthLong(row.month)}</div>
      {withValue.length === 0 && <div className="text-text-3">{emptyLabel}</div>}
      {withValue.map((s) => (
        <div key={s.id} className="flex items-center gap-2 py-0.5 text-text-2">
          <SeriesSwatch color={color(s.colorSlot)} />
          <span className="flex-1">{s.name}</span>
          <span className="tabular text-text">{formatCents(row[s.id], { whole: true })}</span>
        </div>
      ))}
      {withValue.length > 1 && (
        <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium text-text">
          <span>Total</span>
          <span className="tabular">{formatCents(row.total, { whole: true })}</span>
        </div>
      )}
    </div>
  );
}
