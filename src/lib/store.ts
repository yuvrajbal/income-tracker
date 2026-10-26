"use client";

// Temporary local data layer: everything lives in localStorage until Supabase is wired up.
// Components only use `useAppData()` and the action functions below, so swapping the
// backend later doesn't touch the UI.

import { useSyncExternalStore } from "react";
import { addMonths, monthKey, todayISO } from "./dates";
import type { Account, AccountType, AccountValue, AppData, Contribution, ID, IncomeEntry, IncomeSource, RoomSeed } from "./types";

const STORAGE_KEY = "income-tracker:data:v1";

let state: AppData | null = null;
const listeners = new Set<() => void>();

function newId(): ID {
  // crypto.randomUUID only exists in secure contexts (https/localhost), not on http://<tailscale-ip>.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function emptyData(): AppData {
  return {
    version: 1,
    isSample: false,
    incomeSources: [],
    incomeEntries: [],
    accounts: [],
    accountValues: [],
    contributions: [],
    roomSeeds: [],
  };
}

function nextColorSlot(used: { colorSlot: number }[]): number {
  const taken = new Set(used.map((u) => u.colorSlot));
  return [1, 2, 3, 4, 5, 6, 7, 8].find((s) => !taken.has(s)) ?? 8;
}

function sampleData(): AppData {
  const createdAt = nowISO();
  const swe: IncomeSource = { id: newId(), name: "Software Engineering", colorSlot: 1, archived: false, createdAt };
  const side: IncomeSource = { id: newId(), name: "Side work", colorSlot: 2, archived: false, createdAt };
  const entries: IncomeEntry[] = [];
  const thisMonth = monthKey(todayISO());
  const today = todayISO();
  const add = (source: IncomeSource, cents: number, date: string, note = "") => {
    if (date <= today) entries.push({ id: newId(), sourceId: source.id, amountCents: cents, receivedOn: date, note, createdAt });
  };
  // Six months of semi-monthly paycheques plus irregular side income (skips some months).
  const sideAmounts = [62000, 0, 118000, 0, 45000, 90000];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(thisMonth, -i);
    add(swe, 245000, `${m}-15`, "Paycheque");
    add(swe, 245000, `${m}-28`, "Paycheque");
    if (sideAmounts[5 - i]) add(side, sideAmounts[5 - i], `${m}-08`);
  }

  // Accounts: monthly value updates, monthly contributions, seeded room.
  const tfsa: Account = { id: newId(), name: "TFSA", type: "tfsa", colorSlot: 1, archived: false, createdAt };
  const fhsa: Account = { id: newId(), name: "FHSA", type: "fhsa", colorSlot: 2, archived: false, createdAt };
  const cash: Account = { id: newId(), name: "Chequing", type: "cash", colorSlot: 3, archived: false, createdAt };
  const values: AccountValue[] = [];
  const contributions: Contribution[] = [];
  const tfsaPath = [44000, 45600, 46100, 48300, 47900, 50200];
  const fhsaPath = [14000, 15100, 16200, 17000, 18400, 20100];
  const cashPath = [6200, 7400, 5900, 8100, 7600, 8800];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(thisMonth, -i);
    const k = 5 - i;
    const valueDate = i === 0 ? today : `${m}-27`;
    for (const [acct, path] of [[tfsa, tfsaPath], [fhsa, fhsaPath], [cash, cashPath]] as const) {
      values.push({ id: newId(), accountId: acct.id, valueCents: path[k] * 100, asOf: valueDate, createdAt });
    }
    const contribDate = `${m}-16`;
    if (contribDate <= today) {
      contributions.push({ id: newId(), accountId: tfsa.id, kind: "contribution", amountCents: 100000, contributedOn: contribDate, taxYear: null, note: "", createdAt });
      if (k % 2 === 0)
        contributions.push({ id: newId(), accountId: fhsa.id, kind: "contribution", amountCents: 150000, contributedOn: contribDate, taxYear: null, note: "", createdAt });
    }
  }
  const year = Number(today.slice(0, 4));
  const roomSeeds: RoomSeed[] = [
    { id: newId(), roomType: "tfsa", year, asOf: `${year}-01-01`, roomCents: 1550000, lifetimeContributedCents: null, createdAt },
    { id: newId(), roomType: "fhsa", year, asOf: `${year}-01-01`, roomCents: 1600000, lifetimeContributedCents: 800000, createdAt },
  ];

  return {
    version: 1,
    isSample: true,
    incomeSources: [swe, side],
    incomeEntries: entries,
    accounts: [tfsa, fhsa, cash],
    accountValues: values,
    contributions,
    roomSeeds,
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Spread over emptyData() so data saved by older versions gains new collections.
    if (raw) return { ...emptyData(), ...(JSON.parse(raw) as Partial<AppData>) };
  } catch {
    // Corrupt or unavailable storage: fall through to sample data.
  }
  return sampleData();
}

function getSnapshot(): AppData {
  if (!state) state = load();
  return state;
}

