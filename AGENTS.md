# Syncareer engineering instructions

## Product and repository

- Syncareer is a career platform for African students and graduates.
- The active frontend currently builds from `artifacts/syncareer`.
- There is no `artifacts/api-server/` in this repository. `replit.md` mentions an Express API server, but that artifact is not present and is not part of the current operating system. Do not assume an Express server exists unless the repository later contains and uses one.
- The backend is Supabase Auth, Postgres/PostgREST/RLS, database functions, and Supabase Edge Functions. Do not assume an Express server exists unless the repository later contains and uses one.
- Lovable intentionally remains part of the operating workflow. It provides useful Supabase integration, OAuth, AI gateway, email/webhook, analytics/SEO, deployment, and non-technical-founder conveniences where verified.
- Replit-specific tooling is active in development (`.replit`, `pnpm-workspace.yaml` catalog entries for `@replit/*`, `nodejs-24` module). Determine actual use before removing it.

## Read before changing

- Inspect the current files and call sites before recommending or making changes. Do not rely on historical docs alone.
- Treat `docs/archive` as historical, not authoritative. Files such as `QUICK_START.md`, `README_FIRST.txt`, `SETUP_GUIDE.md`, and the credential-verification docs in `docs/archive` describe a prior build state and must not be read as current architecture.
- When code, generated types, migrations, docs, and live-platform behavior disagree, stop and identify the sources of truth. Do not guess.
- For Supabase schema or deployed-function work, distinguish repository evidence from live-project evidence. The repository contains 9 edge functions under `supabase/functions/`; the live project has more (see `docs/CLEANUP_BACKLOG.md` item 2). Do not assume the repo is the complete picture of the deployed backend.
- The Supabase types file used by the app is `artifacts/syncareer/src/integrations/supabase/types.ts`. A second copy exists at `src/integrations/supabase/types.ts` (Lovable auto-sync target). These can drift; verify which is authoritative before editing.

## Engineering priorities

- Human maintainability is the highest priority. A competent engineer must be able to understand, test, debug, and extend the codebase without knowing the prompts or AI tools that created it.
- Prefer simple modules, explicit business logic, obvious data flow, strong database constraints, focused tests, and clear integration boundaries.
- Treat unnecessary complexity as a defect.
- Do not introduce microservices, CQRS, event buses, generic repositories, dependency-injection frameworks, speculative caching, provider-neutral frameworks, or abstractions with one implementation unless a demonstrated problem requires them.
- Do not introduce an abstraction merely to avoid a few duplicated lines.
- Do not rewrite working domains when a targeted repair is safer.

## Lovable integration policy

- Do not treat all Lovable-specific code, configuration, dependencies, or infrastructure as residue.
- Before removing or replacing a Lovable artifact, classify it as one of: `ACTIVE PLATFORM DEPENDENCY`, `USEFUL INTEGRATION`, `HISTORICAL COMPATIBILITY`, `GENERATED CODE DEBT`, or `UNKNOWN`.
- Verify current usage, the capability supported, and the operational effect of removal.
- If safety cannot be determined from repository evidence, classify it as `UNKNOWN` and stop before removal.
- Keep Lovable-specific concerns near real integration seams such as OAuth, AI gateway, email, webhooks, generated Supabase files, or deployment configuration.
- Keep core Syncareer domain code understandable without knowledge of Lovable internals.
- Do not add vendor-neutral adapters unless there is a real integration seam with meaningful application logic to isolate.

Known Lovable touchpoints in this repository that should be classified before any change:

- `package.json` dependency `@lovable.dev/cloud-auth-js`
- Supabase edge function `career-guidance` — streams OpenAI-compatible SSE through `https://ai.gateway.lovable.dev/v1/chat/completions` using `LOVABLE_API_KEY` and the `google/gemini-2.5-flash` model
- Supabase `config.toml` project settings and function `verify_jwt` flags
- Lovable Cloud-managed `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (provided automatically; see `PUBLISH_TROUBLESHOOTING.md`)

## Supabase and security

- Never expose or log service-role keys, payment secrets, Lovable API keys, webhook secrets, or user tokens.
- Browser `VITE_*` values may be public configuration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` are safe to commit), but do not move server secrets into them.
- Treat browser route guards as UX only. Authorization must be enforced by RLS, database constraints/functions, or authenticated edge functions.
- Never weaken RLS, grants, trigger protections, payment verification, usage enforcement, or role checks to make a test pass.
- Do not edit or reconstruct deployed-only edge functions from frontend call sites. Recover exact deployed source first.
- Do not hand-create a database baseline from generated TypeScript types. Reconcile against the live schema first.
- Every billable AI or payment operation must enforce access server-side. Client checks are not security controls.
- Payment verification must confirm provider status, amount, currency, plan, user ownership, and replay/idempotency before granting access.

