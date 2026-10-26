// Contribution room for TFSA, FHSA and RRSP, tracked forward from a number the user copies
// from CRA. These are estimates; CRA is the source of truth. Rules are summarized in PLAN.md.
//
// UPDATE YEARLY: add the new TFSA limit when CRA announces it (usually November).

import type { Account, Contribution, RoomSeed, RoomType } from "./types";

/** TFSA annual dollar limit by year, in cents. */
export const TFSA_LIMITS: Record<number, number> = {
  2009: 500000, 2010: 500000, 2011: 500000, 2012: 500000,
  2013: 550000, 2014: 550000,
  2015: 1000000,
  2016: 550000, 2017: 550000, 2018: 550000,
  2019: 600000, 2020: 600000, 2021: 600000, 2022: 600000,
  2023: 650000,
  2024: 700000, 2025: 700000, 2026: 700000,
};

export const FHSA_ANNUAL = 800000;
export const FHSA_CARRY_FORWARD_MAX = 800000;
export const FHSA_LIFETIME = 4000000;
/** RRSP over-contribution allowed before the 1%/month penalty applies. */
export const RRSP_BUFFER = 200000;

const LATEST_TFSA_YEAR = Math.max(...Object.keys(TFSA_LIMITS).map(Number));

export function tfsaLimit(year: number): { cents: number; estimated: boolean } {
  if (TFSA_LIMITS[year] !== undefined) return { cents: TFSA_LIMITS[year], estimated: false };
  return { cents: TFSA_LIMITS[LATEST_TFSA_YEAR], estimated: true };
}

const yearOf = (iso: string) => Number(iso.slice(0, 4));

/** Contributions/withdrawals into accounts of a room type, on or after `from`, up to `today`. */
function txnsFor(type: RoomType, accounts: Account[], txns: Contribution[], from: string, today: string) {
  const ids = new Set(accounts.filter((a) => a.type === type).map((a) => a.id));
  return txns.filter((t) => ids.has(t.accountId) && t.contributedOn >= from && t.contributedOn <= today);
}

function sum(txns: Contribution[], kind: Contribution["kind"], pred: (t: Contribution) => boolean = () => true) {
  return txns.reduce((s, t) => (t.kind === kind && pred(t) ? s + t.amountCents : s), 0);
}

export function latestSeed(seeds: RoomSeed[], type: RoomType): RoomSeed | null {
  return (
    seeds
      .filter((s) => s.roomType === type)
      .sort((a, b) => b.year - a.year || b.asOf.localeCompare(a.asOf) || b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

// ---------- TFSA ----------

export interface TfsaRoom {
  available: number;
  contributedThisYear: number;
  /** Withdrawn this year; added back to room next Jan 1. */
  pendingRestore: number;
  /** Room added on Jan 1 of this year (0 if seeded this year). */
  limitThisYear: number;
  limitEstimated: boolean;
}

export function tfsaRoom(seed: RoomSeed, accounts: Account[], txns: Contribution[], today: string): TfsaRoom {
  const all = txnsFor("tfsa", accounts, txns, seed.asOf, today);
  const startYear = yearOf(seed.asOf);
  const thisYear = yearOf(today);
  let room = seed.roomCents;
  let limitEstimated = false;
  for (let y = startYear; y <= thisYear; y++) {
    if (y > startYear) {
      const limit = tfsaLimit(y);
      limitEstimated ||= limit.estimated;
      room += limit.cents + sum(all, "withdrawal", (t) => yearOf(t.contributedOn) === y - 1);
    }
    room -= sum(all, "contribution", (t) => yearOf(t.contributedOn) === y);
  }
  return {
    available: room,
    contributedThisYear: sum(all, "contribution", (t) => yearOf(t.contributedOn) === thisYear),
    pendingRestore: sum(all, "withdrawal", (t) => yearOf(t.contributedOn) === thisYear),
    limitThisYear: thisYear > startYear ? tfsaLimit(thisYear).cents : 0,
    limitEstimated,
  };
}

// ---------- FHSA ----------

export interface FhsaRoom {
  available: number;
  contributedThisYear: number;
  lifetimeContributed: number;
  lifetimeRemaining: number;
}

/**
 * Participation room: $8,000/year plus up to $8,000 of last year's unused room,
 * never more than what's left of the $40,000 lifetime limit. Withdrawals don't restore room.
 */
export function fhsaRoom(seed: RoomSeed, accounts: Account[], txns: Contribution[], today: string): FhsaRoom {
  const all = txnsFor("fhsa", accounts, txns, seed.asOf, today);
  const startYear = yearOf(seed.asOf);
  const thisYear = yearOf(today);
  let lifetime = seed.lifetimeContributedCents ?? 0;
  let room = seed.roomCents;
  for (let y = startYear; y <= thisYear; y++) {
    if (y > startYear) {
      const carry = Math.min(room, FHSA_CARRY_FORWARD_MAX);
      room = Math.min(FHSA_ANNUAL + carry, FHSA_LIFETIME - lifetime);
    }
    const contributed = sum(all, "contribution", (t) => yearOf(t.contributedOn) === y);
    room -= contributed;
    lifetime += contributed;
  }
  return {
    available: room,
    contributedThisYear: sum(all, "contribution", (t) => yearOf(t.contributedOn) === thisYear),
    lifetimeContributed: lifetime,
    lifetimeRemaining: FHSA_LIFETIME - lifetime,
  };
}

// ---------- RRSP ----------

export interface RrspRoom {
  taxYear: number;
  limit: number;
  contributed: number;
  available: number;
}

/** Room for the seed's tax year: NOA deduction limit minus contributions assigned to that year. */
export function rrspRoom(seed: RoomSeed, accounts: Account[], txns: Contribution[], today: string): RrspRoom {
  const all = txnsFor("rrsp", accounts, txns, seed.asOf, today);
  const contributed = sum(all, "contribution", (t) => rrspTaxYear(t) === seed.year);
  return { taxYear: seed.year, limit: seed.roomCents, contributed, available: seed.roomCents - contributed };
}

export function rrspTaxYear(t: Pick<Contribution, "taxYear" | "contributedOn">): number {
  return t.taxYear ?? yearOf(t.contributedOn);
}

/** Contributions in the first 60 days of a year can be applied to the previous tax year. */
export function inFirst60Days(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
  return dayOfYear <= 60;
}

// ---------- Common ----------

export function roomTypeOf(accountType: Account["type"]): RoomType | null {
  return accountType === "tfsa" || accountType === "fhsa" || accountType === "rrsp" ? accountType : null;
}

/** Available room for a type, or null when not seeded. */
export function availableRoom(type: RoomType, seeds: RoomSeed[], accounts: Account[], txns: Contribution[], today: string): number | null {
  const seed = latestSeed(seeds, type);
  if (!seed) return null;
  if (type === "tfsa") return tfsaRoom(seed, accounts, txns, today).available;
  if (type === "fhsa") return fhsaRoom(seed, accounts, txns, today).available;
  return rrspRoom(seed, accounts, txns, today).available;
}