function getServerSnapshot(): AppData | null {
  return null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function update(fn: (d: AppData) => AppData) {
  state = fn(getSnapshot());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

/** Returns null during server render / before hydration. */
export function useAppData(): AppData | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---- Income sources ----

export function addSource(name: string): IncomeSource {
  const colorSlot = nextColorSlot(getSnapshot().incomeSources);
  const source: IncomeSource = { id: newId(), name: name.trim(), colorSlot, archived: false, createdAt: nowISO() };
  update((d) => ({ ...d, incomeSources: [...d.incomeSources, source] }));
  return source;
}

export function updateSource(id: ID, patch: Partial<Pick<IncomeSource, "name" | "colorSlot" | "archived">>) {
  update((d) => ({
    ...d,
    incomeSources: d.incomeSources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }));
}

/** Only allowed when the source has no entries; otherwise archive it. */
export function deleteSource(id: ID) {
  update((d) => {
    if (d.incomeEntries.some((e) => e.sourceId === id)) return d;
    return { ...d, incomeSources: d.incomeSources.filter((s) => s.id !== id) };
  });
}

// ---- Income entries ----

export type IncomeEntryInput = Pick<IncomeEntry, "sourceId" | "amountCents" | "receivedOn" | "note">;

export function addEntry(input: IncomeEntryInput) {
  const entry: IncomeEntry = { ...input, id: newId(), createdAt: nowISO() };
  update((d) => ({ ...d, incomeEntries: [...d.incomeEntries, entry] }));
}

export function updateEntry(id: ID, input: IncomeEntryInput) {
  update((d) => ({
    ...d,
    incomeEntries: d.incomeEntries.map((e) => (e.id === id ? { ...e, ...input } : e)),
  }));
}

export function deleteEntry(id: ID) {
  update((d) => ({ ...d, incomeEntries: d.incomeEntries.filter((e) => e.id !== id) }));
}

// ---- Accounts & values ----

export function addAccount(input: { name: string; type: AccountType; valueCents: number; asOf: string }): Account {
  const createdAt = nowISO();
  const account: Account = {
    id: newId(),
    name: input.name.trim(),
    type: input.type,
    colorSlot: nextColorSlot(getSnapshot().accounts.filter((a) => !a.archived)),
    archived: false,
    createdAt,
  };
  const value: AccountValue = { id: newId(), accountId: account.id, valueCents: input.valueCents, asOf: input.asOf, createdAt };
  update((d) => ({ ...d, accounts: [...d.accounts, account], accountValues: [...d.accountValues, value] }));
  return account;
}

export function updateAccount(id: ID, patch: Partial<Pick<Account, "name" | "type">>) {
  update((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
}

/** Closing records a $0 value so the account stops counting toward net worth from that date. */
export function closeAccount(id: ID, asOf: string) {
  const value: AccountValue = { id: newId(), accountId: id, valueCents: 0, asOf, createdAt: nowISO() };
  update((d) => ({
    ...d,
    accounts: d.accounts.map((a) => (a.id === id ? { ...a, archived: true } : a)),
    accountValues: [...d.accountValues, value],
  }));
}

export function reopenAccount(id: ID) {
  update((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, archived: false } : a)) }));
}

/** Removes an account and all its history. */
export function deleteAccount(id: ID) {
  update((d) => ({
    ...d,
    accounts: d.accounts.filter((a) => a.id !== id),
    accountValues: d.accountValues.filter((v) => v.accountId !== id),
    contributions: d.contributions.filter((c) => c.accountId !== id),
  }));
}

export function addAccountValues(entries: { accountId: ID; valueCents: number; asOf: string }[]) {
  const createdAt = nowISO();
  const values = entries.map((e) => ({ ...e, id: newId(), createdAt }));
  update((d) => ({ ...d, accountValues: [...d.accountValues, ...values] }));
}

export function deleteAccountValue(id: ID) {
  update((d) => ({ ...d, accountValues: d.accountValues.filter((v) => v.id !== id) }));
}

// ---- Contributions ----

export type ContributionInput = Pick<Contribution, "accountId" | "kind" | "amountCents" | "contributedOn" | "taxYear" | "note">;

export function addContribution(input: ContributionInput) {
  const c: Contribution = { ...input, id: newId(), createdAt: nowISO() };
  update((d) => ({ ...d, contributions: [...d.contributions, c] }));
}

export function updateContribution(id: ID, input: ContributionInput) {
  update((d) => ({ ...d, contributions: d.contributions.map((c) => (c.id === id ? { ...c, ...input } : c)) }));
}

export function deleteContribution(id: ID) {
  update((d) => ({ ...d, contributions: d.contributions.filter((c) => c.id !== id) }));
}

// ---- Contribution room ----

/** Adds a new seed; the newest seed for a type supersedes older ones. Older seeds are kept as history. */
export function addRoomSeed(input: Omit<RoomSeed, "id" | "createdAt">) {
  const seed: RoomSeed = { ...input, id: newId(), createdAt: nowISO() };
  update((d) => ({ ...d, roomSeeds: [...d.roomSeeds, seed] }));
}

// ---- Data management ----

/** Wipes all data and starts fresh, keeping two empty income sources ready to use. */
export function startFresh() {
  const createdAt = nowISO();
  update(() => ({
    ...emptyData(),
    incomeSources: [
      { id: newId(), name: "Software Engineering", colorSlot: 1, archived: false, createdAt },
      { id: newId(), name: "Side work", colorSlot: 2, archived: false, createdAt },
    ],
  }));
}

export function loadSampleData() {
  update(() => sampleData());
}

export function exportJSON(): string {
  return JSON.stringify(getSnapshot(), null, 2);
}
