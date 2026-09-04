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
  TTS/STT, LLM). No production data or secrets are ever used by a test.

## Layer 1 — Pure unit tests (local CI)

| ID | Behavior protected | Test | Notes |
|----|--------------------|------|-------|
| 1.1 | Deterministic RIASEC scoring, normalization to 0–100, and **tie behavior** (stable order) | `assessmentConstants.test.ts` | No LLM; pure arithmetic |
| 1.2 | Deterministic CV completion (empty/whitespace/placeholders/ids/defaults = 0; documented section contributions) kept separate from deterministic quality guidance | `features/cv-builder/scoring.test.ts`, `useCVStrengthScore.test.ts` | Pure functions around CV fixtures; no ATS outcome claim |
| 1.2a | CV persistence: required fields/ownership, authenticated create/update, unauthenticated save, RLS permission error, network/database error, repeated-click coalescing, safe error copy, and full reload round-trip including Activities | `features/cv-builder/persistence.test.ts` | In-memory Supabase fake; live policy execution remains Layer 3 |
| 1.3 | Product model: feature access does not depend on subscription/plan state; account menu offers Feedback and no Subscription/Upgrade/Billing items | `Navbar.test.tsx`, `ApplicationInterview.test.tsx` | Replaces the former `featureAccess.test.ts` premium-gating coverage |
| 1.4 | Progress %, milestones, next-action ordering | `progressCalculations.test.ts` | |
| 1.5 | Auth validation contracts: email/password/name/phone, signup & login schemas | `validationSchemas.test.ts` | |
| 1.6 | Optional support seam: entry hidden until `VITE_SUPPORT_URL` is configured; support carries no feature semantics | `lib/support.test.ts` | Replaces former `subscriptionService.test.ts` |
| 1.7 | Opportunity facts: organisation fallback, work mode (remote-only evidence), eligibility labels, deadline classification (none/passed/today/closing-soon/upcoming), provenance honesty (`verified: false`, no fabricated claims), ingestion freshness, and CTA routing (external/native/tracked/source unavailable) | `features/opportunities/opportunity.test.ts` | Pure functions; no DB |
| 1.8 | Application status vocabulary & journey: labels, stage mapping, honest terminal/unknown handling, status-editor grouping, notes normalisation, context-aware next actions (missing posting / expired deadline / no CV / offer outcome) | `features/application-tracker/workflow.test.ts` | Pure functions; no DB |
| 1.9 | Tracker write seam: create-on-first-track, per-user duplicate detection, unique-violation race → alreadyTracked, status/notes updates (blank → null), remove, and error classification (auth-expired / permission / network / server) with no internal leakage | `features/application-tracker/tracking.test.ts` | In-memory fake table; asserts emitted RLS scoping |
| 1.10 | Opportunity preview progressive disclosure: no hover surface on touch devices; hover/focus reveals factual deadline, source, provenance and next action without a fabricated match score; tracked state; expired-deadline warning | `components/opportunities/OpportunityPreview.test.tsx` | happy-dom; gated by `(hover: hover) and (pointer: fine)` |
| 1.11 | Application detail sheet: full context (status, journey, deadline, CV, practice, notes), missing-posting banner, unknown status, expired deadline, CV-creation recommendation, CV-load failure, note save, delete confirmation, outcome copy | `components/applications/ApplicationDetailSheet.test.tsx` | happy-dom + MemoryRouter |
| 1.12 | Application workspace: durable snapshot fallback, owner-filtered link choices, next-action due semantics, explicit CV linking, failed-note draft/retry, desktop workspace, deep links, keyboard selection and mobile tabs/back | `features/application-tracker/workspace.test.ts`, `components/applications/ApplicationWorkspaceDetail.test.tsx`, `pages/ApplicationTracker.test.tsx` | Accepted migration contract; live RLS remains Layer 3 |
| 1.13 | Job-specific CV AI boundary: requirement extraction, request-scoped evidence, supported/partial/unsupported/unclear matching, typed request construction, evidence/requirement references, unsupported metric/employer/skill/category checks, editable review, accept/reject/regenerate/undo, and upload-response validation | `features/cv-builder/guidance.test.ts`, `features/cv-builder/aiOperations.test.ts`, `features/cv-builder/aiProposal.test.ts`, `components/cv-builder/CVAIAssistant.test.tsx`, `hooks/useCVAnalysis.test.ts` | Revised tracked function requires Lovable deployment; live prose remains unverified |
| 1.14 | Interview setup context and readiness: no RIASEC mapping, factual listing prefill, denied/missing/failed microphone classification | `features/interview/setup.test.ts` | Browser media and deployed quota remain manual/integration checks |
| 1.15 | Interview lifecycle: distinct accessible phase labels, paused/reconnecting/ended semantics, media/audio/listener cleanup, no retry of ambiguous billable start, question/answer evidence pairing, partial transcript report, qualitative rubric and non-fabricated retry outline | `features/interview/lifecycle.test.ts`, `features/interview/sessionReport.test.ts`, `components/interview/VoiceInterviewMode.test.tsx` | Real browser speech APIs and deployed AI remain manual/integration checks |
| 1.16 | Contextual assistant: minimum explicit context, local size validation, removable personal context chips, strict task-kind/source validation, no-op/malformed rejection, 30-second timeout, 401/402/429 mapping, accept/reject/undo, legacy-route transition, navigation removal, keyboard and narrow drawer | `features/contextual-assistant/contract.test.ts`, `components/assistant/ContextualAssistantDrawer.test.tsx`, `pages/AICoach.test.tsx`, layout navigation tests | Base v2 was previously deployed; revised CV grounding requires Lovable redeployment |
| 1.17 | Assessment direction: unchanged 45-question RIASEC scoring, incomplete/out-of-range rejection, opt-in answer-free lifecycle events, honest unsupported resume state, role-family prioritise/deprioritise/dismiss, explicit opportunity search, no RIASEC-to-role mapping, labelled radio groups | `pages/assessment/assessmentConstants.test.ts`, `features/assessment/lifecycle.test.ts`, `features/assessment/roleFamilies.test.ts`, `components/assessment/AssessmentQuestionCard.test.tsx`, landing tests | Draft resume requires the separately approved schema/RLS proposal |
| 1.18 | Evidence domain foundation: row validation (categories/statuses/source shapes), derived support status (draft/needs_source/supported/archived; never implies external verification), deterministic CV/interview suggestion candidates (read-only, no backfill), requirement→evidence thread view model with usage flags and coverage, API seam input validation + error taxonomy (auth-expired/permission/network/server) and zod validation of every response | `features/evidence/validation.test.ts`, `features/evidence/supportStatus.test.ts`, `features/evidence/suggestions.test.ts`, `features/evidence/dossierViewModel.test.ts`, `features/evidence/api.test.ts` | Migration `20260903000000` pending live application; generated-type regeneration via Lovable is tracked in `SCHEMA_RECONCILIATION.md` |
| 1.19 | Application dossier page: canonical route render (brief, factual stage rail, all sections), saved-note hydration, not-found/ownership states, detached-posting warning, mobile section navigation with a single active section, evidence ledger stamps and derived usage | `pages/ApplicationDossier.test.tsx` | happy-dom; mocked Supabase (wire-shaped evidence responses) |
| 1.20 | Dossier index: canonical-route navigation from rows, legacy `?application=` redirect preserving `q`/`stage`, stage filters, keyboard navigation, detached-posting flag, error/permission/empty states | `pages/ApplicationTracker.test.tsx`, `components/layout/AppSidebar.test.tsx` | Sidebar current-dossier link targets the canonical route |
| 1.21 | Application CV editor: explicit creation gate (no silent clone; RPC not called without an explicit choice), linked-copy load into the shared workspace, evidence shelf/requirement inspector presence, base-CV safety (`saveCvRow` never inserts or touches the primary row) | `pages/ApplicationCVEditor.test.tsx`, `features/cv-builder/persistence.test.ts` | Shared workspace behaviour stays covered by existing CV component tests |
| 1.22 | Application interview: dossier-derived role context, requirement coverage list, not-found state, standalone simulator unchanged | `pages/ApplicationInterview.test.tsx`, `features/interview/*.test.ts`, `components/interview/VoiceInterviewMode.test.tsx` | Completed-answer suggestions require explicit confirmation (enforced in `features/evidence` tests) |

