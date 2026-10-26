"use client";

import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { ACCOUNT_TYPES } from "@/lib/accounts";
import { formatDay, todayISO } from "@/lib/dates";
import { centsToInput, formatCents, parseDollarsToCents } from "@/lib/money";
import { latestValue } from "@/lib/networth";
import {
  addAccount,
  addAccountValues,
  closeAccount,
  deleteAccount,
  deleteAccountValue,
  reopenAccount,
  updateAccount,
} from "@/lib/store";
import type { Account, AccountType, AppData } from "@/lib/types";

/** Like parseDollarsToCents but allows 0 (an empty account is a valid value). */
function parseValue(input: string): number | null {
  if (input.replace(/[$,\s]/g, "") === "0") return 0;
  return parseDollarsToCents(input);
}

export function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("tfsa");
  const [value, setValue] = useState("");
  const [asOf, setAsOf] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const valueCents = parseValue(value);
    if (valueCents === null) return setError("Enter the account's current value, e.g. 50,000");
    const label = ACCOUNT_TYPES.find((t) => t.value === type)!.label;
    addAccount({ name: name.trim() || label, type, valueCents, asOf });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name (optional)">
          <Input placeholder={`e.g. ${type === "tfsa" ? "Wealthsimple TFSA" : "My account"}`} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current value (CAD)">
          <Input inputMode="decimal" placeholder="50,000" value={value} onChange={(e) => setValue(e.target.value)} className="tabular" autoFocus />
        </Field>
        <Field label="As of">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add account
        </Button>
      </div>
    </form>
  );
}

/** Enter new values for one or more accounts at once (e.g. a monthly check-in). */
export function UpdateValuesForm({ data, accounts, onDone }: { data: AppData; accounts: Account[]; onDone: () => void }) {
  const today = todayISO();
  const [asOf, setAsOf] = useState(today);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(accounts.map((a) => [a.id, centsToInput(latestValue(data.accountValues, a.id, today)?.valueCents ?? 0)])),
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const updates = [];
    for (const a of accounts) {
      const cents = parseValue(values[a.id] ?? "");
      if (cents === null) return setError(`Check the value for ${a.name}`);
      const prev = latestValue(data.accountValues, a.id, asOf);
      // Skip unchanged values, unless updating a single account (then record it as a confirmation).
      if (accounts.length > 1 && prev?.valueCents === cents) continue;
      updates.push({ accountId: a.id, valueCents: cents, asOf });
    }
    if (updates.length) addAccountValues(updates);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2.5">
        {accounts.map((a, i) => {
          const prev = latestValue(data.accountValues, a.id, today);
          return (
            <label key={a.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.name}</span>
                <span className="block text-xs text-text-3">
                  {prev ? `${formatCents(prev.valueCents, { whole: true })} on ${formatDay(prev.asOf)}` : "No value yet"}
                </span>
              </span>
              <Input
                inputMode="decimal"
                className="w-36 text-right tabular"
                value={values[a.id] ?? ""}
                autoFocus={i === 0}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
              />
            </label>
          );
        })}
      </div>
      <Field label="Values as of">
        <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}

/** Rename, change type, view/delete value history, close or delete. */
export function EditAccountForm({ data, account, onDone }: { data: AppData; account: Account; onDone: () => void }) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const history = data.accountValues
    .filter((v) => v.accountId === account.id)
    .sort((a, b) => b.asOf.localeCompare(a.asOf) || b.createdAt.localeCompare(a.createdAt));
  const contributionCount = data.contributions.filter((c) => c.accountId === account.id).length;

  function submit(e: FormEvent) {
    e.preventDefault();
    updateAccount(account.id, { name: name.trim() || account.name, type });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-text-2">Value history</div>
        <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {history.map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-3 py-1.5 text-sm">
              <span className="flex-1 text-text-2">{formatDay(v.asOf)}</span>
              <span className="tabular">{formatCents(v.valueCents)}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Delete this value"
                disabled={history.length === 1}
                onClick={() => deleteAccountValue(v.id)}
              >
                <Trash2 size={13} />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {account.archived ? (
          <Button type="button" variant="ghost" onClick={() => (reopenAccount(account.id), onDone())}>
            Reopen
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            title="Sets the value to $0 from today and hides the account; history is kept"
            onClick={() => {
              if (confirm(`Close ${account.name}? Its value becomes $0 from today; history is kept.`)) {
                closeAccount(account.id, todayISO());
                onDone();
              }
            }}
          >
            Close account
          </Button>
        )}
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            const extra = contributionCount ? ` and its ${contributionCount} contribution(s)` : "";
            if (confirm(`Permanently delete ${account.name}, its value history${extra}?`)) {
              deleteAccount(account.id);
              onDone();
            }
          }}
        >
          Delete
        </Button>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
