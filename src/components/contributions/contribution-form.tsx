"use client";

import { AlertTriangle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, Segmented, Select } from "@/components/ui";
import { shortTypeLabel } from "@/lib/accounts";
import { todayISO } from "@/lib/dates";
import { centsToInput, formatCents, parseDollarsToCents } from "@/lib/money";
import { availableRoom, inFirst60Days, latestSeed, roomTypeOf, RRSP_BUFFER } from "@/lib/room";
import { addContribution, deleteContribution, updateContribution } from "@/lib/store";
import type { AppData, Contribution, ContributionKind } from "@/lib/types";

export function ContributionForm({
  data,
  contribution,
  onDone,
}: {
  data: AppData;
  contribution?: Contribution;
  onDone: () => void;
}) {
  const accounts = data.accounts.filter((a) => !a.archived || a.id === contribution?.accountId);
  const [accountId, setAccountId] = useState(contribution?.accountId ?? accounts[0]?.id ?? "");
  const [kind, setKind] = useState<ContributionKind>(contribution?.kind ?? "contribution");
  const [amount, setAmount] = useState(contribution ? centsToInput(contribution.amountCents) : "");
  const [date, setDate] = useState(contribution?.contributedOn ?? todayISO());
  const [taxYearChoice, setTaxYearChoice] = useState<number | null>(contribution?.taxYear ?? null);
  const [note, setNote] = useState(contribution?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const account = accounts.find((a) => a.id === accountId);
  const roomType = account ? roomTypeOf(account.type) : null;
  const year = Number(date.slice(0, 4));
  const canPickTaxYear = roomType === "rrsp" && kind === "contribution" && !!date && inFirst60Days(date);
  const taxYear = roomType === "rrsp" ? (canPickTaxYear && taxYearChoice !== null ? taxYearChoice : year) : null;
  const amountCents = parseDollarsToCents(amount);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!account) return setError("Add an account on the Net worth page first");
    if (amountCents === null) return setError("Enter an amount greater than 0");
    if (!date) return setError("Pick a date");
    const input = { accountId, kind, amountCents, contributedOn: date, taxYear, note: note.trim() };
    if (contribution) updateContribution(contribution.id, input);
    else addContribution(input);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Segmented
        label="Type"
        value={kind}
        onChange={setKind}
        options={[
          { value: "contribution", label: "Contribution" },
          { value: "withdrawal", label: "Withdrawal" },
        ]}
      />
      <Field label="Amount (CAD)">
        <Input inputMode="decimal" placeholder="1,000" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-medium tabular" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={kind === "contribution" ? "Into account" : "From account"}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.name !== shortTypeLabel(a.type) ? ` (${shortTypeLabel(a.type)})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {canPickTaxYear && (
        <Field label="Apply to tax year">
          <Select value={taxYear ?? year} onChange={(e) => setTaxYearChoice(Number(e.target.value))}>
            <option value={year - 1}>{year - 1} (first 60 days of {year})</option>
            <option value={year}>{year}</option>
          </Select>
        </Field>
      )}
      <Field label="Note (optional)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {roomType && <RoomPreview data={data} draft={{ accountId, kind, amountCents: amountCents ?? 0, contributedOn: date, taxYear }} editingId={contribution?.id} />}

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        {contribution && (
          <Button type="button" variant="danger" onClick={() => (deleteContribution(contribution.id), onDone())}>
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {contribution ? "Save" : kind === "contribution" ? "Add contribution" : "Add withdrawal"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Live "room after this" line, with an over-contribution warning. */
function RoomPreview({
  data,
  draft,
  editingId,
}: {
  data: AppData;
  draft: Pick<Contribution, "accountId" | "kind" | "amountCents" | "contributedOn" | "taxYear">;
  editingId?: string;
}) {
  const account = data.accounts.find((a) => a.id === draft.accountId)!;
  const type = roomTypeOf(account.type)!;
  const label = shortTypeLabel(account.type);
  const seed = latestSeed(data.roomSeeds, type);
  const others = data.contributions.filter((c) => c.id !== editingId);
  const today = todayISO();
  const asOf = draft.contributedOn > today ? draft.contributedOn : today;

  if (!seed) {
    return <Note>Set your {label} room on the Contributions page to see how much room this leaves.</Note>;
  }
  if (type === "rrsp" && draft.taxYear !== seed.year) {
    return <Note>Enter your {draft.taxYear} RRSP deduction limit to check room for this contribution.</Note>;
  }
  if (draft.kind === "withdrawal") {
    if (type === "tfsa") {
      return <Note>TFSA withdrawals are added back to your room on January 1, {Number(draft.contributedOn.slice(0, 4)) + 1}.</Note>;
    }
    if (type === "fhsa") return <Note>FHSA withdrawals don&apos;t restore contribution room.</Note>;
    return <Note>RRSP withdrawals don&apos;t restore contribution room and are taxed as income.</Note>;
  }

  const draftTxn: Contribution = { ...draft, id: "draft", note: "", createdAt: "" };
  const before = availableRoom(type, data.roomSeeds, data.accounts, others, asOf) ?? 0;
  const after = availableRoom(type, data.roomSeeds, data.accounts, [...others, draftTxn], asOf) ?? 0;
  const over = after < 0;
  const withinRrspBuffer = type === "rrsp" && over && after >= -RRSP_BUFFER;

  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${over ? "border border-danger/40 bg-danger/10" : "bg-surface-2"}`}>
      <div className="flex justify-between gap-3 text-text-2">
        <span>{label} room available</span>
        <span className="tabular">{formatCents(before)}</span>
      </div>
      <div className="flex justify-between gap-3 font-medium">
        <span>After this contribution</span>
        <span className="tabular">{formatCents(after)}</span>
      </div>
      {over && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          {withinRrspBuffer
            ? `Over your RRSP limit by ${formatCents(-after)}, within the $2,000 lifetime buffer (no penalty, but not deductible).`
            : `Over-contribution of ${formatCents(type === "rrsp" ? -after - RRSP_BUFFER : -after)}. CRA charges 1% per month on the excess.`}
        </p>
      )}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-2">{children}</p>;
}