## Layer 2 — Auth & onboarding contract tests (local CI)

| ID | Behavior protected | Test | Notes |
|----|--------------------|------|-------|
| 2.1 | Email sign-up contract: `signUp({email,password,options:{data:{full_name,user_type},emailRedirectTo}})` + welcome email + redirect | `signUpForm.test.ts` | Happy-dom; mocked supabase |
| 2.2 | Email sign-in contract: `signInWithPassword({email,password})`, safe protected-route return intent, generic invalid-credential copy, pending/duplicate protection, autocomplete, and password visibility | `signInForm.test.tsx`, `authFlows.test.tsx`, `authUtils.test.ts` | Happy-dom; mocked Supabase; no production credentials |
| 2.3 | Reset-password contract + password-strength rules | `validationSchemas.test.ts` / `ResetPasswordForm.test.ts` | |
| 2.4 | **Lovable Google OAuth session handoff boundary**: calls `lovable.auth.signInWithOAuth('google', {redirect_uri})`, consumes `redirected` / `error` / tokens into a Supabase session, coalesces duplicate clicks, validates local return intent, and exposes cancellation/timeout recovery | `googleSignInContract.test.tsx`, `OAuthReturnState.test.tsx`, `authUtils.test.ts` | Mocked Lovable + Supabase; remote provider configuration is not exercised |
| 2.5 | Student vs counsellor onboarding selection is preserved into `user_type` metadata | `signUpForm.test.ts` | Role-route UX |
| 2.5a | Password recovery uses enumeration-neutral confirmation, the configured reset destination, an expired/missing recovery-session state, and a new-link recovery action | `authFlows.test.tsx` | Mocked Supabase; email delivery is not exercised |
| 2.5b | Signed-out route protection preserves the requested local location for later safe redirect | `ProtectedRoute.test.tsx` | Memory router; route guard is UX only |
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
| 3.10 | Legacy payment **write restrictions** (client inserts only `status='pending'`) — retained while the legacy `payments` table exists | same |
| 3.11 | Storage **video ownership** (owner-folder read only; no public bucket policy) | same |
| 3.12 | SECURITY DEFINER functions not executable by `anon`; only explicitly granted roles | `schema_rls_smoke.sql` (existing) |
| 3.13 | **Evidence tables**: RLS on all five relations, owner SELECT-only policies (no direct client writes), 14 SECURITY DEFINER operations not executable by `anon`, application-CV exclusivity trigger, 8 composite owner-matched FKs | `supabase/tests/evidence_dossier_rls.sql` (part 1) |
| 3.14 | **Evidence behavior on a disposable restore**: idempotent requirement import (explicit skills only), cross-tenant evidence/source/CV/interview references rejected, confirm→needs_source derivation, archived evidence cannot be linked or edited, idempotent application-CV creation returning one linked copy, base CV unaffected by application-CV edits, exclusive single-application link, rollback replay | `supabase/tests/evidence_dossier_rls.sql` (part 2, scripted checklist) + `supabase/rollback/evidence_dossier_rollback.sql` |

