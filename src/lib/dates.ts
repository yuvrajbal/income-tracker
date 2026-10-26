// All dates are local calendar dates ("YYYY-MM-DD"); no time zones involved.

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-10-26" -> "2026-10" */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Inclusive list of month keys from `from` to `to` ("YYYY-MM"). */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Shift a month key by n months. */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

const monthShort = new Intl.DateTimeFormat("en-CA", { month: "short" });
const monthLong = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" });

function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

/** "2026-10" -> "Oct" (adds "'26" when `withYear`). */
export function formatMonthShort(key: string, withYear = false): string {
  const label = monthShort.format(keyToDate(key));
  return withYear ? `${label} '${key.slice(2, 4)}` : label;
}

export function formatMonthLong(key: string): string {
  return monthLong.format(keyToDate(key));
}

export function formatDay(iso: string): string {
  return dayFmt.format(keyToDate(iso));
}
