# Ledger

Personal tracker for income by stream, net worth and TFSA/FHSA/RRSP contributions. See `PLAN.md` for the full plan and milestones.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (vitest)
```

## Status

- [x] Scaffold, light/dark/system theme, desktop sidebar + mobile tabs
- [x] Income: sources, deposits, monthly chart by source, split by source, range filter
- [x] Net worth: accounts, value updates (single or all at once), monthly carry-forward chart, contributions vs market split
- [x] Contributions & withdrawals, monthly chart, TFSA/FHSA/RRSP room with over-contribution warnings
- [x] Dashboard with quick add
- [ ] Supabase (database, Google login)
- [ ] PWA manifest, deploy

Yearly upkeep: add the new TFSA limit to `TFSA_LIMITS` in `src/lib/room.ts` when CRA announces it.

Data is currently stored in the browser's localStorage (`src/lib/store.ts`). The UI only talks to that module, so moving to Supabase replaces the store without touching pages.
