"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { SeriesLegend } from "@/components/charts/legend";
import { StackedMonthlyChart } from "@/components/charts/stacked-monthly-chart";
import { ContributionForm } from "@/components/contributions/contribution-form";
import { RoomCards, RoomSeedForm } from "@/components/contributions/room";
import { SampleBanner } from "@/components/sample-banner";
import { Button, Card, CardHeader, Modal, Segmented, SeriesSwatch, StatTile } from "@/components/ui";
import { monthlyContributions, sumKind } from "@/lib/contributions";
import { formatDay, formatMonthLong, monthKey, todayISO } from "@/lib/dates";
import { RANGE_KEYS, rangeMonths, type RangeKey } from "@/lib/income";
import { formatCents } from "@/lib/money";
import { latestSeed, rrspTaxYear } from "@/lib/room";
import { useAppData } from "@/lib/store";
import { useChartColors } from "@/lib/theme";
import type { AppData, Contribution, RoomType } from "@/lib/types";

type ModalState = { kind: "txn"; contribution?: Contribution } | { kind: "seed"; type: RoomType } | null;

export default function ContributionsPage() {
  const data = useAppData();
  if (!data) return null;
  return <Contributions data={data} />;
}

function Contributions({ data }: { data: AppData }) {
  const c = useChartColors();
  const [range, setRange] = useState<RangeKey>("12M");
  const [modal, setModal] = useState<ModalState>(null);
  const today = todayISO();
  const year = today.slice(0, 4);
  const thisMonth = monthKey(today);

  const months = rangeMonths(range, today, data.contributions.map((t) => t.contributedOn));
  const monthSet = new Set(months);
  const inRange = data.contributions.filter((t) => monthSet.has(monthKey(t.contributedOn)));
  const chartAccounts = data.accounts.filter((a) => inRange.some((t) => t.accountId === a.id && t.kind === "contribution"));
  const rows = monthlyContributions(data.contributions, months, chartAccounts.map((a) => a.id));

  const contributedYtd = sumKind(data.contributions, "contribution", (t) => t.contributedOn.startsWith(year));
  const withdrawnYtd = sumKind(data.contributions, "withdrawal", (t) => t.contributedOn.startsWith(year));
  const contributedMonth = sumKind(data.contributions, "contribution", (t) => monthKey(t.contributedOn) === thisMonth);
  const firstDate = data.contributions.reduce<string | null>((min, t) => (!min || t.contributedOn < min ? t.contributedOn : min), null);

  const accountById = new Map(data.accounts.map((a) => [a.id, a]));
  const grouped = groupByMonth([...inRange].sort((a, b) => b.contributedOn.localeCompare(a.contributedOn) || b.createdAt.localeCompare(a.createdAt)));

  return (
    <>
      {data.isSample && <SampleBanner />}
      <PageHeader
        title="Contributions"
        subtitle={firstDate ? `Tracking since ${formatDay(firstDate)}` : "Money you put into (or take out of) your accounts"}
        action={
          data.accounts.length > 0 && (
            <Button variant="primary" onClick={() => setModal({ kind: "txn" })}>
              <Plus size={16} /> Add contribution
            </Button>
          )
        }
      />

      <RoomCards data={data} onSetup={(type) => setModal({ kind: "seed", type })} />

      {data.accounts.length === 0 ? (
        <Card className="mt-4 px-5 py-10 text-center">
          <p className="text-sm font-medium">Add an account first</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-2">Contributions go into an account, like your TFSA or FHSA.</p>
          <Link href="/net-worth" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
            Go to Net worth
          </Link>
        </Card>
      ) : (
        <>
          <div className="mt-6 mb-4">
            <Segmented label="Time range" value={range} onChange={setRange} options={RANGE_KEYS.map((k) => ({ value: k, label: k === "ALL" ? "All" : k }))} />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label={`Contributed in ${year}`} value={formatCents(contributedYtd, { whole: true })} />
            <StatTile label="This month" value={formatCents(contributedMonth, { whole: true })} hint={formatMonthLong(thisMonth)} />
            <StatTile label={`Withdrawn in ${year}`} value={formatCents(withdrawnYtd, { whole: true })} />
          </div>

          <Card>
            <CardHeader title="Contributed per month" action={<SeriesLegend series={chartAccounts} />} />
            <div className="px-3 pb-3">
              <StackedMonthlyChart rows={rows} series={chartAccounts} emptyLabel="No contributions" />
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader title="History" subtitle="Tap one to edit" />
            {grouped.length === 0 && <p className="px-5 pb-5 text-sm text-text-3">Nothing in this period yet.</p>}
            {grouped.map(([month, txns]) => (
              <div key={month} className="pb-2">
                <div className="flex justify-between bg-surface-2/60 px-5 py-1.5 text-xs font-medium text-text-2">
                  <span>{formatMonthLong(month)}</span>
                  <span className="tabular">{formatCents(sumKind(txns, "contribution") - sumKind(txns, "withdrawal"), { whole: true })} net</span>
                </div>
                <ul>
                  {txns.map((t) => {
                    const a = accountById.get(t.accountId);
                    const withdrawal = t.kind === "withdrawal";
                    const taxYearNote = a?.type === "rrsp" && rrspTaxYear(t) !== Number(t.contributedOn.slice(0, 4)) ? ` · for ${rrspTaxYear(t)} tax year` : "";
                    return (
                      <li key={t.id}>
                        <button onClick={() => setModal({ kind: "txn", contribution: t })} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-2">
                          <SeriesSwatch color={c.series(a?.colorSlot ?? 8)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {a?.name ?? "Deleted account"}
                              {withdrawal && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-2">Withdrawal</span>}
                            </span>
                            <span className="block truncate text-xs text-text-3">
                              {formatDay(t.contributedOn)}
                              {taxYearNote}
                              {t.note && ` · ${t.note}`}
                            </span>
                          </span>
                          <span className="text-sm font-medium tabular">
                            {withdrawal ? "−" : ""}
                            {formatCents(t.amountCents)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </Card>
        </>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.kind === "seed" ? `${modal.type.toUpperCase()} contribution room` : modal?.contribution ? "Edit contribution" : "Add contribution"}
      >
        {modal?.kind === "txn" && (
          <ContributionForm key={modal.contribution?.id ?? "new"} data={data} contribution={modal.contribution} onDone={() => setModal(null)} />
        )}
        {modal?.kind === "seed" && (
          <RoomSeedForm key={modal.type} type={modal.type} current={latestSeed(data.roomSeeds, modal.type)} onDone={() => setModal(null)} />
        )}
      </Modal>
    </>
  );
}

function groupByMonth(txns: Contribution[]): [string, Contribution[]][] {
  const map = new Map<string, Contribution[]>();
  for (const t of txns) {
    const k = monthKey(t.contributedOn);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.entries()];
}
