import { monthKey } from "./dates";
import type { Contribution, ID } from "./types";

export type ContributionMonthRow = { month: string; total: number } & Record<ID, number>;

/** Contributions (not withdrawals) per account per month; empty months are kept as zeros. */
export function monthlyContributions(txns: Contribution[], months: string[], accountIds: ID[]): ContributionMonthRow[] {
  const rows = new Map<string, ContributionMonthRow>();
  for (const m of months) {
    const row = { month: m, total: 0 } as ContributionMonthRow;
    for (const id of accountIds) row[id] = 0;
    rows.set(m, row);
  }
  for (const t of txns) {
    if (t.kind !== "contribution") continue;
    const row = rows.get(monthKey(t.contributedOn));
    if (!row || !(t.accountId in row)) continue;
    row[t.accountId] += t.amountCents;
    row.total += t.amountCents;
  }
  return months.map((m) => rows.get(m)!);
}

export function sumKind(txns: Contribution[], kind: Contribution["kind"], pred: (t: Contribution) => boolean = () => true): number {
  return txns.reduce((s, t) => (t.kind === kind && pred(t) ? s + t.amountCents : s), 0);
}
