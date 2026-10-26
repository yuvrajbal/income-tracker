"use client";

import { X } from "lucide-react";
import { formatCents } from "@/lib/money";
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "bg-surface border border-border text-text hover:bg-surface-2",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
  danger: "text-danger hover:bg-surface-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "icon" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text",
        size === "md" && "h-9 px-3.5",
        size === "sm" && "h-8 px-2.5",
        size === "icon" && "h-8 w-8",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-border bg-surface", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-xs text-text-2">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-text-3">{hint}</div>}
    </Card>
  );
}

const fieldBase =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-text-3 focus:outline-2 focus:outline-offset-1 focus:outline-text";

export function Field({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-2">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldBase, "pr-8", className)} {...props} />;
}

/** Segmented control, e.g. for time ranges. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
            value === o.value ? "bg-surface-2 text-text" : "text-text-3 hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Native <dialog> modal: Esc and backdrop click close it. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/40 max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X size={16} />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function SeriesSwatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** Signed amount; direction is carried by the sign and an arrow, not color alone. */
export function Delta({ cents }: { cents: number }) {
  if (cents === 0) return <span className="tabular">$0</span>;
  return (
    <span className="tabular">
      {cents > 0 ? "▲ +" : "▼ −"}
      {formatCents(Math.abs(cents), { whole: true })}
    </span>
  );
}
