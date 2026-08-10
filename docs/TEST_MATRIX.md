# Syncareer Test Matrix

Protects business behavior, not coverage numbers. This matrix states **what is protected**
and **what remains unverified**, and where each layer runs. It was written before the test
suite below was implemented so each test has an explicit intent.

## Operating model

- **Local CI layer** (`pnpm test` → `vitest run`): pure unit tests and deterministic
  integration tests that run on every push without secrets or a live backend. This is the
  layer CI is wired to run.
- **Isolated-environment layers** (database/RLS, edge-function contract, browser E2E):
  require a live Supabase restore, a Deno runtime, or a browser driver. They are provided as
  runnable scripts/plans but are **not** run by the local CI because this CI has no such
  backend. The matrix marks them accordingly and they are expected to run in an isolated,
  throwaway environment before a release.
- **Fakes around external providers** are used everywhere (Lovable auth, Supabase client,
  Paystack, TTS/STT, LLM). No production data or secrets are ever used by a test.

## Layer 1 — Pure unit tests (local CI)

| ID | Behavior protected | Test | Notes |
|----|--------------------|------|-------|
| 1.1 | Deterministic RIASEC scoring, normalization to 0–100, and **tie behavior** (stable order) | `assessmentConstants.test.ts` | No LLM; pure arithmetic |
| 1.2 | Deterministic CV strength score + label bands | `useCVStrengthScore.test.ts` | Pure functions around CV fixtures |
| 1.3 | Feature-access gating: free limits, premium-only features | `featureAccess.test.ts` (existing) | |
| 1.4 | Progress %, milestones, next-action ordering | `progressCalculations.test.ts` | |
| 1.5 | Auth validation contracts: email/password/name/phone, signup & login schemas | `validationSchemas.test.ts` | |
| 1.6 | Subscription access gating (`isPremiumUser`), active/expired/canceled tiers | `subscriptionService.test.ts` | Deterministic fakes around `subscriptions` |

## Layer 2 — Auth & onboarding contract tests (local CI)

| ID | Behavior protected | Test | Notes |
|----|--------------------|------|-------|
| 2.1 | Email sign-up contract: `signUp({email,password,options:{data:{full_name,user_type},emailRedirectTo}})` + welcome email + redirect | `signUpForm.test.ts` | Happy-dom; mocked supabase |
| 2.2 | Email sign-in contract: `signInWithPassword({email,password})` + navigation | `signInForm.test.ts` | Happy-dom; mocked supabase |
| 2.3 | Reset-password contract + password-strength rules | `validationSchemas.test.ts` / `ResetPasswordForm.test.ts` | |
| 2.4 | **Lovable Google OAuth session handoff boundary**: calls `lovable.auth.signInWithOAuth('google', {redirect_uri})`, consumes `redirected` / `error` / tokens into a Supabase session | `googleSignInContract.test.ts` | Mocked Lovable + supabase |
| 2.5 | Student vs counsellor onboarding selection is preserved into `user_type` metadata | `signUpForm.test.ts` | Role-route UX |
| 2.6 | Role-route behavior is **UX only** — server authorization is enforced by RLS (Layer 3), not tested here | — | Documented boundary |

## Layer 3 — Database / RLS integration (isolated Supabase DB; NOT local CI)

Runnable against an isolated verified-schema restore. Not wired into local CI.

