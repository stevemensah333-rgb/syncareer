# Payment & Subscription Trust Flow

Payments are revenue-critical: **only the server may grant premium access**.
A browser-only check is not a security control.

## Actors

- **Client (browser)** — starts a Paystack checkout; holds only the public key.
- **Paystack** — payment provider; verifies transactions and calls webhooks.
- **`verify-paystack-payment` edge function** — the only code that turns a
  payment into an active subscription.
- **`subscriptions` / `payments` tables** — RLS-restricted to the owner for
  reads; writes that grant premium are server-only.

## Client boundary

`PaystackButton.tsx`:
1. Requires a signed-in user (`supabase.auth.getUser`).
2. Requires `VITE_PAYSTACK_PUBLIC_KEY` (public key only).
3. Opens Paystack inline checkout for a plan (`monthly`/`yearly`,
   `PAYSTACK_PLAN_CODES`), currency `GHS`, with `user_id` + `plan` in metadata.
4. On success, calls the edge function with `{ reference, plan }` and shows the
   result. The button never trusts Paystack's client callback to grant access.

## Server boundary (`verify-paystack-payment`)

The edge function (deployed-only) must, before granting access:

1. Authenticate the caller (JWT).
2. Confirm **provider status** (transaction verified with Paystack).
3. Confirm **amount** and **currency** match the requested plan.
4. Confirm the **plan** (monthly/yearly) matches the requested plan.
5. Confirm **ownership** — the Paystack customer/email belongs to the caller.
6. Enforce **idempotency / replay protection** — the same reference cannot be
   redeemed twice.
7. Only then insert/update an active premium `subscriptions` row.

Because this function's source is deployed-only, the repository can only verify
the client boundary and the DB write restrictions:

- `subscriptionService.isPremiumUser` (unit-tested) enforces that only an
  **active**, **unexpired** `premium` subscription returns true.
- `featureAccess.hasAccess` / `check-feature-access` (unit-tested) gate features
  by tier and usage limits.
- RLS: `payments` INSERT by a client is restricted to `status = 'pending'` for
  the caller (`supabase/tests/rls_authorization_matrix.sql`). A client cannot
  self-grant an active subscription through direct table writes.

## Trust diagram

```
Browser (Paystack checkout, public key only)
   │  reference
   ▼
verify-paystack-payment (JWT, service_role)  ──►  Paystack API (verify status/amount/currency)
   │  idempotency + ownership checks
   ▼
subscriptions (active premium)  ──►  isPremiumUser / feature access (server-side gates)
```

- Premium is **granted only** after step 2–6 above succeed.
- **Payment write restrictions** are enforced by RLS + the edge function, never
  by the client.

## Verification / tests

- `artifacts/syncareer/src/services/subscriptionService.test.ts` — revenue gating
  (active/expired/canceled/free).
- `artifacts/syncareer/src/lib/featureAccess.test.ts` + `useAICoachAccess.test.ts`
  — feature-usage enforcement.
- `supabase/tests/rls_authorization_matrix.sql` — payment write restrictions.

## Related

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — trust boundaries.
- [`EDGE_FUNCTIONS.md`](./EDGE_FUNCTIONS.md) — `verify-paystack-payment` is deployed-only.
- [`TEST_MATRIX.md`](./TEST_MATRIX.md) — what is protected vs. unverified.
