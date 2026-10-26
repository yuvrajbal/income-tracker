"use client";

import { AlertTriangle } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { formatDay, todayISO } from "@/lib/dates";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { FHSA_LIFETIME, fhsaRoom, latestSeed, RRSP_BUFFER, rrspRoom, tfsaRoom } from "@/lib/room";
import { addRoomSeed } from "@/lib/store";
import type { AppData, RoomSeed, RoomType } from "@/lib/types";

const LABEL: Record<RoomType, string> = { tfsa: "TFSA", fhsa: "FHSA", rrsp: "RRSP" };

export function RoomCards({ data, onSetup }: { data: AppData; onSetup: (type: RoomType) => void }) {
  const today = todayISO();
  const year = Number(today.slice(0, 4));

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(["tfsa", "fhsa", "rrsp"] as const).map((type) => {
        const seed = latestSeed(data.roomSeeds, type);
        if (!seed) {
          return (
            <Card key={type} className="flex flex-col px-4 py-3.5">
              <div className="text-sm font-medium">{LABEL[type]} room</div>
              <p className="mt-1 flex-1 text-xs text-text-3">
                {type === "rrsp" ? "Enter the deduction limit from your Notice of Assessment." : "Enter the room shown in CRA My Account."}
              </p>
              <Button size="sm" className="mt-3 self-start" onClick={() => onSetup(type)}>
                Set up
              </Button>
            </Card>
          );
        }
        const update = (
          <button className="text-xs text-text-3 underline-offset-2 hover:text-text hover:underline" onClick={() => onSetup(type)}>
            Update from CRA
          </button>
        );

        if (type === "tfsa") {
          const r = tfsaRoom(seed, data.accounts, data.contributions, today);
          const total = r.available + r.contributedThisYear;
          return (
            <RoomCard key={type} title="TFSA room" available={r.available} used={r.contributedThisYear} total={total} action={update}>
              <Line label={`Contributed in ${year}`} value={formatCents(r.contributedThisYear, { whole: true })} />
              {r.pendingRestore > 0 && <Line label={`Back on Jan 1, ${year + 1}`} value={`+${formatCents(r.pendingRestore, { whole: true })}`} />}
              {r.limitEstimated && <Line label="Note" value="This year's limit is estimated" />}
            </RoomCard>
          );
        }
        if (type === "fhsa") {
          const r = fhsaRoom(seed, data.accounts, data.contributions, today);
          return (
            <RoomCard key={type} title="FHSA room" available={r.available} used={r.contributedThisYear} total={r.available + r.contributedThisYear} action={update}>
              <Line label={`Contributed in ${year}`} value={formatCents(r.contributedThisYear, { whole: true })} />
              <Line label="Lifetime" value={`${formatCents(r.lifetimeContributed, { whole: true })} / ${formatCents(FHSA_LIFETIME, { whole: true })}`} />
              <Bar used={r.lifetimeContributed} total={FHSA_LIFETIME} thin />
            </RoomCard>
          );
        }
        const r = rrspRoom(seed, data.accounts, data.contributions, today);
        const stale = seed.year < year;
        return (
          <RoomCard key={type} title={`RRSP room · ${r.taxYear}`} available={r.available} used={r.contributed} total={r.limit} action={update} rrsp>
            <Line label={`Contributed for ${r.taxYear}`} value={formatCents(r.contributed, { whole: true })} />
            <Line label="Deduction limit" value={formatCents(r.limit, { whole: true })} />
            {stale && <p className="mt-1 text-xs text-text-3">Enter your {year} limit when your Notice of Assessment arrives.</p>}
          </RoomCard>
        );
      })}
    </div>
  );
}

function RoomCard({
  title,
  available,
  used,
  total,
  action,
  rrsp,
  children,
}: {
  title: string;
  available: number;
  used: number;
  total: number;
  action: ReactNode;
  rrsp?: boolean;
  children: ReactNode;
}) {
  const over = available < 0;
  const penalized = over && (!rrsp || -available > RRSP_BUFFER);
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-2">{title}</div>
        {action}
      </div>
      <div className="mt-1 text-xl font-semibold tabular tracking-tight">{formatCents(Math.max(available, 0), { whole: true })}</div>
      <div className="text-xs text-text-3">available</div>
      {over && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
          <AlertTriangle size={13} />
          Over by {formatCents(-available, { whole: true })}
          {!penalized && " (within $2,000 buffer)"}
        </p>
      )}
      <Bar used={used} total={total} />
      <dl className="mt-2 space-y-0.5 text-xs">{children}</dl>
    </Card>
  );
}

