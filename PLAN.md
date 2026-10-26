# Income & Net Worth Tracker — Plan

A personal, minimal app for tracking income by stream, net worth across accounts, and investment contributions.

## Decisions

| Area | Choice |
|---|---|
| Stack | Next.js (App Router, TypeScript) + Tailwind + shadcn/ui |
| Backend | Supabase (Postgres + Auth + Row-Level Security) |
| Hosting | Vercel (free tier) |
| Login | Google sign-in, restricted to one allowed email |
| Currency | CAD only |
| Income amount | Net deposit (what actually landed in the account) |
| Net worth | Update any account anytime; each month uses each account's latest value as of month end, carried forward |
| Contributions | Tied to a specific account |
| Devices | Mobile-first responsive design, installable as a home-screen app (PWA) |
| Charts | Recharts |
| Theme | Light / dark / system toggle (next-themes) |

## Data model (Postgres)

Every table has `user_id uuid` (FK → auth.users) and an RLS policy `user_id = auth.uid()`.
Money is stored as `amount_cents bigint` to avoid floating-point errors.

```
income_sources   id, user_id, name, color, archived bool, created_at
income_entries   id, user_id, source_id → income_sources, amount_cents, received_on date, note, created_at

accounts         id, user_id, name ("TFSA"), type (tfsa|fhsa|rrsp|cash|brokerage|other),
                 color, archived bool, created_at
account_values   id, user_id, account_id → accounts, value_cents, as_of date, created_at
contributions    id, user_id, account_id → accounts, kind (contribution|withdrawal),
                 amount_cents (always positive), contributed_on date,
                 tax_year int null (RRSP only), note, created_at
room_seeds       id, user_id, room_type (tfsa|fhsa|rrsp), year int, room_cents,
                 fhsa_lifetime_contributed_cents null, note, created_at
```

- `account_values` is append-only history, so each update adds a new row. "Current value" is the latest row.
- Monthly net worth is computed per month M as the sum over accounts of the latest `account_values` row with `as_of <= end of M`. This is a SQL view or RPC, so the client stays simple.
- `source` / `external_id` columns can be added later for bank or brokerage imports without changing the schema shape.
- Accounts and sources are archived, not deleted, so their history is kept.
- Contribution room belongs to *you*, not to an account. If you hold two TFSAs at different brokerages, their contributions are pooled against a single TFSA room.

## Contribution room rules

You enter the starting room once from CRA My Account or your Notice of Assessment (NOA). The app tracks it forward from there. Annual limits live in one code constant (`lib/room-limits.ts`) that gets updated each year.

**TFSA**
- Seed: the room CRA shows as of Jan 1 of the current year.
- Available now = seed − contributions this year. Withdrawals are not added back until next year.
- On each new Jan 1: room += that year's annual limit ($7,000 for 2024–2026) + the previous year's withdrawals.
- A pending line shows withdrawals made this year that come back as room on Jan 1.

**FHSA**
- Seed: participation room for the current year, plus lifetime contributions so far.
- Annual room is $8,000 + carry-forward. Carry-forward is the unused room from last year, capped at $8,000, so the most you can have in a year is $16,000. The lifetime cap is $40,000.
- Withdrawals do **not** restore room.
- A lifetime progress bar shows x / $40,000.

**RRSP**
- Seed: the "RRSP deduction limit" for year Y from your NOA. You enter a new number each year when the NOA arrives.
- Each RRSP contribution carries a `tax_year`. It defaults to the calendar year, but if the date falls in the first 60 days of the year, the form asks which year it applies to.
- Available = NOA limit − contributions assigned to that tax year.
- Shows a note about the $2,000 lifetime over-contribution buffer.

**Warnings**
- The add-contribution form shows "room after this: $X" live.
- It warns in red if a contribution would put you over the limit. The penalty is 1% per month on the excess.
- If no seed exists for the current year, a "Set your room" prompt appears. For RRSP this reads "Enter your 2026 NOA limit".

All of this is an estimate based on what you've logged. CRA's number is the source of truth, and the UI says so. You can re-seed at any time; the newest seed for a type replaces the older one.

## Pages

1. **Dashboard (`/`)**
   - Stat tiles: income this month, income YTD, current net worth, contributions YTD.
   - Small net worth line and income-this-month split.
   - Floating **+** button for quick add: paycheque, contribution or account value.

2. **Income (`/income`)**
   - Stacked bar chart of monthly income by source. A month where a source paid nothing just shows no segment for it.
   - Donut of each source's share for the selected range (3M / 6M / YTD / 12M / All).
   - Per-source totals table.
   - Entry list (date, source, amount, note) with edit and delete.
   - Manage sources: add, rename, change colour, archive. Starts with "Software Engineering" and "Work", with room to add "TA" later.

3. **Net Worth (`/net-worth`)**
   - Line chart of total net worth by month, optionally stacked by account.
   - Account cards showing the current value, last-updated date, total contributed and gain (value − contributed).
   - Each card has an "Update value" action that adds a new `account_values` row dated today, or a date you choose.
   - Add or archive accounts.

4. **Contributions (`/contributions`)**
   - Bar chart of contributions per month, coloured by account.
   - YTD total per account. The tracking start date is shown so nobody expects past data.
   - **Room cards** for TFSA, FHSA and RRSP, each showing:
     - available room and a used / total progress bar
     - contributed this year
     - pending TFSA withdrawal room
     - FHSA lifetime progress
     - "Update from CRA" to re-seed
   - Entry list (contributions and withdrawals) with edit and delete.

5. **Settings**
   - Theme, CSV export of all data, sign out.

## Security

- Supabase RLS on every table, so users can only ever read their own rows.
- Only one Google account is allowed. This is enforced in two places:
  - Supabase Auth: limit sign-ups, or an `auth` hook that rejects other emails.
  - Next.js middleware: checks an `ALLOWED_EMAIL` env var.
- No secrets in the client. Only the Supabase anon key is used client-side; RLS does the enforcement.

## Milestones

1. **Scaffold**: Next.js + Tailwind + shadcn, theme toggle, layout and nav (sidebar on desktop, bottom tabs on mobile).
2. **Supabase**: project, schema migration, RLS, Google OAuth, allowed-email guard.
3. **Income**: sources CRUD, entries CRUD, monthly stacked bar and donut, range filter.
4. **Net worth**: accounts CRUD, value updates, monthly carry-forward view, line chart.
5. **Contributions**: CRUD (contributions and withdrawals), monthly chart, contributed-vs-value per account.
6. **Contribution room**:
   - room seeds and the room calculation for TFSA, FHSA and RRSP, as pure functions with unit tests for the rules above
   - room cards
   - over-contribution warnings
7. **Dashboard and quick-add**, CSV export, PWA manifest.
8. **Deploy** to Vercel and smoke-test on phone.

## Out of scope for now (future)

- Bank or brokerage integration (e.g. Plaid / Flinks / Wealthsimple export import).
- Backfilling historical data.
- Expenses / budgeting.
- Multi-currency.
- Computing room from scratch out of birth year and full history. Room is seeded from CRA numbers instead.
- Spousal RRSP, pension adjustments, and FHSA → RRSP transfers.

## What you'll need to provide

- A Supabase account and project (free), so the URL and anon key can go into `.env.local`.
- A Google Cloud OAuth client ID and secret, to plug into Supabase's Google provider. Setup steps will be written into the README.
- A Vercel account linked to a GitHub repo for deployment.
