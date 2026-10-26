"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { SeriesSwatch } from "@/components/ui";
import { formatMonthLong, formatMonthShort } from "@/lib/dates";
import { formatCents, formatCentsCompact } from "@/lib/money";
import type { NetWorthRow } from "@/lib/networth";
import { useChartColors } from "@/lib/theme";
import type { Series } from "@/lib/types";

/** Net worth by month: a single total line, or stacked areas per account. */
export function NetWorthChart({
  rows,
  accounts,
  byAccount,
  height = "h-64",
}: {
  rows: NetWorthRow[];
  accounts: Series[];
  byAccount: boolean;
  height?: string;
}) {
  const c = useChartColors();
  const spansYears = rows.length > 0 && rows[0].month.slice(0, 4) !== rows[rows.length - 1].month.slice(0, 4);
  const showDots = rows.length <= 2;
  const totalColor = c.series(1);

  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonthShort(m, spansYears)}
            tick={{ fill: c.axis, fontSize: 11 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
            interval="preserveStartEnd"
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCentsCompact(v)}
            tick={{ fill: c.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: c.axis, strokeDasharray: "3 3" }}
            content={(props) => <NetWorthTooltip {...props} accounts={accounts} color={c.series} />}
          />
          {byAccount ? (
            accounts.map((a) => (
              <Area
                key={a.id}
                dataKey={a.id}
                name={a.name}
                stackId="nw"
                type="monotone"
                stroke={c.series(a.colorSlot)}
                strokeWidth={2}
                fill={c.series(a.colorSlot)}
                fillOpacity={0.25}
                dot={showDots ? { r: 4, strokeWidth: 2, fill: c.surface } : false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: c.surface }}
                isAnimationActive={false}
              />
            ))
          ) : (
            <Area
              dataKey="total"
              name="Net worth"
              type="monotone"
              stroke={totalColor}
              strokeWidth={2}
              fill={totalColor}
              fillOpacity={0.12}
              dot={showDots ? { r: 4, strokeWidth: 2, fill: c.surface } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: c.surface, fill: totalColor }}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function NetWorthTooltip({
  active,
  payload,
  accounts,
  color,
}: TooltipContentProps & { accounts: Series[]; color: (slot: number) => string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as NetWorthRow;
  const withValue = accounts.filter((a) => row[a.id] !== 0);
  return (
    <div className="min-w-48 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 flex justify-between gap-4 font-medium text-text">
        <span>{formatMonthLong(row.month)}</span>
        <span className="tabular">{formatCents(row.total, { whole: true })}</span>
      </div>
      {withValue.map((a) => (
        <div key={a.id} className="flex items-center gap-2 py-0.5 text-text-2">
          <SeriesSwatch color={color(a.colorSlot)} />
          <span className="flex-1">{a.name}</span>
          <span className="tabular text-text">{formatCents(row[a.id], { whole: true })}</span>
        </div>
      ))}
    </div>
  );
}