| ID | Behavior protected | Assertion location |
|----|--------------------|--------------------|
| 3.1 | **anon** access: cannot read profiles/payments/subscriptions/resumes/assessments; cannot change role | `supabase/tests/rls_authorization_matrix.sql` |
| 3.2 | **authenticated / other user**: cannot read or mutate another user's private rows | same |
| 3.3 | **student**: can read only own resumes/assessments/applications; cannot see counsellor private data | same |
| 3.4 | **counsellor**: can read own counsellor details/sessions/availability; cannot read student private data | same |
| 3.5 | **admin/service_role**: exclusive access to payment fields and admin tables | same |
| 3.6 | Profile **privacy**: public view only exposes counsellor rows; `referral_code` column not readable by `authenticated`/`anon` | same |
| 3.7 | Role **immutability**: `user_type` cannot be changed after insert; INSERT limited to `NULL`/`student` | same |
| 3.8 | Resume/assessment/application **ownership** (RLS `user_id` checks) | same |
| 3.9 | Counsellor **booking/session visibility** and permitted state changes (client may only cancel; payment fields service-role only) | same |
| 3.10 | Payment/subscription **write restrictions** (client inserts only `status='pending'`; cannot grant premium) | same |
| 3.11 | Storage **video ownership** (owner-folder read only; no public bucket policy) | same |
| 3.12 | SECURITY DEFINER functions not executable by `anon`; only explicitly granted roles | `schema_rls_smoke.sql` (existing) |

## Layer 4 — Edge-function contract tests (isolated Deno; NOT local CI)

These exercise **deterministic contracts** only — never exact LLM prose.

| ID | Behavior protected | Note |
|----|--------------------|------|
| 4.1 | `verify-paystack-payment`: confirms provider status, amount, currency, plan, ownership, replay/idempotency before granting premium | Deployed-only; source not in repo. Contract asserted via `PaystackButton` verification boundary test. |
| 4.2 | `check-feature-access`: server-side usage enforcement + increment | Deployed-only; covered indirectly by `featureAccess.test.ts` + `useAICoachAccess.test.ts` |
| 4.3 | `delete-account`: owner-only deletion contract | Deployed-only; frontend contract in `Settings.tsx` |
| 4.4 | `mock-interview` / `interview-tts`: state-machine stub, retry/backoff; **LLM prose excluded** | Covered by deterministic retry/backoff + phase contract tests |
| 4.5 | Email queue RPCs restricted to `service_role` | SQL-level (Layer 3.5) |

## Layer 5 — Minimal E2E (browser driver not installed; NOT local CI)

A full browser E2E suite would require a browser driver (e.g. Playwright), which is not
installed and is deliberately not added under the "do not add many test frameworks"
constraint. The deterministic journeys below are instead exercised at the integration
level in `happy-dom`:

| ID | Journey | Covered by |
|----|---------|-----------|
| 5.1 | Sign in → onboarding (student) | `signUpForm`/`signInForm` tests |
| 5.2 | Complete assessment (deterministic scoring) | `assessmentConstants.test.ts` |
| 5.3 | Save CV (deterministic strength) | `useCVStrengthScore.test.ts` |
| 5.4 | Start a permitted interview via a deterministic stub | `interviewContract.test.ts` (retry/backoff + phase) |
| 5.5 | Book/cancel a counsellor session | SQL (Layer 3.9) + `counsellor` booking contracts |

## What remains unverified (documented gaps)

- **Live RLS behavior** is only statically asserted; it must be run against an isolated
  restore to be proven (no live Supabase instance in CI).
- **Deployed edge-function logic** (`verify-paystack-payment`, `check-feature-access`,
  `delete-account`, `mock-interview`, `interview-tts`) is not in the repository; only its
  client-facing contract is tested. Recover exact deployed source before deeper testing.
- **LLM output quality** (interview feedback prose, career-guidance text) is intentionally
  not tested.
- **Browser-level E2E** is not run locally; covered by integration tests until a browser
  driver is added.

## Failure policy

Critical authorization and revenue regressions fail the relevant layer:
- Revenue: if payment/subscription gating breaks, `subscriptionService.test.ts`,
  `featureAccess.test.ts`, and the RLS payment SQL fail.
- Authorization: if ownership/RLS breaks, `rls_authorization_matrix.sql` fails.
- Role immutability/privacy: if a user can escalate a role or read others' data, the RLS SQL
  and profile policy tests fail.
