"use client";

import { SeriesSwatch } from "@/components/ui";
import { formatCents } from "@/lib/money";
import { useChartColors } from "@/lib/theme";
import type { ID, IncomeSource } from "@/lib/types";

/**
 * Share of income per source: a single 100% bar plus a table with amounts and percentages.
 * Easier to read than a donut with only a handful of sources.
 */
export function SourceSplit({ sources, totals }: { sources: IncomeSource[]; totals: Map<ID, number> }) {
  const c = useChartColors();
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const rows = sources
    .map((s) => ({ source: s, cents: totals.get(s.id) ?? 0 }))
    .filter((r) => r.cents > 0 || !r.source.archived)
    .sort((a, b) => b.cents - a.cents);

  if (total === 0) {
    return <p className="px-5 pb-5 text-sm text-text-3">No income in this period yet.</p>;
  }

  return (
    <div className="px-5 pb-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Income share by source">
        {rows
          .filter((r) => r.cents > 0)
          .map((r) => (
            <div
              key={r.source.id}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(r.cents / total) * 100}%`, background: c.series(r.source.colorSlot) }}
              title={`${r.source.name}: ${((r.cents / total) * 100).toFixed(0)}%`}
            />
          ))}
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.source.id} className="border-b border-border last:border-0">
              <td className="py-2">
                <span className="flex items-center gap-2">
                  <SeriesSwatch color={c.series(r.source.colorSlot)} />
                  <span className={r.cents === 0 ? "text-text-3" : ""}>{r.source.name}</span>
                </span>
              </td>
              <td className="py-2 text-right tabular text-text-2">{((r.cents / total) * 100).toFixed(0)}%</td>
              <td className="w-28 py-2 text-right tabular font-medium">{formatCents(r.cents, { whole: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
