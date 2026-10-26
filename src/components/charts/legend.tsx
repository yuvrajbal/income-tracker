"use client";

import { SeriesSwatch } from "@/components/ui";
import { useChartColors } from "@/lib/theme";
import type { Series } from "@/lib/types";

export function SeriesLegend({ series }: { series: Series[] }) {
  const c = useChartColors();
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
      {series.map((s) => (
        <span key={s.id} className="flex items-center gap-1.5 text-xs text-text-2">
          <SeriesSwatch color={c.series(s.colorSlot)} />
          {s.name}
        </span>
      ))}
    </div>
  );
}
