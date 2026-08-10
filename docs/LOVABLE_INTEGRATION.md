# Lovable Integration Boundaries & Artifact Classifications

Lovable Cloud is the **operating platform** and the **current hosted-backend
authority**. This document states where Lovable is intentionally relied on and
how each artifact is classified. Classifications follow AGENTS.md policy:
`ACTIVE PLATFORM DEPENDENCY`, `USEFUL INTEGRATION`, `HISTORICAL COMPATIBILITY`,
`GENERATED CODE DEBT`, or `UNKNOWN`.

## What Lovable provides (intentionally used)

- **Supabase-compatible hosted backend** — Postgres/PostgREST/RLS, Auth, Storage,
  database functions, and Edge Functions (project reference
  `fsorkxlcasekndigezlx`).
- **Google OAuth** — `@lovable.dev/cloud-auth-js` binds the "Continue with
  Google" flow; tokens are handed to `supabase.setSession`.
- **AI gateway** — `LOVABLE_API_KEY` drives AI edge functions (career-guidance,
  mock-interview, CV assistant, market intelligence, etc.).
- **Transactional email / webhooks** — `@lovable.dev/email-js`,
  `@lovable.dev/webhooks-js`, suppression/unsubscribe handling.
- **Deployment, analytics, SEO, and non-technical-founder conveniences.**
- **Generated database types auto-sync** — writes the root `src/` copy.

## Boundaries (do not bypass)

- **No Express/Node server** exists. Server-side logic is Supabase + edge functions.
- **No personal-Supabase CLI** against the Lovable project: do not run
  `supabase link`, remote `db pull`/`db push`, migration repair, function deploy,
  or remote type generation from a personal account. Use Lovable Cloud surfaces.
- **Deployed-only edge functions** must not be reconstructed from call sites;
  recover exact source via Lovable Cloud (see [`EDGE_FUNCTIONS.md`](./EDGE_FUNCTIONS.md)).
- **Schema** must be reconciled against the live platform, not guessed from
  types (see [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md)).

## Artifact classifications

| Artifact / seam | Location | Classification |
|---|---|---|
| `@lovable.dev/cloud-auth-js` | `package.json`, `artifacts/syncareer/package.json` | ACTIVE PLATFORM DEPENDENCY / USEFUL INTEGRATION |
| `@lovable.dev/email-js` | `supabase/functions/process-email-queue/` | ACTIVE PLATFORM DEPENDENCY |
| `@lovable.dev/webhooks-js` | `supabase/functions/handle-email-suppression/` | ACTIVE PLATFORM DEPENDENCY |
| `src/integrations/lovable/index.ts` (root + artifacts) | Lovable auth wrapper | USEFUL INTEGRATION |
| Root `src/integrations/supabase/types.ts` | Lovable auto-sync target | HISTORICAL COMPATIBILITY / GENERATED CODE DEBT |
| `artifacts/syncareer/src/integrations/supabase/types.ts` | App-build generated types | GENERATED CODE DEBT (used by the app) |
| `bun.lock` (root & `artifacts/syncareer/`) | Lovable sandbox / proxy cache | ACTIVE PLATFORM DEPENDENCY |
| Root `.env` (tracked) | Public `VITE_*` build config for the publish artifact | ACTIVE PLATFORM DEPENDENCY |
| `index.html` `og:image` on `gpt-engineer-file-uploads` | Live social-preview asset | USEFUL INTEGRATION |
| `.lovable/plan.md` | Prior automation audit log | HISTORICAL COMPATIBILITY |
| `LOVABLE_API_KEY`, `LOVABLE_SEND_URL` | Edge-function secrets | ACTIVE PLATFORM DEPENDENCY / USEFUL INTEGRATION |

See [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md) §5 for the full
annotated table with rationale, and
[`PLATFORM_ARTIFACT_INVENTORY.md`](./PLATFORM_ARTIFACT_INVENTORY.md) for the
repository-wide classification of every Replit/Lovable/Clerk/PWA artifact,
including what was removed during platform cleanup and why.

> **`bun.lock` handling.** Its package URLs resolve through Lovable's private
> proxy (`europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`).
> Never regenerate it with a public-registry `bun install` from outside
> Lovable — that rewrites every entry and discards the pinned resolutions.
> Dependency changes made outside Lovable must be applied surgically.

## Generated-code policy

- Generated types are **generated artifacts**; do not hand-edit them as a fix.
- Regenerate/sync via the repository tooling, then verify:
  ```bash
  corepack pnpm run schema:types:check   # is the app copy fresh vs root?
  corepack pnpm run schema:types:sync    # regenerate the app copy
  ```
- The app builds from `artifacts/syncareer/src`. The root `src/` copy is the
  Lovable auto-sync target and can go stale relative to the app copy; both are
  reconciled against a verified schema snapshot, not treated as a baseline.
