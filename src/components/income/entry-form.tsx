"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { centsToInput, parseDollarsToCents } from "@/lib/money";
import { addEntry, addSource, deleteEntry, updateEntry } from "@/lib/store";
import type { AppData, IncomeEntry } from "@/lib/types";

const NEW_SOURCE = "__new__";

export function IncomeEntryForm({
  data,
  entry,
  onDone,
}: {
  data: AppData;
  entry?: IncomeEntry;
  onDone: () => void;
}) {
  const activeSources = data.incomeSources.filter((s) => !s.archived || s.id === entry?.sourceId);
  const [amount, setAmount] = useState(entry ? centsToInput(entry.amountCents) : "");
  const [sourceId, setSourceId] = useState(entry?.sourceId ?? activeSources[0]?.id ?? NEW_SOURCE);
  const [newSourceName, setNewSourceName] = useState("");
  const [date, setDate] = useState(entry?.receivedOn ?? todayISO());
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const amountCents = parseDollarsToCents(amount);
    if (amountCents === null) return setError("Enter an amount greater than 0, e.g. 1500 or 1,500.50");
    if (!date) return setError("Pick the date the money landed");
    let sid = sourceId;
    if (sid === NEW_SOURCE) {
      if (!newSourceName.trim()) return setError("Name the new source");
      sid = addSource(newSourceName).id;
    }
    const input = { sourceId: sid, amountCents, receivedOn: date, note: note.trim() };
    if (entry) updateEntry(entry.id, input);
    else addEntry(input);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Amount received (CAD)">
        <Input
          inputMode="decimal"
          placeholder="1,500.00"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-lg font-medium tabular"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Source">
          <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {activeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_SOURCE}>+ New source…</option>
          </Select>
        </Field>
        <Field label="Date received">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {sourceId === NEW_SOURCE && (
        <Field label="New source name">
          <Input placeholder="e.g. Teaching assistant" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} />
        </Field>
      )}
      <Field label="Note (optional)">
        <Input placeholder="e.g. October paycheque" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        {entry && (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              deleteEntry(entry.id);
              onDone();
            }}
          >
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {entry ? "Save" : "Add income"}
          </Button>
        </div>
      </div>
    </form>
  );
}
