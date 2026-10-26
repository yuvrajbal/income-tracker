"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, useThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const pref = useThemePref();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          aria-label={label}
          title={label}
          onClick={() => applyTheme(value)}
          className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
            pref === value ? "bg-surface-2 text-text" : "text-text-3 hover:text-text"
          }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
