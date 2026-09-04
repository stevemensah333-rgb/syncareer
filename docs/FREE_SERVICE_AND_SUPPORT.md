# Free Service & Optional Support

**Product model (since 2026-09-04):** Syncareer is free to use. There are no
subscription tiers, no premium plan, no feature gating by payment, and no
recurring user billing. The repository (client, tests, SEO, docs) no longer
implements or communicates a paid plan.

This document supersedes the former `PAYMENT_AND_SUBSCRIPTIONS.md`.

## What the product does now

- Every product feature is available to every signed-in user without payment:
  assistant proposals, mock interviews, CV exports, career assessments,
  applications tracking, analytics and career recommendations.
- Settings exposes **Feedback** (reuses the `user_feedback` mechanism;
  whole-product entries are recorded with `feature_name = 'general'` and the
  chosen kind in `response_type`: `problem` / `improvement` / `general`) and
  **Help** (email, phone/WhatsApp, policy links — no ticket system, no invented
  knowledge base). The profile menu links to both. **Support Syncareer** appears
  in Settings and in the profile menu only when configured.
- There is no `/pricing` or `/subscription-success` route. Both redirect to `/`
  so external links keep working, and they are removed from SEO surfaces
  (sitemap, llms.txt, robots comments, page titles, analytics route enum).

## AI cost controls (legitimate infrastructure, not entitlements)

Billable AI generation still needs service protection. The server-side
`career-guidance` function keeps calling the deployed `check-feature-access`
function as a **uniform per-user quota** (e.g. assistant proposals). That quota:

- applies equally to every user — it is **not** tied to a subscription,
  tier, plan, or payment;
- is a technical service-protection control for AI spend, not a product
  entitlement;
- must never be relabelled or resold as "premium" / "free-tier" behaviour.

The client has no usage gating UI and no premium/usage access hooks.

## Optional support ("Support Syncareer")

Voluntary, one-time, and separate from the product:

- **Wording:** "Syncareer is free. If you find it useful and want to help keep
  it running, you can support the project." It is never presented as a
  subscription, membership, premium upgrade, paid feature, or requirement for
  continued access.
- **Entry points:** Settings → Support (last item of the Support group) and the
  profile account menu (all roles), plus the public landing footer ("Resources"
  group) when enabled. All three are gated by the same `isSupportEnabled()`
  check and none of them is ever labelled premium/upgrade/benefits.
- **Configuration seam:** `VITE_SUPPORT_URL` (browser-exposed) must point at a
  secure, hosted one-time payment/donation link. While unset the entry points
  are hidden. There is no payment code and no fallback URL in the client.
- **Rule:** support payments must never be used as a mechanism for feature
  access. There is no user state connected to the support link, so it cannot
  unlock anything.

**Required user configuration:** set `VITE_SUPPORT_URL` in the Lovable publish
environment to a real hosted one-time support destination (e.g. a provider
payment link). Until then the Support Syncareer entry points stay hidden. Do
not invent or commit payment URLs, product IDs, secrets, or webhook endpoints.

## Retained legacy infrastructure (do not remove without proof)

The live Lovable Cloud database still contains subscription-era relations
(`subscriptions`, `payments`, `usage_logs`, `referrals`, and related columns
such as `counsellor_sessions.payment_status` / `paystack_reference`) and
deployed-only Edge Functions (`verify-paystack-payment`, `check-feature-access`,
`admin-users` tier actions). These are retained because:

- their deployed source is not in the repository, and their live
  policies/functions are owned by Lovable Cloud;
- removal cannot be proven safe from repository evidence alone;
- RLS write restrictions on `payments` remain valid security controls while
  the tables exist.

The application no longer reads subscription state for feature access, and no
client caller of `verify-paystack-payment` remains. Database cleanup would
require an explicit, separately approved migration (never a silent remote
apply). `supabase/inspection/feature_usage_counts.sql` and
`supabase/tests/rls_authorization_matrix.sql` still reference these tables —
update or retire them in the same approved change.

## Verification

- `artifacts/syncareer/src/lib/support.test.ts` — seam disabled by default,
  enabled only with a configured URL.
- Navbar regression tests — account menu contains Feedback; contains no
  Subscription/Upgrade/Billing/premium/renewal items; support item only when
  `VITE_SUPPORT_URL` is set.
- `pages/Settings.test.tsx` — the Support destination is absent from the settings
  list until `VITE_SUPPORT_URL` is configured (matrix 1.25).
- `ApplicationInterview.test.tsx` — voice interview start is not premium-gated.

## Related

- [`AGENTS.md`](../AGENTS.md) — product-model rule ("Syncareer is free to use…").
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — trust boundaries.
- [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md) — deployed
  functions (legacy entries annotated).
- [`LEGAL_REVIEW_REQUIRED.md`](./LEGAL_REVIEW_REQUIRED.md) — outstanding legal
  confirmation for the free-service copy and the optional support seam.
