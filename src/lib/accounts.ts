import type { AccountType } from "./types";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "tfsa", label: "TFSA" },
  { value: "fhsa", label: "FHSA" },
  { value: "rrsp", label: "RRSP" },
  { value: "brokerage", label: "Non-registered investing" },
  { value: "cash", label: "Cash / chequing / savings" },
  { value: "other", label: "Other" },
];

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function shortTypeLabel(type: AccountType): string {
  return { tfsa: "TFSA", fhsa: "FHSA", rrsp: "RRSP", brokerage: "Investing", cash: "Cash", other: "Other" }[type];
}
