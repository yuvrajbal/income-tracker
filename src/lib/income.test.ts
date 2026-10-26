import { describe, expect, it } from "vitest";
import { monthlyBySource, rangeMonths, totalsBySource } from "./income";
import { parseDollarsToCents } from "./money";
import type { IncomeEntry } from "./types";

const e = (sourceId: string, amountCents: number, receivedOn: string): IncomeEntry => ({
  id: `${sourceId}-${receivedOn}`,
  sourceId,
  amountCents,
  receivedOn,
  note: "",
  createdAt: "",
});

describe("rangeMonths", () => {
  it("handles fixed windows across a year boundary", () => {
    expect(rangeMonths("3M", "2026-02-10", [])).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
  it("YTD starts in January", () => {
    expect(rangeMonths("YTD", "2026-03-01", [])).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
  it("ALL starts at the earliest entry, or this month when empty", () => {
    expect(rangeMonths("ALL", "2026-10-26", [])).toEqual(["2026-10"]);
    expect(rangeMonths("ALL", "2026-10-26", ["2026-08-15"])).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });
});

describe("monthlyBySource", () => {
  it("sums per source per month and keeps empty months", () => {
    const rows = monthlyBySource(
      [e("swe", 150000, "2026-09-15"), e("swe", 150000, "2026-09-30"), e("side", 40000, "2026-10-03")],
      ["2026-08", "2026-09", "2026-10"],
      ["swe", "side"],
    );
    expect(rows).toEqual([
      { month: "2026-08", total: 0, swe: 0, side: 0 },
      { month: "2026-09", total: 300000, swe: 300000, side: 0 },
      { month: "2026-10", total: 40000, swe: 0, side: 40000 },
    ]);
  });
});

describe("totalsBySource", () => {
  it("ignores entries outside the range", () => {
    const t = totalsBySource([e("a", 100, "2026-01-01"), e("a", 200, "2026-02-01")], ["2026-02"]);
    expect(t.get("a")).toBe(200);
  });
});

describe("parseDollarsToCents", () => {
  it("accepts common formats", () => {
    expect(parseDollarsToCents("1,500")).toBe(150000);
    expect(parseDollarsToCents("$1500.5")).toBe(150050);
  });
  it("rejects junk and non-positive values", () => {
    expect(parseDollarsToCents("abc")).toBeNull();
    expect(parseDollarsToCents("0")).toBeNull();
    expect(parseDollarsToCents("1.234")).toBeNull();
  });
});
