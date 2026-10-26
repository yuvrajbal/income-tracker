"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { IncomeEntryForm } from "@/components/income/entry-form";
import { StackedMonthlyChart } from "@/components/charts/stacked-monthly-chart";
import { SourceSplit } from "@/components/income/source-split";
import { SourcesManager } from "@/components/income/sources-manager";
import { SampleBanner } from "@/components/sample-banner";
import { Button, Card, CardHeader, Modal, Segmented, SeriesSwatch, StatTile } from "@/components/ui";
import { formatDay, formatMonthLong, monthKey, todayISO } from "@/lib/dates";
import { RANGE_KEYS, monthlyBySource, rangeMonths, sumCents, totalsBySource, type RangeKey } from "@/lib/income";
import { formatCents } from "@/lib/money";
import { useAppData } from "@/lib/store";
import { useChartColors } from "@/lib/theme";
import type { AppData, IncomeEntry } from "@/lib/types";

export default function IncomePage() {
  const data = useAppData();
  if (!data) return null;
  return <Income data={data} />;
}

function Income({ data }: { data: AppData }) {
  const c = useChartColors();
  const [range, setRange] = useState<RangeKey>("6M");
  const [modal, setModal] = useState<{ entry?: IncomeEntry } | null>(null);
  const today = todayISO();

  const months = rangeMonths(range, today, data.incomeEntries.map((e) => e.receivedOn));
  const monthSet = new Set(months);
  const inRange = data.incomeEntries.filter((e) => monthSet.has(monthKey(e.receivedOn)));

  // Sources shown in charts: active ones, plus archived ones that still have income in range.
  const chartSources = data.incomeSources.filter((s) => !s.archived || inRange.some((e) => e.sourceId === s.id));
  const rows = monthlyBySource(data.incomeEntries, months, chartSources.map((s) => s.id));
  const totals = totalsBySource(data.incomeEntries, months);
  const total = sumCents(inRange);
  const thisMonth = sumCents(data.incomeEntries, (e) => monthKey(e.receivedOn) === monthKey(today));
  const monthsWithIncome = rows.filter((r) => r.total > 0).length;

  const sourceById = new Map(data.incomeSources.map((s) => [s.id, s]));
  const grouped = groupByMonth([...inRange].sort((a, b) => b.receivedOn.localeCompare(a.receivedOn) || b.createdAt.localeCompare(a.createdAt)));

  return (
    <>
      {data.isSample && <SampleBanner />}
      <PageHeader
        title="Income"
        subtitle="Every deposit, by source"
        action={
          <Button variant="primary" onClick={() => setModal({})}>
            <Plus size={16} /> Add income
          </Button>
        }
      />

      <div className="mb-4">
        <Segmented label="Time range" value={range} onChange={setRange} options={RANGE_KEYS.map((k) => ({ value: k, label: k === "ALL" ? "All" : k }))} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label={`Total · ${range === "ALL" ? "all time" : range}`} value={formatCents(total, { whole: true })} hint={`${inRange.length} deposits`} />
        <StatTile
          label="Monthly average"
          value={formatCents(Math.round(total / months.length), { whole: true })}
          hint={`${monthsWithIncome} of ${months.length} months had income`}
        />
        <StatTile label="This month" value={formatCents(thisMonth, { whole: true })} hint={formatMonthLong(monthKey(today))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Monthly income by source"
            action={
              chartSources.length > 1 && (
                <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                  {chartSources.map((s) => (
                    <span key={s.id} className="flex items-center gap-1.5 text-xs text-text-2">
                      <SeriesSwatch color={c.series(s.colorSlot)} />
                      {s.name}
                    </span>
                  ))}
                </div>
              )
            }
          />
          <div className="px-3 pb-3">
            <StackedMonthlyChart rows={rows} series={chartSources} emptyLabel="No income" />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Split by source" subtitle={range === "ALL" ? "All time" : `Last ${range === "YTD" ? "year to date" : range}`} />
          <SourceSplit sources={chartSources} totals={totals} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Deposits" subtitle="Tap one to edit" />
          {grouped.length === 0 && <p className="px-5 pb-5 text-sm text-text-3">Nothing in this period. Add your first deposit above.</p>}
          {grouped.map(([month, entries]) => (
            <div key={month} className="pb-2">
              <div className="flex justify-between bg-surface-2/60 px-5 py-1.5 text-xs font-medium text-text-2">
                <span>{formatMonthLong(month)}</span>
                <span className="tabular">{formatCents(sumCents(entries), { whole: true })}</span>
              </div>
              <ul>
                {entries.map((e) => {
                  const s = sourceById.get(e.sourceId);
                  return (
                    <li key={e.id}>
                      <button onClick={() => setModal({ entry: e })} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2">
                        <SeriesSwatch color={c.series(s?.colorSlot ?? 8)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{s?.name ?? "Unknown"}</span>
                          <span className="block truncate text-xs text-text-3">
                            {formatDay(e.receivedOn)}
                            {e.note && ` · ${e.note}`}
                          </span>
                        </span>
                        <span className="text-sm font-medium tabular">{formatCents(e.amountCents)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Card>
        <Card className="self-start lg:col-span-2">
          <CardHeader title="Sources" subtitle="Archive a source you no longer earn from; its history stays." />
          <SourcesManager data={data} />
        </Card>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.entry ? "Edit income" : "Add income"}>
        {modal && <IncomeEntryForm key={modal.entry?.id ?? "new"} data={data} entry={modal.entry} onDone={() => setModal(null)} />}
      </Modal>
    </>
  );
}

function groupByMonth(entries: IncomeEntry[]): [string, IncomeEntry[]][] {
  const map = new Map<string, IncomeEntry[]>();
  for (const e of entries) {
    const k = monthKey(e.receivedOn);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  return [...map.entries()];
}
