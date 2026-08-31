# Edge Functions: Inventory & Deployment

Supabase Edge Functions are the server-side execution layer. They are the only
place billable/AI/payment operations are enforced server-side.

## Tracked source (`supabase/functions/`)

These functions have source in this repository:

| Function | Role | `verify_jwt` | Auth model |
|---|---|---|---|
| `send-transactional-email` | Email delivery | true | Authenticated |
| `process-mentorship-email-outbox` | Queues idempotent mentor lifecycle emails | true | Service role only |
| `send-onboarding-nudges` | Onboarding emails (cron) | true | Service role / cron |
| `process-email-queue` | Email queue worker (pgmq + cron) | true | Service role / worker |
| `aggregate-external-jobs` | External job aggregation (cron) | true | Service role / cron |
| `career-guidance` | AI Coach (SSE stream, Lovable AI gateway) | true | Authenticated |
| `market-intelligence` | Market insights for a major/region | true | Authenticated |
| `alumni-outcomes` | Alumni outcomes research | true | Authenticated |
| `preview-transactional-email` | Email template preview | false | Admin/API key |
| `handle-email-unsubscribe` | Unsubscribe (signed token) | false | Public (token) |
| `handle-email-suppression` | Bounce/complaint webhooks (HMAC) | false | Webhook (HMAC) |
| `mcp` | Model Context Protocol endpoint | false | MCP token |

`supabase/config.toml` registers these with the intended `verify_jwt` values.

## Deployed-only functions (no source in repo)

The app calls these via `supabase.functions.invoke` or direct fetch, but their
source is **not** tracked here (documented in
[`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md)):

- `verify-paystack-payment` — payment verification (see
  [`PAYMENT_AND_SUBSCRIPTIONS.md`](./PAYMENT_AND_SUBSCRIPTIONS.md)).
- `check-feature-access` — server-side feature-usage gating.
- `delete-account` — owner-only account deletion.
- `mock-interview`, `interview-tts` — AI interview + text-to-speech.
- `analyze-portfolio` — CV upload parsing. A deployed `cv-ai-assistant` artifact is documented in the platform inventory, but no current repository caller remains; job-specific bullet guidance uses tracked `career-guidance`.
- `compute-user-intelligence`, `compute-university-insights` — readiness/insights.
- `admin-feedback`, `admin-users`, `send-notification`.

> **Do not reconstruct deployed-only functions from frontend call sites.** Recover
> exact deployed source via Lovable Cloud (see recovery section below).

## Deployment

- The live backend is **Lovable Cloud** (project reference
  `fsorkxlcasekndigezlx`). Do **not** run `supabase functions deploy`,
  `supabase link`, or `supabase secrets set` against it from a personal Supabase
  account unless Lovable ownership is deliberately established.
- Deployments happen through Lovable Cloud. Tracked source under
  `supabase/functions/<name>/` + `supabase/config.toml` documents the intended
  configuration; it is not a guarantee of what is deployed.

## Required secrets (names only)

Never commit values. Configure via Lovable Cloud secrets UI.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — DB access (most functions).
- `SUPABASE_ANON_KEY` — `mcp`.
- `LOVABLE_API_KEY` — AI gateway / email.
- `FIRECRAWL_API_KEY` — job aggregation / alumni research.
- `PAYSTACK_SECRET_KEY` — `verify-paystack-payment`.
- Optional: `LOVABLE_SEND_URL`, `RESEND_API_KEY`, `OPENAI_API_KEY` / `ELEVENLABS_API_KEY`.

Full matrix: [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md) §6.

## Recovery of a deployed-only function

1. Lovable Cloud → Edge functions → **View code** for the function; use Git sync.
2. Compare recovered source with the working tree and Git history.
3. If unavailable, ask Lovable support for source + non-secret config (never secrets).
4. Save confirmed source under `supabase/functions/<name>/`, update
   `supabase/config.toml` only from confirmed configuration, and review without
   deploying.

## Related

- [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md) — full inventory,
  call-site mapping, drift analysis, secret matrix.
- [`INCIDENT_RECOVERY.md`](./INCIDENT_RECOVERY.md) — recovery basics.
