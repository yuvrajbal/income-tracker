const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const cadWhole = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});
const cadCompact = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCents(cents: number, opts: { whole?: boolean } = {}): string {
  return (opts.whole ? cadWhole : cad).format(cents / 100);
}

export function formatCentsCompact(cents: number): string {
  return cadCompact.format(cents / 100);
}

/** Parses user input like "1,500", "$1500.5" into cents. Returns null if invalid or not positive. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return cents > 0 ? cents : null;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}
