"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { SeriesLegend } from "@/components/charts/legend";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { AddAccountForm, EditAccountForm, UpdateValuesForm } from "@/components/networth/account-forms";
import { SampleBanner } from "@/components/sample-banner";
import { Button, Card, CardHeader, Delta, Modal, Segmented, SeriesSwatch, StatTile } from "@/components/ui";
import { shortTypeLabel } from "@/lib/accounts";
import { addMonths, formatDay, monthKey, todayISO } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { accountGrowth, firstValue, lastDayOfMonth, latestValue, netWorthAt, netWorthByMonth, trackedMonths } from "@/lib/networth";
import { useAppData } from "@/lib/store";
import { useChartColors } from "@/lib/theme";
import type { Account, AppData } from "@/lib/types";

type ModalState = { kind: "add" } | { kind: "update"; accounts: Account[] } | { kind: "edit"; account: Account } | null;

export default function NetWorthPage() {
  const data = useAppData();
  if (!data) return null;
  return <NetWorth data={data} />;
}

function NetWorth({ data }: { data: AppData }) {
  const c = useChartColors();
  const [modal, setModal] = useState<ModalState>(null);
  const [view, setView] = useState<"total" | "accounts">("total");
  const today = todayISO();

  const open = data.accounts.filter((a) => !a.archived);
  const closed = data.accounts.filter((a) => a.archived);
  const months = trackedMonths(data.accountValues, today);
  // Closed accounts still appear in history (their value drops to $0 when closed).
  const rows = netWorthByMonth(data.accounts, data.accountValues, months, today);
  const chartAccounts = data.accounts.filter((a) => rows.some((r) => r[a.id] !== 0));

  const now = netWorthAt(data.accounts, data.accountValues, today);
  const endOfLastMonth = lastDayOfMonth(addMonths(monthKey(today), -1));
  const lastMonth = netWorthAt(data.accounts, data.accountValues, endOfLastMonth);
  const hasLastMonth = months[0] < monthKey(today);
  const firstDate = data.accountValues.reduce<string | null>((min, v) => (!min || v.asOf < min ? v.asOf : min), null);
  const start = firstDate ? netWorthAt(data.accounts, data.accountValues, firstDate) : 0;

  const modalTitle = {
    add: "Add account",
    update: modal?.kind === "update" && modal.accounts.length === 1 ? `Update ${modal.accounts[0].name}` : "Update values",
    edit: "Edit account",
  };

  return (
    <>
      {data.isSample && <SampleBanner />}
      <PageHeader
        title="Net worth"
        subtitle="Sum of your accounts' latest values"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setModal({ kind: "add" })}>
              <Plus size={16} /> Account
            </Button>
            {open.length > 0 && (
              <Button variant="primary" onClick={() => setModal({ kind: "update", accounts: open })}>
                <RefreshCw size={15} /> Update values
              </Button>
            )}
          </div>
        }
      />

      {data.accounts.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <p className="text-sm font-medium">Add your first account</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-2">
            e.g. TFSA $50,000 and FHSA $20,000. Update values whenever you like; each month uses the latest value you entered.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => setModal({ kind: "add" })}>
            <Plus size={16} /> Add account
          </Button>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Net worth" value={formatCents(now, { whole: true })} hint={`${open.length} account${open.length === 1 ? "" : "s"}`} />
            <StatTile
              label="This month"
              value={hasLastMonth ? <Delta cents={now - lastMonth} /> : <span className="text-text-3">—</span>}
              hint={hasLastMonth ? `vs ${formatCents(lastMonth, { whole: true })} at end of last month` : "Tracking started this month"}
            />
            <StatTile
              label="Since tracking began"
              value={<Delta cents={now - start} />}
              hint={firstDate ? `from ${formatCents(start, { whole: true })} on ${formatDay(firstDate)}` : undefined}
            />
          </div>

          <Card>
            <CardHeader
              title="Net worth by month"
              subtitle="Months without an update carry the previous value forward"
              action={
                <Segmented
                  label="Chart view"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "total", label: "Total" },
                    { value: "accounts", label: "By account" },
                  ]}
                />
              }
            />
            {view === "accounts" && (
              <div className="px-5">
                <SeriesLegend series={chartAccounts} />
              </div>
            )}
            <div className="px-3 pb-3">
              <NetWorthChart rows={rows} accounts={chartAccounts} byAccount={view === "accounts"} />
            </div>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((a) => {
              const current = latestValue(data.accountValues, a.id, today);
              const growth = accountGrowth(data.accountValues, data.contributions, a.id, today);
              const first = firstValue(data.accountValues, a.id);
              const changed = growth && first && current && first.id !== current.id;
              return (
                <Card key={a.id} className="flex flex-col">
                  <button className="flex-1 px-4 pt-3.5 pb-2 text-left" onClick={() => setModal({ kind: "edit", account: a })}>
                    <div className="flex items-center gap-2">
                      <SeriesSwatch color={c.series(a.colorSlot)} />
                      <span className="flex-1 truncate text-sm font-medium">{a.name}</span>
                      {a.name !== shortTypeLabel(a.type) && (
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-2">{shortTypeLabel(a.type)}</span>
                      )}
                    </div>
                    <div className="mt-2 text-xl font-semibold tabular tracking-tight">{formatCents(current?.valueCents ?? 0, { whole: true })}</div>
                    <div className="text-xs text-text-3">{current ? `Updated ${formatDay(current.asOf)}` : "No value yet"}</div>
                    {changed && (
                      <dl className="mt-3 space-y-0.5 border-t border-border pt-2 text-xs">
                        <Row label={`Change since ${formatDay(growth.startDate)}`} value={<Delta cents={growth.currentValue - growth.startValue} />} />
                        {/* Cash accounts move with spending and paycheques, so a market split means nothing there. */}
                        {a.type !== "cash" && (
                          <>
                            <Row label="Your contributions" value={formatCents(growth.netContributed, { whole: true })} />
                            <Row label="Market / interest" value={<Delta cents={growth.growth} />} />
                          </>
                        )}
                      </dl>
                    )}
                  </button>
                  <div className="border-t border-border px-2 py-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "update", accounts: [a] })}>
                      <RefreshCw size={13} /> Update value
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {closed.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-xs font-medium text-text-3">Closed accounts</h2>
              <div className="flex flex-wrap gap-2">
                {closed.map((a) => (
                  <Button key={a.id} size="sm" onClick={() => setModal({ kind: "edit", account: a })}>
                    {a.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal ? modalTitle[modal.kind] : ""}>
        {modal?.kind === "add" && <AddAccountForm onDone={() => setModal(null)} />}
        {modal?.kind === "update" && <UpdateValuesForm data={data} accounts={modal.accounts} onDone={() => setModal(null)} />}
        {modal?.kind === "edit" && <EditAccountForm key={modal.account.id} data={data} account={modal.account} onDone={() => setModal(null)} />}
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-text-3">{label}</dt>
      <dd className="tabular text-text-2">{value}</dd>
    </div>
  );
}
