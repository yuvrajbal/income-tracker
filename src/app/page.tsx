"use client";

import { ArrowRight, PiggyBank, Plus, RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { StackedMonthlyChart } from "@/components/charts/stacked-monthly-chart";
import { ContributionForm } from "@/components/contributions/contribution-form";
import { IncomeEntryForm } from "@/components/income/entry-form";
import { UpdateValuesForm } from "@/components/networth/account-forms";
import { SampleBanner } from "@/components/sample-banner";
import { Button, Card, CardHeader, Delta, Modal, StatTile } from "@/components/ui";
import { sumKind } from "@/lib/contributions";
import { addMonths, formatMonthLong, monthKey, todayISO } from "@/lib/dates";
import { monthlyBySource, rangeMonths, sumCents } from "@/lib/income";
import { formatCents } from "@/lib/money";
import { lastDayOfMonth, netWorthAt, netWorthByMonth, trackedMonths } from "@/lib/networth";
import { availableRoom } from "@/lib/room";
import { useAppData } from "@/lib/store";

type QuickAdd = "choose" | "income" | "contribution" | "values" | null;

export default function DashboardPage() {
  const data = useAppData();
  const [modal, setModal] = useState<QuickAdd>(null);
  if (!data) return null;

  const today = todayISO();
  const thisMonth = monthKey(today);
  const year = today.slice(0, 4);
  const monthTotal = sumCents(data.incomeEntries, (e) => monthKey(e.receivedOn) === thisMonth);
  const ytd = sumCents(data.incomeEntries, (e) => e.receivedOn.startsWith(year));
  const sources = data.incomeSources.filter((s) => !s.archived);
  const incomeRows = monthlyBySource(data.incomeEntries, rangeMonths("6M", today, []), sources.map((s) => s.id));

  const netWorth = netWorthAt(data.accounts, data.accountValues, today);
  const lastMonthNW = netWorthAt(data.accounts, data.accountValues, lastDayOfMonth(addMonths(thisMonth, -1)));
  const nwMonths = trackedMonths(data.accountValues, today);
  const nwRows = netWorthByMonth(data.accounts, data.accountValues, nwMonths, today);
  const contributedYtd = sumKind(data.contributions, "contribution", (t) => t.contributedOn.startsWith(year));
  const tfsaRoom = availableRoom("tfsa", data.roomSeeds, data.accounts, data.contributions, today);
  const fhsaRoom = availableRoom("fhsa", data.roomSeeds, data.accounts, data.contributions, today);
  const roomHint = [tfsaRoom !== null && `TFSA room ${formatCents(tfsaRoom, { whole: true })}`, fhsaRoom !== null && `FHSA ${formatCents(fhsaRoom, { whole: true })}`]
    .filter(Boolean)
    .join(" · ");
  const openAccounts = data.accounts.filter((a) => !a.archived);

  const titles: Record<Exclude<QuickAdd, null>, string> = {
    choose: "Add",
    income: "Add income",
    contribution: "Add contribution",
    values: "Update account values",
  };

  return (
    <>
      {data.isSample && <SampleBanner />}
      <PageHeader
        title="Dashboard"
        subtitle={formatMonthLong(thisMonth)}
        action={
          <Button variant="primary" onClick={() => setModal("choose")}>
            <Plus size={16} /> Add
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Income this month" value={formatCents(monthTotal, { whole: true })} />
        <StatTile label={`Income ${year} YTD`} value={formatCents(ytd, { whole: true })} />
        <StatTile
          label="Net worth"
          value={formatCents(netWorth, { whole: true })}
          hint={nwMonths.length > 1 ? <>This month <Delta cents={netWorth - lastMonthNW} /></> : undefined}
        />
        <StatTile label={`Contributed ${year}`} value={formatCents(contributedYtd, { whole: true })} hint={roomHint || undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Income, last 6 months" action={<DetailsLink href="/income" />} />
          <div className="px-3 pb-3">
            <StackedMonthlyChart rows={incomeRows} series={sources} emptyLabel="No income" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Net worth" action={<DetailsLink href="/net-worth" />} />
          <div className="px-3 pb-3">
            {data.accounts.length ? (
              <NetWorthChart rows={nwRows} accounts={data.accounts} byAccount={false} />
            ) : (
              <p className="px-2 pb-2 text-sm text-text-3">Add accounts on the Net worth page to start tracking.</p>
            )}
          </div>
        </Card>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal ? titles[modal] : ""}>
        {modal === "choose" && (
          <div className="grid gap-2">
            <Choice icon={<Wallet size={18} />} title="Income" desc="A paycheque or payment landed" onClick={() => setModal("income")} />
            <Choice
              icon={<PiggyBank size={18} />}
              title="Contribution"
              desc="Money into or out of an account"
              disabled={openAccounts.length === 0}
              onClick={() => setModal("contribution")}
            />
            <Choice
              icon={<RefreshCw size={18} />}
              title="Account values"
              desc="Update what your accounts are worth"
              disabled={openAccounts.length === 0}
              onClick={() => setModal("values")}
            />
          </div>
        )}
        {modal === "income" && <IncomeEntryForm data={data} onDone={() => setModal(null)} />}
        {modal === "contribution" && <ContributionForm data={data} onDone={() => setModal(null)} />}
        {modal === "values" && <UpdateValuesForm data={data} accounts={openAccounts} onDone={() => setModal(null)} />}
      </Modal>
    </>
  );
}

function DetailsLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-xs text-text-2 hover:text-text">
      Details <ArrowRight size={13} />
    </Link>
  );
}

function Choice({ icon, title, desc, onClick, disabled }: { icon: ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left hover:bg-surface-2 disabled:opacity-50"
    >
      <span className="text-text-2">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-text-3">{disabled ? "Add an account on the Net worth page first" : desc}</span>
      </span>
    </button>
  );
}
