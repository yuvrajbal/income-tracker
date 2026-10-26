// Shapes mirror the planned Postgres tables (see PLAN.md). Money is integer cents,
// dates are local calendar dates as "YYYY-MM-DD".

export type ID = string;

/** Anything drawn as a chart series. */
export interface Series {
  id: ID;
  name: string;
  /** Index into the categorical palette (1-8). Stored as a slot, not a hex, so dark mode can re-step it. */
  colorSlot: number;
}

export interface IncomeSource extends Series {
  archived: boolean;
  createdAt: string;
}

export interface IncomeEntry {
  id: ID;
  sourceId: ID;
  amountCents: number;
  receivedOn: string;
  note: string;
  createdAt: string;
}

export type AccountType = "tfsa" | "fhsa" | "rrsp" | "cash" | "brokerage" | "other";

export interface Account extends Series {
  type: AccountType;
  archived: boolean;
  createdAt: string;
}

/** Append-only history of what an account was worth on a given date. */
export interface AccountValue {
  id: ID;
  accountId: ID;
  valueCents: number;
  asOf: string;
  createdAt: string;
}

export type ContributionKind = "contribution" | "withdrawal";

export interface Contribution {
  id: ID;
  accountId: ID;
  kind: ContributionKind;
  /** Always positive; `kind` gives the direction. */
  amountCents: number;
  contributedOn: string;
  /** RRSP only: the tax year the contribution is applied to (first-60-days rule). */
  taxYear: number | null;
  note: string;
  createdAt: string;
}

export type RoomType = "tfsa" | "fhsa" | "rrsp";

/** A number copied from CRA My Account / Notice of Assessment that room tracking starts from. */
export interface RoomSeed {
  id: ID;
  roomType: RoomType;
  /** TFSA/FHSA: year of `asOf`. RRSP: the tax year the NOA deduction limit applies to. */
  year: number;
  /** Contributions dated on/after this are subtracted from the seed. */
  asOf: string;
  roomCents: number;
  /** FHSA only: lifetime contributions made before `asOf`. */
  lifetimeContributedCents: number | null;
  createdAt: string;
}

export interface AppData {
  version: 1;
  /** True while the app is showing generated demo data. */
  isSample: boolean;
  incomeSources: IncomeSource[];
  incomeEntries: IncomeEntry[];
  accounts: Account[];
  accountValues: AccountValue[];
  contributions: Contribution[];
  roomSeeds: RoomSeed[];
}
