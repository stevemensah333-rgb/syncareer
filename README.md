# Syncareer

An AI-powered career platform for African students and graduates. Users discover
careers, build ATS-ready CVs, practice interviews, and connect with vetted career
counsellors.

> **Documentation status:** This README and the docs it links to are the **current,
> authoritative** source of truth. Anything in `docs/archive/` is historical and
> non-authoritative (see [`docs/archive/README.md`](docs/archive/README.md)). Old docs that
> mention an Express API server, employer dashboards, or an offline PWA describe
> architecture that no longer exists.

---

## What Syncareer does

- **Career assessment** — a 45-question RIASEC quiz that produces deterministic,
  0–100 normalized interest scores and top-3 career recommendations.
- **CV builder** — structured CV editor with an AI assistant, a deterministic
  CV Strength Score, skill-gap analysis, export, and a public portfolio.
- **Interview practice** — a voice interview simulator ("SynAssist") with an
  AI interviewer and feedback. LLM output is intentionally not treated as a
  testing contract.
- **Opportunities & analysis** — job market intelligence, alumni outcomes, and
  external job aggregation for the student's major/region.
- **AI Coach** — streaming career-guidance chat.
- **Counsellor marketplace** — vetted counsellors with availability, booking,
  sessions, client messaging, and reviews.
- **Admin tools** — feedback review, user management, credential review.
- **Supporting systems** — subscriptions & payments (Paystack), referrals,
  notifications, and multilingual (i18n) UI.

## Current product modules and routes

The frontend router (`artifacts/syncareer/src/App.tsx`) defines the modules:

| Module | Primary routes |
|---|---|
| Marketing / landing / blog / pricing | `/`, `/blog`, `/pricing`, `/terms`, `/privacy` |
| Auth & onboarding | `/sign-in`, `/sign-up`, `/reset-password`, `/onboarding` |
| Student core | `/dashboard`, `/assessment`, `/cv-builder`, `/analysis` |
| Interview / AI | `/interview-simulator`, `/ai-coach` |
| Opportunities | `/opportunities`, `/applications`, `/apply` |
| Student hubs | `/build`, `/practice`, `/settings` |
| Counsellor | `/counsellor-dashboard`, `/counsellor-availability`, `/counsellor-sessions`, `/counsellor-clients`, `/counsellor/complete-credentials` |
| Admin | `/admin/feedback`, `/admin/users`, `/admin/credentials` |

Role-route guards (`RoleRoute`, `AdminRoute`, `ProtectedRoute`) are **UX only**.
Server authorization is enforced by Postgres RLS and edge functions, not by the router.

## Active repository layout

```
README.md                      This guide
AGENTS.md                      Engineering policy (read first)
docs/                          Current runbooks (see "Documentation index")
  ARCHITECTURE.md              Architecture & data flow
  EDGE_FUNCTIONS.md            Edge-function inventory & deployment
  PAYMENT_AND_SUBSCRIPTIONS.md Payment & subscription trust flow
  LOVABLE_INTEGRATION.md       Lovable boundaries & artifact classifications
  PLATFORM_ARTIFACT_INVENTORY.md  Replit/Lovable/Clerk/PWA artifact classifications
  INCIDENT_RECOVERY.md         Incident & recovery basics
  SCHEMA_RECONCILIATION.md     Schema, migrations & generated-type workflow
  BUILD_AND_CHECK.md           Setup / test / build runbook
  TEST_MATRIX.md               Test layers & coverage intent
  archive/                     Historical, non-authoritative docs
artifacts/syncareer/           React + Vite + TypeScript frontend (the app)
  src/                         Frontend source
  vite.config.ts / vitest.config.ts
  tsconfig.json
supabase/                      Backend (Supabase-compatible)
  config.toml                  Edge-function config
  functions/                   Edge-function source
  migrations/                  SQL migration deltas
  tests/                       Read-only RLS / schema test scripts
  inspection/                  Read-only live-schema inspection queries
scripts/schema/                Schema smoke + generated-types tooling
```

The root `src/` directory holds Lovable's auto-sync target for generated
Supabase files; the application builds from `artifacts/syncareer/src` (see
`docs/SCHEMA_RECONCILIATION.md` and `docs/LOVABLE_INTEGRATION.md`).

## Frontend: React / Vite

The frontend lives at **`artifacts/syncareer/`** (React 19, TypeScript 5.9,
Vite 7, Tailwind CSS, react-router-dom). The root `package.json` scripts delegate
to it. There is **no Express/Node API server** — all server work happens through
Supabase (see below).

## Backend: Supabase model

The backend is **Supabase Auth + Postgres/PostgREST/RLS + database functions +
edge functions**. There is no in-repo HTTP server.

- **Auth:** Supabase Auth (email/password + Google OAuth through Lovable's
  `@lovable.dev/cloud-auth-js`). `profiles.id` matches `auth.uid()` directly.
- **Data:** application tables in `public` with RLS enabled. Ownership is
  enforced with `auth.uid()` policies; role changes, payment fields, and
  counsellor session/booking mutations are further guarded by triggers and
  SECURITY DEFINER functions.
- **Read-only verification:** `supabase/tests/schema_rls_smoke.sql`,
  `supabase/tests/rls_authorization_matrix.sql`, and
  `scripts/schema/repository-smoke.mjs`.
- **Trust rule:** every billable/AI/payment operation is enforced server-side.
  Client-side route guards are UX only.