function Bar({ used, total, thin }: { used: number; total: number; thin?: boolean }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : used > 0 ? 100 : 0;
  return (
    <div className={`mt-2 w-full overflow-hidden rounded-full bg-surface-2 ${thin ? "h-1" : "h-1.5"}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${used > total ? "bg-danger" : "bg-text-2"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-text-3">{label}</dt>
      <dd className="tabular text-text-2">{value}</dd>
    </div>
  );
}

/** Enter the number from CRA that room tracking starts from. */
export function RoomSeedForm({ type, current, onDone }: { type: RoomType; current: RoomSeed | null; onDone: () => void }) {
  const year = Number(todayISO().slice(0, 4));
  const [room, setRoom] = useState("");
  const [asOf, setAsOf] = useState(`${year}-01-01`);
  const [rrspYear, setRrspYear] = useState(year);
  const [lifetime, setLifetime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parse = (s: string) => (s.replace(/[$,\s]/g, "") === "0" ? 0 : parseDollarsToCents(s));

  function submit(e: FormEvent) {
    e.preventDefault();
    const roomCents = parse(room);
    if (roomCents === null) return setError("Enter the room amount, e.g. 15,500");
    let lifetimeCents: number | null = null;
    if (type === "fhsa") {
      lifetimeCents = parse(lifetime || "0");
      if (lifetimeCents === null) return setError("Enter lifetime contributions (0 if none)");
    }
    const seedAsOf = type === "rrsp" ? `${rrspYear}-01-01` : asOf;
    if (!seedAsOf) return setError("Pick a date");
    addRoomSeed({
      roomType: type,
      year: type === "rrsp" ? rrspYear : Number(seedAsOf.slice(0, 4)),
      asOf: seedAsOf,
      roomCents,
      lifetimeContributedCents: lifetimeCents,
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-text-2">
        {type === "tfsa" && (
          <>
            In CRA My Account, find <em>TFSA contribution room on January 1, {year}</em>. If you&apos;ve already contributed this year, log those
            contributions too, or enter what&apos;s left today and set the date to today.
          </>
        )}
        {type === "fhsa" && (
          <>
            In CRA My Account, find your <em>FHSA participation room for {year}</em> (the $8,000 annual amount plus any carry-forward). Log any
            contributions you&apos;ve made since, or enter what&apos;s left today with today&apos;s date.
          </>
        )}
        {type === "rrsp" && (
          <>
            Your Notice of Assessment shows <em>RRSP deduction limit for {rrspYear}</em>. If it lists unused contributions, subtract them. Log
            contributions made for that year so they&apos;re counted.
          </>
        )}
      </p>

      {type === "rrsp" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax year">
            <Select value={rrspYear} onChange={(e) => setRrspYear(Number(e.target.value))}>
              <option value={year}>{year}</option>
              <option value={year - 1}>{year - 1}</option>
            </Select>
          </Field>
          <Field label="Deduction limit">
            <Input inputMode="decimal" placeholder="12,000" value={room} onChange={(e) => setRoom(e.target.value)} className="tabular" autoFocus />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label={type === "tfsa" ? "Room available" : "Participation room"}>
            <Input inputMode="decimal" placeholder={type === "tfsa" ? "15,500" : "8,000"} value={room} onChange={(e) => setRoom(e.target.value)} className="tabular" autoFocus />
          </Field>
          <Field label="As of">
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </Field>
        </div>
      )}
      {type === "fhsa" && (
        <Field label="Lifetime FHSA contributions before that date">
          <Input inputMode="decimal" placeholder="0" value={lifetime} onChange={(e) => setLifetime(e.target.value)} className="tabular" />
        </Field>
      )}

      {current && (
        <p className="text-xs text-text-3">
          Currently tracking from {formatCents(current.roomCents)} as of {formatDay(current.asOf)}. Saving replaces it.
        </p>
      )}
      <p className="text-xs text-text-3">These are estimates from what you log here. CRA&apos;s numbers are always the source of truth.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}