Edge functions in this repository that already enforce server-side access:

- `aggregate-external-jobs` — service-role only (cron)
- `career-guidance` — authenticated, non-anon callers only; `LOVABLE_API_KEY` read from server env
- `send-transactional-email`, `process-email-queue`, `send-onboarding-nudges` — `verify_jwt = true`
- `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `mcp` — `verify_jwt = false` (public endpoints; review their logic before trusting any caller-supplied authority)

## TypeScript and validation

- Do not weaken TypeScript compiler options, add blanket ignores, or use broad `any`/casts to obtain a green typecheck.
- Fix type errors by correcting runtime assumptions, schema drift, or interfaces.
- Validate untrusted data at runtime: form boundaries, edge-function requests, external APIs, AI output, webhook payloads, and stored JSON where appropriate.
- Generated Supabase types are generated artifacts. Establish their source and regeneration workflow before editing them manually.

Current compiler settings (`tsconfig.base.json`): `strictNullChecks`, `noImplicitAny`, `noImplicitThis`, `strictFunctionTypes: false`, `strictBindCallApply`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`, `isolatedModules`, `noEmitOnError`. Approximately 150 pre-existing strict-null warnings exist across older files (`docs/CLEANUP_BACKLOG.md` item 5); do not expand them and clean them up opportunistically when already editing a file.

## Dependencies and generated code

- Use the repository's confirmed authoritative package manager. The root `package.json` uses `corepack pnpm` in every script (`install`, `build`, `build:dev`, `dev`, `test`, `typecheck`). `pnpm-lock.yaml` and `pnpm-workspace.yaml` are present and active. `package-lock.json` and `bun.lock` also exist at the root; do not delete lockfiles solely because they look redundant until the package-manager cleanup is complete and explicitly authorized.
- Before adding a production dependency, verify that the platform or native APIs and current dependencies do not already solve the need.
- Do not manually edit generated files unless the task explicitly establishes that as the supported workflow.
- Preserve Lovable/Replit compatibility when it has verified operational value.
- The publish artifact requires managed env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` (see `PUBLISH_TROUBLESHOOTING.md`). Do not add `.env` to `.gitignore` overrides that strip them.

## Change discipline

- Keep each branch and commit focused on one stage or domain.
- Do not combine behavior changes with broad refactoring.
- Preserve unrelated user changes and platform files.
- Do not deploy, rotate secrets, mutate production data, apply migrations to production, or remove live integrations without explicit user authorization.
- For destructive or irreversible work, inspect exact targets and stop for approval.
- If a task is blocked by missing live Supabase/Lovable evidence or credentials, report the exact blocker and required user action instead of inventing a substitute.

## Verification

- Run the smallest relevant checks during development and the full required checks before declaring a stage complete.
- The target verification set is: authoritative frozen install, TypeScript typecheck, tests, and production build. Run database/RLS or edge-function tests when those areas change.
- Do not claim success if a required check was skipped or already failing. State exact commands, outcomes, and whether failures are pre-existing or introduced.
- Review the final diff for accidental generated files, secrets, lockfile churn, unrelated formatting, weakened validation, and unnecessary abstractions.

Repository verification commands (from the repo root):

```bash
# Frozen install (required before anything else)
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile

# TypeScript typecheck
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit

# Tests
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vitest run

# Production build (exact command the publisher runs)
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts
```

## Documentation

- Update current architecture/runbook documentation when behavior or operating procedures change.
- Do not present archived plans as current architecture.
- Document why a non-obvious integration or security boundary exists, not what obvious code syntax does.
- When an AI session exposes a repeated repository-specific mistake, propose a concise AGENTS.md update; do not grow this file with one-off task details.

Current authoritative docs: `replit.md` (stack and runbook), `PUBLISH_TROUBLESHOOTING.md` (publish fixes and the realtime-channel rule), `docs/CLEANUP_BACKLOG.md` (known technical-debt items and their risk classifications). `docs/archive/*` is historical.

## Definition of done

- Requested behavior is implemented with the smallest sensible change.
- Relevant tests exist and pass.
- Typecheck and build status are honestly reported.
- Security, RLS, payment, AI-cost, and platform-integration boundaries are preserved.
- Documentation matches the resulting system.
- The final response lists changed files, verification performed, remaining risks, and any user action still required.