The migrations directory is **not** a complete baseline — see
[`docs/SCHEMA_RECONCILIATION.md`](docs/SCHEMA_RECONCILIATION.md) before treating
it as one.

## Lovable's intentional roles

Lovable Cloud is the operating platform and current hosted-backend authority.
Its intentional roles: Supabase-style project (database, auth, RLS, edge
functions), Google OAuth and AI-gateway integration (`@lovable.dev/cloud-auth-js`,
`LOVABLE_API_KEY`), transactional email / webhooks, and deployment. Many edge
functions are **deployed-only** (not in `supabase/functions/`). Full
classifications are in [`docs/LOVABLE_INTEGRATION.md`](docs/LOVABLE_INTEGRATION.md).

## Local setup

Requirements: Node.js ≥ 22 with Corepack, pnpm (frozen lockfile). Reproducible
install is authoritative:

```bash
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile
```

The root `.env` is **tracked on purpose**: it holds only public `VITE_*` client
configuration that the Lovable/Replit publish artifact reads at build time (see
[`PUBLISH_TROUBLESHOOTING.md`](PUBLISH_TROUBLESHOOTING.md)). Copy
[`.env.example`](.env.example) for the full list, and put personal overrides in
`.env.local`, which is git-ignored. **Never** put server secrets in either file.

**Variable names (no values):**

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `VITE_SUPABASE_PROJECT_ID` | Project id (used to build edge-function URLs) |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key (payments) |
| `VITE_POSTHOG_API_KEY` | PostHog analytics (optional) |

Edge functions additionally require server secrets (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `PAYSTACK_SECRET_KEY`, etc.).
Configure those in Lovable Cloud — never commit them. See
`docs/BACKEND_PLATFORM_INVENTORY.md` §6 for the full secret-name matrix.

## Authoritative commands (run from repo root)

```bash
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile   # install
corepack pnpm run dev                                                             # dev server (0.0.0.0)
corepack pnpm run typecheck                                                       # tsc --noEmit (must pass)
corepack pnpm run test                                                            # vitest (99 tests)
corepack pnpm run build                                                           # production build to dist/
corepack pnpm run schema:repo:smoke                                               # static schema/RLS smoke
corepack pnpm run schema:types:check                                              # generated-types freshness
corepack pnpm run schema:types:sync                                               # regenerate generated types
```

`corepack pnpm run build` runs the install step first; it emits into the root
`dist/` and `artifacts/syncareer/dist/public/`.

## Testing & build workflow

- **Local CI layer:** `pnpm run test` runs pure unit + deterministic integration
  tests (vitest, happy-dom) — no live backend or secrets required.
- **Isolated-environment layers:** database/RLS tests
  (`supabase/tests/*.sql`), edge-function contract tests, and browser E2E require
  an isolated Supabase restore / Deno / browser driver and are documented in
  [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md).
- **Typecheck and build** are blocking gates. Do not weaken tsconfig strictness
  to get a green build.

## Service worker (decommission)

The repository intentionally ships **no offline PWA**. `artifacts/syncareer/public/sw.js`
and the `removeLegacyBrowserCaches` logic in `artifacts/syncareer/src/main.tsx` are
**decommission code**: on load they unregister any previously-registered service
workers and delete browser caches. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Deployment ownership & runbooks

Deployment and the live backend are owned by **Lovable Cloud**. Do not run
`supabase link` / `db pull` / `db push` / function deployments against the Lovable
project from a personal Supabase account. Recovery paths:

- [`docs/INCIDENT_RECOVERY.md`](docs/INCIDENT_RECOVERY.md) — what to do when things break.
- [`docs/BACKEND_PLATFORM_INVENTORY.md`](docs/BACKEND_PLATFORM_INVENTORY.md) — deployed
  functions, secrets, and recovery runbook.
- [`docs/SCHEMA_RECONCILIATION.md`](docs/SCHEMA_RECONCILIATION.md) — schema/snapshot recovery.
- [`PUBLISH_TROUBLESHOOTING.md`](PUBLISH_TROUBLESHOOTING.md) — publish/build troubleshooting.

## Documentation index

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture & data flow (incl. trust boundaries)
- [`docs/EDGE_FUNCTIONS.md`](docs/EDGE_FUNCTIONS.md) — edge-function inventory & deployment
- [`docs/PAYMENT_AND_SUBSCRIPTIONS.md`](docs/PAYMENT_AND_SUBSCRIPTIONS.md) — payment/subscription trust flow
- [`docs/LOVABLE_INTEGRATION.md`](docs/LOVABLE_INTEGRATION.md) — Lovable boundaries & classifications
- [`docs/PLATFORM_ARTIFACT_INVENTORY.md`](docs/PLATFORM_ARTIFACT_INVENTORY.md) — every Replit/Lovable/Clerk/PWA artifact, classified
- [`docs/INCIDENT_RECOVERY.md`](docs/INCIDENT_RECOVERY.md) — incident/recovery basics
- [`docs/SCHEMA_RECONCILIATION.md`](docs/SCHEMA_RECONCILIATION.md) — schema/migrations/types
- [`docs/BUILD_AND_CHECK.md`](docs/BUILD_AND_CHECK.md) — setup / test / build runbook
- [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md) — test layers and coverage intent
- [`AGENTS.md`](AGENTS.md) — engineering policy (read first)
