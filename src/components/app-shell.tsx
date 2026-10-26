"use client";

import { ChartLine, HandCoins, LayoutGrid, PiggyBank, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Dashboard", Icon: LayoutGrid },
  { href: "/income", label: "Income", Icon: Wallet },
  { href: "/net-worth", label: "Net worth", Icon: ChartLine },
  { href: "/contributions", label: "Contributions", Icon: PiggyBank },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold">
          <HandCoins size={18} />
          Ledger
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                isActive(pathname, href) ? "bg-surface-2 font-medium text-text" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HandCoins size={18} />
            Ledger
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-10">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive(pathname, href) ? "text-text" : "text-text-3"
              }`}
            >
              <Icon size={18} />
              {label === "Contributions" ? "Contrib." : label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
