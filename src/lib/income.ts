import { addMonths, monthKey, monthRange } from "./dates";
import type { ID, IncomeEntry } from "./types";

export type RangeKey = "3M" | "6M" | "YTD" | "12M" | "ALL";
export const RANGE_KEYS: RangeKey[] = ["3M", "6M", "YTD", "12M", "ALL"];

/** Month keys covered by a range, ending at the month of `today`. "ALL" starts at the earliest of `dates`. */
export function rangeMonths(range: RangeKey, today: string, dates: string[]): string[] {
  const end = monthKey(today);
  switch (range) {
    case "3M":
      return monthRange(addMonths(end, -2), end);
    case "6M":
      return monthRange(addMonths(end, -5), end);
    case "12M":
      return monthRange(addMonths(end, -11), end);
    case "YTD":
      return monthRange(`${end.slice(0, 4)}-01`, end);
    case "ALL": {
      const first = dates.reduce<string>((min, d) => (monthKey(d) < min ? monthKey(d) : min), end);
      return monthRange(first, end);
    }
  }
}

export type MonthRow = { month: string; total: number } & Record<ID, number>;

/** One row per month with cents per source id; months with no income are present with zeros. */
export function monthlyBySource(entries: IncomeEntry[], months: string[], sourceIds: ID[]): MonthRow[] {
  const rows = new Map<string, MonthRow>();
  for (const m of months) {
    const row = { month: m, total: 0 } as MonthRow;
    for (const id of sourceIds) row[id] = 0;
    rows.set(m, row);
  }
  for (const e of entries) {
    const row = rows.get(monthKey(e.receivedOn));
    if (!row || !(e.sourceId in row)) continue;
    row[e.sourceId] += e.amountCents;
    row.total += e.amountCents;
  }
  return months.map((m) => rows.get(m)!);
}

export function totalsBySource(entries: IncomeEntry[], months: string[]): Map<ID, number> {
  const inRange = new Set(months);
  const totals = new Map<ID, number>();
  for (const e of entries) {
    if (!inRange.has(monthKey(e.receivedOn))) continue;
    totals.set(e.sourceId, (totals.get(e.sourceId) ?? 0) + e.amountCents);
  }
  return totals;
}

export function sumCents(entries: IncomeEntry[], pred: (e: IncomeEntry) => boolean = () => true): number {
  return entries.reduce((s, e) => (pred(e) ? s + e.amountCents : s), 0);
}