## Layer 4 — Edge-function contract tests (isolated Deno; NOT local CI)

These exercise **deterministic contracts** only — never exact LLM prose.

| ID | Behavior protected | Note |
|----|--------------------|------|
| 4.1 | ~~`verify-paystack-payment`~~ **Legacy (no client caller).** No in-repo contract remains; decommissioning requires an owner-approved live-project change | Deployed-only; source not in repo |
| 4.2 | `check-feature-access`: server-side uniform per-user AI quota (cost control) + increment | Deployed-only; covered indirectly by `features/contextual-assistant/contract.test.ts` and career-guidance contract tests |
| 4.3 | `delete-account`: owner-only deletion contract | Deployed-only; frontend contract in `Settings.tsx` |
| 4.4 | `mock-interview` / `interview-tts`: state-machine stub, retry/backoff, cleanup, and ambiguous-start duplicate-billing guard; **LLM prose excluded** | Covered by deterministic retry/backoff + phase/resource contract tests |
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
| 5.3 | Save/reopen CV (completion + quality + create/update/failure/repeated-click states) | `features/cv-builder/scoring.test.ts`, `features/cv-builder/persistence.test.ts`, `useCVStrengthScore.test.ts` |
| 5.4 | Start a permitted interview via a deterministic stub | `interviewContract.test.ts` (retry/backoff + phase) |
| 5.5 | Book/cancel a counsellor session | SQL (Layer 3.9) + `counsellor` booking contracts |
| 5.6 | External job → source handoff remains non-mutating → explicit `I applied` → tracker row created (duplicate-safe) | `pages/Markets.test.tsx`, Layer 1.9 (`tracking.test.ts`) |
| 5.7 | Status update / outcome recording on a tracked application (progress + terminal) | Layers 1.8–1.9, 1.11 |
| 5.8 | Save/unsave an opportunity (visible state, optimistic update, rollback and duplicate-click coalescing) | `pages/Markets.test.tsx`, Layer 1.10 |
| 5.9 | Application empty / expired-deadline / permission / partial-data states | Layers 1.7–1.11 (facts, seam errors, detail-sheet partial states); page-level render not asserted in local CI (see gaps) |

## What remains unverified (documented gaps)

- **Live RLS behavior** is only statically asserted; it must be run against an isolated
  restore to be proven (no live Supabase instance in CI).
- **Deployed edge-function logic** (`verify-paystack-payment` (legacy), `check-feature-access`,
  `delete-account`, `mock-interview`, `interview-tts`) is not in the repository; only its
  caller-facing contract is tested. Recover exact deployed source before deeper testing.
- **LLM output quality** (interview feedback prose, career-guidance text) is intentionally
  not tested.
- **Browser-level E2E** is not run locally; covered by integration tests until a browser
  driver is added.
- **Page-level render of Opportunities / Application Tracker** (loading skeletons, empty
  states, error cards, deep-link handling) is implemented but not asserted by a dedicated
  page test; the underlying states are exercised at the seam and component level
  (Layers 1.7–1.11). The `saved_jobs` toggle itself is only covered through the page, not
  in isolation.

## Failure policy

Critical authorization and product-model regressions fail the relevant layer:
- Product model: if subscription/premium gating is reintroduced (or the profile menu
  regains plan/billing items), the Navbar/ApplicationInterview/support tests fail.
- Authorization: if ownership/RLS breaks, `rls_authorization_matrix.sql` fails.
- Role immutability/privacy: if a user can escalate a role or read others' data, the RLS SQL
  and profile policy tests fail.
