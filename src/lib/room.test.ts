import { describe, expect, it } from "vitest";
import { fhsaRoom, inFirst60Days, rrspRoom, tfsaRoom } from "./room";
import type { Account, Contribution, RoomSeed } from "./types";

const acct = (id: string, type: Account["type"]): Account => ({ id, name: id, type, colorSlot: 1, archived: false, createdAt: "" });
const accounts = [acct("t1", "tfsa"), acct("t2", "tfsa"), acct("f", "fhsa"), acct("r", "rrsp"), acct("b", "brokerage")];

let n = 0;
const tx = (accountId: string, dollars: number, on: string, kind: Contribution["kind"] = "contribution", taxYear: number | null = null): Contribution => ({
  id: String(n++),
  accountId,
  kind,
  amountCents: dollars * 100,
  contributedOn: on,
  taxYear,
  note: "",
  createdAt: "",
});
const seed = (roomType: RoomSeed["roomType"], dollars: number, asOf: string, extra: Partial<RoomSeed> = {}): RoomSeed => ({
  id: "s",
  roomType,
  year: Number(asOf.slice(0, 4)),
  asOf,
  roomCents: dollars * 100,
  lifetimeContributedCents: null,
  createdAt: "",
  ...extra,
});

describe("tfsaRoom", () => {
  it("subtracts contributions across all TFSA accounts, ignoring other account types", () => {
    const r = tfsaRoom(seed("tfsa", 20000, "2026-01-01"), accounts, [tx("t1", 1000, "2026-03-01"), tx("t2", 500, "2026-04-01"), tx("b", 9999, "2026-04-01")], "2026-10-26");
    expect(r.available).toBe(1850000);
    expect(r.contributedThisYear).toBe(150000);
  });

  it("ignores contributions before the seed date", () => {
    const r = tfsaRoom(seed("tfsa", 5000, "2026-06-01"), accounts, [tx("t1", 1000, "2026-05-31")], "2026-10-26");
    expect(r.available).toBe(500000);
  });

  it("restores withdrawals and adds the new limit on Jan 1, not before", () => {
    const txns = [tx("t1", 3000, "2026-02-01"), tx("t1", 2000, "2026-08-01", "withdrawal")];
    const sameYear = tfsaRoom(seed("tfsa", 10000, "2026-01-01"), accounts, txns, "2026-12-31");
    expect(sameYear.available).toBe(700000);
    expect(sameYear.pendingRestore).toBe(200000);

    // 2027 limit isn't in the table yet: falls back to the latest known limit and flags it.
    const nextYear = tfsaRoom(seed("tfsa", 10000, "2026-01-01"), accounts, txns, "2027-01-01");
    expect(nextYear.available).toBe(700000 + 700000 + 200000);
    expect(nextYear.limitEstimated).toBe(true);
    expect(nextYear.pendingRestore).toBe(0);
  });
});

describe("fhsaRoom", () => {
  it("carries forward unused room capped at $8,000", () => {
    // 2026: $8,000 room, contribute $3,000 -> $5,000 unused carries to 2027 -> $13,000.
    const r = fhsaRoom(seed("fhsa", 8000, "2026-01-01", { lifetimeContributedCents: 0 }), accounts, [tx("f", 3000, "2026-05-01")], "2027-02-01");
    expect(r.available).toBe(1300000);
    expect(r.lifetimeContributed).toBe(300000);
  });

  it("caps carry-forward at $8,000 even if more was unused", () => {
    const r = fhsaRoom(seed("fhsa", 16000, "2026-01-01", { lifetimeContributedCents: 0 }), accounts, [], "2027-01-01");
    expect(r.available).toBe(1600000);
  });

  it("never exceeds the $40,000 lifetime limit", () => {
    const r = fhsaRoom(seed("fhsa", 8000, "2026-01-01", { lifetimeContributedCents: 3000000 }), accounts, [tx("f", 8000, "2026-01-10")], "2027-01-01");
    expect(r.lifetimeContributed).toBe(3800000);
    expect(r.available).toBe(200000);
  });

  it("does not restore room on withdrawal", () => {
    const r = fhsaRoom(seed("fhsa", 8000, "2026-01-01", { lifetimeContributedCents: 0 }), accounts, [tx("f", 8000, "2026-01-10"), tx("f", 8000, "2026-05-10", "withdrawal")], "2026-10-01");
    expect(r.available).toBe(0);
  });
});

describe("rrspRoom", () => {
  it("counts contributions by tax year, including first-60-days ones assigned to the prior year", () => {
    const txns = [tx("r", 5000, "2026-04-01"), tx("r", 2000, "2027-02-10", "contribution", 2026), tx("r", 1000, "2027-02-11", "contribution", 2027)];
    const r = rrspRoom(seed("rrsp", 20000, "2026-01-01"), accounts, txns, "2027-02-20");
    expect(r.contributed).toBe(700000);
    expect(r.available).toBe(1300000);
  });
});

describe("inFirst60Days", () => {
  it("handles leap and non-leap years", () => {
    expect(inFirst60Days("2026-03-01")).toBe(true); // day 60
    expect(inFirst60Days("2026-03-02")).toBe(false);
    expect(inFirst60Days("2028-02-29")).toBe(true); // day 60 in a leap year
    expect(inFirst60Days("2028-03-01")).toBe(false);
  });
});
