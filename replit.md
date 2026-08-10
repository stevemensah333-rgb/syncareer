# Syncareer (Replit operations)

> **Current, accurate notes for working on Syncareer from Replit.**
> This file supersedes the older Replit guide that referenced an Express API
> server, an employer dashboard, and an offline PWA — none of those exist today.
> See [`README.md`](README.md) for the authoritative guide and
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current architecture.

## Stack (current)

- **Frontend:** React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS, at
  `artifacts/syncareer/`.
- **Backend:** Supabase Auth + Postgres/PostgREST/RLS + database functions +
  edge functions. **There is no Express/Node API server.**
- **Package manager:** pnpm (workspaces), frozen lockfile is authoritative.
- **Auth:** Supabase Auth (email/password) + Google OAuth through
  `@lovable.dev/cloud-auth-js`.
- **Payments:** Paystack (public key via `VITE_PAYSTACK_PUBLIC_KEY`; verification
  is server-side in the deployed-only `verify-paystack-payment` edge function).

## Run

```bash
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile
corepack pnpm run dev        # Vite dev server (binds 0.0.0.0)
corepack pnpm run typecheck  # tsc --noEmit
corepack pnpm run test       # vitest
corepack pnpm run build      # production build
```

## Where things live

- `artifacts/syncareer/` — React frontend (main app).
- `artifacts/syncareer/src/lib/auth.tsx` — `AuthProvider` + `useAuth`/`useUser`/
  `useClerk`/`SignedIn`/`SignedOut` shim over `supabase.auth`.
- `artifacts/syncareer/src/integrations/supabase/client.ts` — Supabase client.
- `artifacts/syncareer/src/integrations/lovable/index.ts` — `lovable.auth` OAuth wrapper.
- `artifacts/syncareer/src/App.tsx` — router.
- `supabase/` — migrations, edge functions, RLS test scripts, inspection queries.
- Root `src/` — Lovable auto-sync target for generated Supabase files (the app
  builds from `artifacts/syncareer/src`, not root `src/`).

## Environment variables (names only)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_PAYSTACK_PUBLIC_KEY`, `VITE_POSTHOG_API_KEY` (optional). Edge functions
require server secrets configured in Lovable Cloud — never commit values.
Vite caches env vars at startup; restart the dev server after adding secrets.

## Gotchas

- The hosted backend is **Lovable Cloud** — do not `supabase link` / `db pull` /
  `db push` / deploy functions from a personal Supabase account.
- The migrations directory is **not** a complete baseline (see
  [`docs/SCHEMA_RECONCILIATION.md`](docs/SCHEMA_RECONCILIATION.md)).
- **No offline PWA.** `artifacts/syncareer/public/sw.js` and the cache cleanup in
  `src/main.tsx` are decommission logic (unregister + clear caches).
- Route guards are UX only; authorization is enforced by RLS and edge functions.

## Pointers

- [`README.md`](README.md) — authoritative guide.
- [`docs/BUILD_AND_CHECK.md`](docs/BUILD_AND_CHECK.md) — runbook.
- [`AGENTS.md`](AGENTS.md) — engineering policy.
