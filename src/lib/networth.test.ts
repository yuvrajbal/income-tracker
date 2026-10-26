import { describe, expect, it } from "vitest";
import { accountGrowth, lastDayOfMonth, netWorthByMonth } from "./networth";
import type { Account, AccountValue, Contribution } from "./types";

const acct = (id: string): Account => ({ id, name: id, type: "tfsa", colorSlot: 1, archived: false, createdAt: "" });
const val = (accountId: string, dollars: number, asOf: string, createdAt = ""): AccountValue => ({
  id: `${accountId}-${asOf}-${createdAt}`,
  accountId,
  valueCents: dollars * 100,
  asOf,
  createdAt,
});

describe("netWorthByMonth", () => {
  it("carries the latest value forward through months without updates", () => {
    const rows = netWorthByMonth(
      [acct("tfsa"), acct("fhsa")],
      [val("tfsa", 50000, "2026-08-10"), val("fhsa", 20000, "2026-09-05"), val("tfsa", 52000, "2026-10-01")],
      ["2026-08", "2026-09", "2026-10"],
      "2026-10-26",
    );
    expect(rows.map((r) => r.total)).toEqual([5000000, 7000000, 7200000]);
    expect(rows[1].tfsa).toBe(5000000);
  });

  it("uses the most recently entered value when two share a date", () => {
    const rows = netWorthByMonth([acct("a")], [val("a", 100, "2026-10-01", "t2"), val("a", 90, "2026-10-01", "t1")], ["2026-10"], "2026-10-26");
    expect(rows[0].total).toBe(10000);
  });
});

describe("accountGrowth", () => {
  it("separates contributions from market movement since the first value", () => {
    const contribution = (on: string, dollars: number, kind: Contribution["kind"] = "contribution"): Contribution => ({
      id: on,
      accountId: "a",
      kind,
      amountCents: dollars * 100,
      contributedOn: on,
      taxYear: null,
      note: "",
      createdAt: "",
    });
    const g = accountGrowth(
      [val("a", 50000, "2026-06-01"), val("a", 54000, "2026-10-01")],
      [contribution("2026-05-01", 999), contribution("2026-07-01", 1000), contribution("2026-08-01", 1000), contribution("2026-09-01", 500, "withdrawal")],
      "a",
      "2026-10-26",
    );
    expect(g).toMatchObject({ netContributed: 150000, growth: 250000 });
  });
});

describe("lastDayOfMonth", () => {
  it("handles February", () => {
    expect(lastDayOfMonth("2028-02")).toBe("2028-02-29");
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
  });
});
