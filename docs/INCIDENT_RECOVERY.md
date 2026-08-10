# Incident & Recovery Basics

Short, practical guidance. Full operational detail lives in
[`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md) and
[`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md). This file is not a
runbook replacement — it is the triage starting point.

## Ground rules

- The hosted backend is **Lovable Cloud**. Do not run `supabase link`, remote
  `db pull`/`db push`, migration repair, function deploys, or remote type
  generation from a personal Supabase account.
- **Never weaken security** (RLS, grants, triggers, payment verification, usage
  enforcement) to fix an incident.
- Never commit or log secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`,
  `PAYSTACK_SECRET_KEY`, webhook secrets, user tokens).
- Prefer the **smallest, targeted repair**; do not rewrite working domains.

## Incident triage

1. **Which layer?** Frontend build/typecheck, tests, schema/RLS, edge functions,
   payments, or email.
2. **Repository vs live?** Distinguish repo evidence from live-project evidence.
   Git history is not proof of the live deployed state.
3. **Is it pre-existing or introduced?** Reproduce with the current branch and
   against `main`. Record exact commands and outputs (AGENTS.md "Verification").

## Common runbooks

### Frontend won't build / typecheck fails
- Reproducible install first: `corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile`.
- Run `corepack pnpm run typecheck`, then `corepack pnpm run test`, then
  `corepack pnpm run build`.
- Fix by correcting runtime assumptions or interfaces — **do not weaken tsconfig
  strictness or add blanket `any`/ignores**.
- Reference: [`BUILD_AND_CHECK.md`](./BUILD_AND_CHECK.md).

### Schema / RLS regression
- Run the read-only smoke tests against an isolated restore:
  `corepack pnpm run schema:repo:smoke`, `supabase/tests/schema_rls_smoke.sql`,
  `supabase/tests/rls_authorization_matrix.sql`.
- Do **not** treat `supabase/migrations/` as a complete baseline. Reconcile
  against the live Lovable schema before making changes.
- Reference: [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md).

### Edge function broken / missing
- Check whether source is tracked (`supabase/functions/`) or deployed-only.
- For deployed-only functions, **do not reconstruct from call sites** — recover
  exact source via Lovable Cloud ("View code" / Git sync) or support.
- Reference: [`EDGE_FUNCTIONS.md`](./EDGE_FUNCTIONS.md).

### Payments / premium not granting
- Confirm the client boundary (signed-in user, public key only) and the server
  boundary (verify status/amount/currency/plan/ownership/idempotency) before
  changing anything.
- Run the payment/subscription unit tests and the RLS payment write checks.
- Reference: [`PAYMENT_AND_SUBSCRIPTIONS.md`](./PAYMENT_AND_SUBSCRIPTIONS.md).

### Email not sending
- Email infra is queue-based (`process-email-queue`, `send-transactional-email`,
  `email_send_log/state`, pgmq). Check rate-limit cooldown (`email_send_state`),
  suppression, and cron schedule before touching code.
- RPCs (`enqueue_email` etc.) are service-role only by design.

## Account / data deletion

- User-initiated account deletion goes through the deployed-only `delete-account`
  edge function (owner-only, revokes auth, relies on RLS cascade). It is
  irreversible — confirm with the owner before testing against real accounts.

## When to stop and escalate

- If the incident requires **live Supabase/Lovable mutation**, missing deployed
  source, or missing credentials, stop and report the exact blocker and required
  user action (per AGENTS.md) instead of inventing a substitute.

## Related

- [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md) — recovery runbook for edge functions.
- [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md) — schema/snapshot restore.
- [`PUBLISH_TROUBLESHOOTING.md`](../PUBLISH_TROUBLESHOOTING.md) — publish/build issues.
