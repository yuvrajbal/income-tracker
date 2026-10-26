import { monthKey, monthRange } from "./dates";
import type { Account, AccountValue, Contribution, ID } from "./types";

/** Latest value of an account on or before `date` (ties broken by entry time). */
export function latestValue(values: AccountValue[], accountId: ID, date: string): AccountValue | null {
  let best: AccountValue | null = null;
  for (const v of values) {
    if (v.accountId !== accountId || v.asOf > date) continue;
    if (!best || v.asOf > best.asOf || (v.asOf === best.asOf && v.createdAt > best.createdAt)) best = v;
  }
  return best;
}

export function firstValue(values: AccountValue[], accountId: ID): AccountValue | null {
  let best: AccountValue | null = null;
  for (const v of values) {
    if (v.accountId !== accountId) continue;
    if (!best || v.asOf < best.asOf || (v.asOf === best.asOf && v.createdAt < best.createdAt)) best = v;
  }
  return best;
}

export function lastDayOfMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

/** Sum of every account's latest value on or before `date`. */
export function netWorthAt(accounts: Account[], values: AccountValue[], date: string): number {
  return accounts.reduce((sum, a) => sum + (latestValue(values, a.id, date)?.valueCents ?? 0), 0);
}

export type NetWorthRow = { month: string; total: number } & Record<ID, number>;

/**
 * One row per month: each account's latest value as of month end (carried forward when
 * not updated that month), and the total. The current month uses values up to `today`.
 */
export function netWorthByMonth(accounts: Account[], values: AccountValue[], months: string[], today: string): NetWorthRow[] {
  return months.map((m) => {
    const end = monthKey(today) === m ? today : lastDayOfMonth(m);
    const row = { month: m, total: 0 } as NetWorthRow;
    for (const a of accounts) {
      const v = latestValue(values, a.id, end)?.valueCents ?? 0;
      row[a.id] = v;
      row.total += v;
    }
    return row;
  });
}

/** Months from the first recorded value to today (just today's month when empty). */
export function trackedMonths(values: AccountValue[], today: string): string[] {
  const end = monthKey(today);
  const first = values.reduce((min, v) => (monthKey(v.asOf) < min ? monthKey(v.asOf) : min), end);
  return monthRange(first, end);
}

export interface AccountGrowth {
  startValue: number;
  startDate: string;
  currentValue: number;
  /** Contributions minus withdrawals logged after the first value. */
  netContributed: number;
  /** current - start - netContributed: the change contributions don't explain (market moves). */
  growth: number;
}

/**
 * Splits an account's change since tracking began into contributions vs market movement.
 * Only contributions dated after the first recorded value count, since the first value
 * already includes everything before it.
 */
export function accountGrowth(values: AccountValue[], contributions: Contribution[], accountId: ID, today: string): AccountGrowth | null {
  const first = firstValue(values, accountId);
  const current = latestValue(values, accountId, today);
  if (!first || !current) return null;
  const netContributed = contributions
    .filter((c) => c.accountId === accountId && c.contributedOn > first.asOf && c.contributedOn <= current.asOf)
    .reduce((s, c) => s + (c.kind === "contribution" ? c.amountCents : -c.amountCents), 0);
  return {
    startValue: first.valueCents,
    startDate: first.asOf,
    currentValue: current.valueCents,
    netContributed,
    growth: current.valueCents - first.valueCents - netContributed,
  };
}
