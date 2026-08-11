# Current product state baseline

Baseline date: 2026-08-11  
Repository state inspected: `main` at `f0856c39a9203b04512dd8e14d4f44e210272ade`

## Scope and evidence rules

This is a read-only baseline of the current frontend built from `artifacts/syncareer`. It describes code and tests at the commit above; it does not treat archived plans, screenshots, generated database types, or a successful build as proof of runtime behavior.

Evidence labels used below:

- **Browser-observed**: exercised against a locally served production build without credentials.
- **Fixture-verified**: exercised by the current Vitest/Testing Library suite with mocked Supabase or browser APIs.
- **Code-verified**: directly established from current route, component, hook, or caller code, but not exercised against a live backend.
- **Unverified**: depends on Lovable Cloud, deployed Edge Function source, RLS/storage policy, OAuth-provider configuration, Paystack, PostHog delivery, browser media APIs, or data that is not safely available locally.

No production credentials were used or printed. No remote API, database, function, storage, OAuth, payment, analytics, email, or configuration mutation was performed.

## Routing, guards, layouts, and navigation

`src/App.tsx` is the route source of truth. `AuthProvider` reads Supabase Auth session state. `ProtectedRoute` waits for auth and profile loading, then redirects signed-out visitors to `/sign-in` while preserving the attempted location. `RoleRoute` sends missing or incomplete profiles to `/onboarding`; completed users of the wrong role go to their role home. These are UX guards only; repository evidence cannot prove deployed RLS.

Signed-in student pages use `StudentLayout`/`PageLayout`. Desktop navigation comes from `studentNavGroups` in `AppSidebar.tsx`; mobile navigation is separately declared in `components/layout/MobileBottomNav.tsx`. Desktop exposes Home, Opportunities, Applications, Practice, CV Builder, Interview Simulator, SynAI, and Settings. Mobile exposes Home, Opportunities, Applications, then Practice, CV Builder, SynAI, and Settings under More; it does not expose Interview Simulator directly. Counsellor navigation exposes Profile, Availability, Sessions, Clients (desktop only), and Settings.

No feature-flag framework was found. Access variation is driven by authentication, `profiles.user_type`, `profiles.onboarding_completed`, subscription state, and server/client feature-usage checks. `/assessment` is intentionally public. `/pricing`, `/subscription-success`, and `/reset-password` are also public routes.

## Route and experience inventory

Each entry records the requested nine fields in a compact, repeatable form.

### `/` — landing page

1. **User goal:** understand Syncareer's opportunity-to-application journey and start the assessment or sign in.
2. **Primary object:** public product story; no user-owned object.
3. **Data/ownership:** static React content and SEO metadata; authenticated redirect uses the current Supabase session and `profiles.id = auth user id`.
4. **Reality:** **real** static experience. Signed-in users redirect to onboarding or their role home. **Fixture-verified** routing and acquisition CTA.
5. **States:** explicit `Loading Syncareer…` while auth resolves or while a signed-in redirect is pending; no data empty/error state.
6. **Keyboard/mobile:** skip link, labelled navigation, keyboard-operable FAQ, and responsive header are fixture-covered; full device/browser audit is unverified.
7. **Dependencies:** Supabase Auth/profile for redirect; SEO helpers. No Edge Function, storage, Paystack, or route-level PostHog call.
8. **Known defect/claim:** marketing prose and claims are code-present but not independently verified by this audit.
9. **Tests:** `pages/Landing.test.tsx`, `components/landing/LandingContent.test.tsx`, `lib/seo.test.ts`.

### `/sign-in/*`, `/sign-up/*`, `/sign-in/forgot-password`, `/reset-password`, OAuth return

1. **User goal:** create or access an account, recover access, or establish a Google session.
2. **Primary object:** Supabase Auth user/session plus auth metadata (`full_name`, `user_type`).
3. **Data/ownership:** Supabase Auth owns credentials/session; browser stores the session through the configured Supabase client. Signup metadata seeds later profile/onboarding behavior.
4. **Reality:** email sign-in/signup/reset callers are **real, code-verified**; provider/email delivery is unverified. Google OAuth is **real, fixture-verified at the SDK handoff**. Lovable OAuth retains `window.location.origin` as its configured return, while the landing route presents an explicit callback progress/recovery state and returned tokens are passed to `supabase.auth.setSession`.
5. **States:** forms use inline pending and mapped error states with in-flight request guards. Signup presents pending email confirmation without asserting that an account exists. Forgot-password has an enumeration-neutral sent state. Reset-password checks for a recovery session before showing password inputs and offers a new-link path when invalid or expired. OAuth return has progress, provider cancellation/error recovery, and a 10-second timeout.
6. **Keyboard/mobile:** semantic forms, visible labels, required inputs, password-manager autocomplete, named password visibility controls, buttons and links; compact responsive shell with global reduced-motion handling. Automated accessible-name checks exist; real assistive-technology verification remains unverified.
7. **Dependencies:** Supabase Auth; signup invokes `send-transactional-email` fire-and-forget; Google uses Lovable Cloud Auth.
8. **Known defect/claim:** live successful email delivery, recovery-link exchange, OAuth callback, and provider configuration remain unverified. The welcome-email failure cannot fail signup and is only warned to console.
9. **Tests:** `components/auth/signInForm.test.tsx`, `signUpForm.test.tsx`, `authFlows.test.tsx`, `authUtils.test.ts`, `googleSignInContract.test.tsx`, `OAuthReturnState.test.tsx`, `ProtectedRoute.test.tsx`, and `lib/auth.test.tsx`.

Lovable classification: `@lovable.dev/cloud-auth-js` and `src/integrations/lovable/index.ts` are **ACTIVE PLATFORM DEPENDENCY** for Google OAuth. The wrapper remains unchanged; its button call site now adds only local safe-return and recovery presentation.

### `/onboarding`

1. **User goal:** finish the role-specific profile required to enter the signed-in product.
2. **Primary object:** `profiles` plus `student_details` or `counsellor_details`.
3. **Data/ownership:** session user id; `profiles.id`, `student_details.user_id`, and `counsellor_details.user_id` are written from that id. RLS is the authorization authority but was not live-verified.
4. **Reality:** **real, code-verified** create/update flow. Role comes from profile or auth metadata. First-visit welcome state is per-user `localStorage`.
5. **States:** initial loading shell; validation toasts; role-specific fields; save state; caught error toast. Already-onboarded users redirect home. Unknown/empty role renders generic copy but no visible role selector in the inspected onboarding implementation, so completion may be inaccessible if both profile and metadata lack `user_type`.
6. **Keyboard/mobile:** labelled controls and responsive grids; select/touch behavior not browser-verified.
7. **Dependencies:** Supabase Auth/PostgREST; localStorage. No Edge Function/storage/payment/analytics caller.
8. **Known defect/claim:** live trigger/profile creation and RLS are unverified; missing-role recovery appears incomplete.
9. **Tests:** onboarding schemas have coverage in `lib/validationSchemas.test.ts`; no route-level onboarding test.

### `/assessment`

1. **User goal:** when still choosing a direction, complete the 45-question assessment to explore interest themes, work environments and broad role families.
2. **Primary object:** guest in-memory result or owned `assessments` plus `assessment_responses`.
3. **Data/ownership:** authenticated records use `user_id = session.user.id`; guest answers/results remain React state and are not persisted.
4. **Reality:** the canonical 45-question scorer is unchanged and **fixture-verified**; authenticated completed-result load/save is **code-verified**. After save, `compute-user-intelligence` is invoked best-effort. Result role families are investigation prompts, can be prioritised/deprioritised/dismissed locally, and link to an explicit opportunity search; no result silently writes a job title or industry.
5. **States:** auth/result loading, section/page progress, complete-response validation, submitting, results/history/retake gating, role-family correction and guest sign-up. Save/resume is not implemented; the UI explicitly says unfinished answers clear on refresh/navigation and `ASSESSMENT_DRAFT_PROPOSAL.md` records the safe design.
6. **Keyboard/mobile:** each question uses a fieldset/legend and labelled five-option radio group with 44px rows; responsive charts/layout remain. Chart screen-reader and real mobile-browser behavior remain manual.
7. **Dependencies:** Supabase Auth/PostgREST; `compute-user-intelligence`; optional PostHog lifecycle events only after explicit assessment-specific consent. Events contain counts/timing, never answers or themes.
8. **Known defect/claim:** RIASEC describes interests, not skill, readiness, employability, guaranteed fit or hiring probability. Role-family corrections are session-local because no approved explicit-preference schema exists. Live analytics enablement, deployed function and RLS behavior remain unverified.
9. **Tests:** scoring/incomplete-response tests, `features/assessment/lifecycle.test.ts`, `features/assessment/roleFamilies.test.ts`, `components/assessment/AssessmentQuestionCard.test.tsx`, and landing entry tests. No live authenticated submission or full browser route test.

### `/dashboard`

1. **User goal:** see current career progress and the next useful action.
2. **Primary object:** aggregate of profile, latest assessment, applications, saved jobs, primary CV, and interviews.
3. **Data/ownership:** `assessments.user_id`, `saved_jobs.user_id`, `resumes.user_id`, `mock_interviews.user_id`, and `job_applications.applicant_id` all scope to the session user.
4. **Reality:** **real, code-verified** Supabase aggregation; no invented fixture cards in production code.
5. **States:** skeleton loading; explicit fresh-user empty state; derived focus, attention, onboarding, recent application, and next-action states. Query errors are logged together and the page continues with whatever/empty data resolved; there is no page-level retry/error panel.
6. **Keyboard/mobile:** action components use links/buttons and have component coverage; responsive signed-in layout. Full keyboard order/mobile browser pass unverified.
7. **Dependencies:** Supabase Auth/PostgREST and profile context. No direct Edge Function/storage/payment caller.
8. **Known defect/claim:** partial query failures may look like genuine empty data. Dashboard page integration itself has no focused test.
9. **Tests:** dashboard `home/*` component tests, `features/application-tracker/workflow.test.ts`, CV scoring/persistence tests; no `Dashboard.tsx` route test.

### `/opportunities` — opportunities, saved jobs, and opportunity detail

1. **User goal:** find a role, inspect provenance/details, save it, or begin tracking an application.
2. **Primary object:** `job_postings`, with user-owned `saved_jobs` and `job_applications` overlays.
3. **Data/ownership:** active jobs are shared; saves use `saved_jobs.user_id`; application ownership is `job_applications.applicant_id`. No profile-based relevance ranking is performed.
4. **Reality:** **real and fixture-verified** newest-ingested list/detail/save/tracking UI. It is labelled “Latest opportunities,” not curated or recommended. Saved jobs are a tab, not `/saved-jobs`. The selected job and filters are shareable URL parameters; desktop uses an adjacent detail pane and mobile uses list → detail. External source handoff never creates an application: the separate `I applied` action does. Save is optimistic with rollback and duplicate-request coalescing.
5. **States:** list skeletons; retryable generic/network error; non-retry permission/session messages; initial-empty, no-saves, filtered-empty, partial-overlay, missing-field, stale-ingestion and source-link-unavailable states; detail placeholder when nothing is selected; per-row saving/tracking states and toasts.
6. **Keyboard/mobile:** list rows support Arrow Up/Down, Home and End; essential save/applied state is visible without hover; previews remain supplemental; mobile has an explicit back action. Fixture coverage includes filters, keyboard selection, mobile navigation and accessible filter names. Real-device/browser verification remains outstanding.
7. **Dependencies:** Supabase Auth/PostgREST/RLS assumptions. No Edge Function/storage/Paystack/PostHog call.
8. **Known defect/claim:** `created_at`/`updated_at` prove Syncareer ingestion timing only, not source publication or continued availability. Source publication time is not currently captured. External posting freshness and live RLS remain unverified.
9. **Tests:** `pages/Markets.test.tsx`, `components/opportunities/OpportunityPreview.test.tsx`, `features/opportunities/opportunity.test.ts`, application tracking tests.

### `/applications` — application workspace

1. **User goal:** work on one application at a time: understand the role, set the next action, link the submitted CV, prepare for interview, retain notes, and deliberately update stage/outcome.
2. **Primary object:** owned `job_applications`, with optional joined `job_postings`, owner-matched `resumes`, and owner-matched `mock_interviews`.
3. **Data/ownership:** every query and workspace write includes the authenticated owner as client-side defence in depth. RLS and the accepted composite résumé/interview foreign keys remain authoritative.
4. **Reality:** **fixture-verified against the accepted migration contract**. Desktop is list/centre/right; mobile is list/full-detail with Overview, CV, Practice and Notes tabs. `?application=<id>` remains stable through refresh/back. Durable snapshots supply role facts after posting deletion. Stage and outcome remain the approved eight-value `status` domain; there is no separate outcome column or automatic coupling.
5. **States:** skeleton, retryable load failure, permission/session failure, empty/no-match, missing posting, no CV, no practice, no next action, overdue/today/upcoming due date, and saving/saved/failed/retry notes/workspace states.
6. **Keyboard/mobile:** Arrow Up/Down, Home and End select list rows; mobile has an explicit back action and section tabs. Real-device verification remains outstanding.
7. **Dependencies:** Supabase Auth/PostgREST only. No Edge Function, storage, payment, analytics, email, or counsellor query is initiated by this route.
8. **Known defect/claim:** the accepted migrations are proposal-only in this worktree and generated Supabase types intentionally remain stale until supported regeneration after migration application. The workspace requires that separately approved remote step before its new columns work against Lovable Cloud.
9. **Tests:** `pages/ApplicationTracker.test.tsx`, `ApplicationWorkspaceDetail.test.tsx`, `workspace.test.ts`, `tracking.test.ts`, `workflow.test.ts`, plus accepted SQL integrity/RLS tests.

### `/cv-builder`

1. **User goal:** create/load/edit/save/preview/export a primary CV, optionally tailored from application query context.
2. **Primary object:** latest owned primary `resumes` row plus derived `user_skills`.
3. **Data/ownership:** `resumes.user_id = session.user.id`; load/update is explicitly user-scoped. The primary resume id is remembered after load/save. Application query parameters provide context only; no CV version is linked to an application.
4. **Reality:** create/load/update/save and round-trip mapping are **fixture-verified**. Preview always renders the current local draft. PDF export uses a bounded internal draft render and refuses a 0%-complete placeholder document; opening Preview is not a prerequisite. Job skills are evidence prompts, never automatic claims. AI responses must parse as field-specific before/after/rationale proposals and require explicit acceptance; invalid/generic responses change nothing. Existing-file upload explicitly discloses AI processing, then maps reviewed data into the unsaved editor; no CV file is placed in Storage by this route.
5. **States:** load skeleton; blocking load-failure/retry that prevents overwriting an unseen copy; new empty editor; saved/unsaved/saving/failed live status; accessible validation summary plus inline errors; before-unload warning; preview modal; export progress/error; analysis upload/error; AI accept/reject and single-step undo.
6. **Keyboard/mobile:** labelled fields, tabs, buttons and dialog; horizontally scrollable tabs and responsive grid. Modal focus trapping, PDF layout, mobile editing, and before-unload behavior are not real-browser verified.
7. **Dependencies:** Supabase Auth/PostgREST; `analyze-portfolio`, `cv-ai-assistant`, and post-save `compute-user-intelligence` Edge Functions; `html2pdf.js`. No route storage/Paystack/PostHog call.
8. **Known defect/claim:** repository evidence does not verify a unique `(user_id,is_primary)` constraint; persistence deliberately avoids assuming one. The deployed AI function's ability to follow the stricter proposal format, PDF fidelity, RLS, sortable repeated-row UI across every section, and application-specific CV versioning remain unverified/incomplete.
9. **Tests:** `features/cv-builder/persistence.test.ts`, scoring tests, `aiProposal.test.ts`, `hooks/useCVStrengthScore.test.ts`, `components/cv-builder/CVStrengthScore.test.tsx`; no full page/export browser test.

### `/interview-simulator` — setup, session, report, history

1. **User goal:** configure and complete a voice interview, receive feedback, and review/remove past sessions.
2. **Primary object:** owned `mock_interviews`, configured from an owned application, shared opportunity, or standalone factual role context.
3. **Data/ownership:** applications/history use the authenticated owner predicate; active postings are shared. RIASEC interests and academic majors are deliberately not role/industry inputs. Session persistence and quota enforcement remain delegated to the deployed `mock-interview` function.
4. **Reality:** setup/readiness/history UI, the distraction-free active shell, evidence report, and client phase contract are **code/fixture-verified**; live voice/AI session and persistence are unverified. Microphone permission is requested in an explicit readiness step and tracks are released; camera/screen are never requested. An ambiguous billable start is not automatically retried. An application-context session is linked after creation through the owner-scoped accepted `application_id` path; live constraint/RLS behavior is unverified.
5. **States:** context/manual validation; premium lock; microphone unchecked/checking/ready/denied/missing/failed; connecting, AI speaking, listening, processing, paused, reconnecting, completed, ended and error; a visible silence warning does not fabricate or submit an answer. The active view exposes question scope, repeat (without answer submission), transcript toggle, supported pause/resume, and a confirmed safe exit. The report pairs available questions/transcripts, labels deterministic checks separately from model judgment, omits numeric hiring precision, and handles missing evidence explicitly.
6. **Keyboard/mobile:** labelled controls remain visible without hover; the active/report surfaces cover dashboard chrome and use responsive wrapping/scrolling. Reduced-motion users receive no orb pulse. Browser SpeechRecognition support is required (code recommends Chrome/Edge); real microphone/audio, narrow-device behavior, focus trapping in the end confirmation, and screen-reader behavior remain manual/unverified.
7. **Dependencies:** Supabase Auth/PostgREST; `mock-interview` and `interview-tts` Edge Functions; browser speech recognition/synthesis; subscription state.
8. **Known defect/claim:** typed-answer fallback is not exposed because the supported active UI contract has not been verified for typed sessions. Free-plan copy elsewhere says limited interviews while setup gates voice behind premium. History loading/error remains implicit. AI retention wording is limited to verified account persistence; provider-side retention is unknown.
9. **Tests:** `features/interview/setup.test.ts`, `features/interview/lifecycle.test.ts`, `features/interview/sessionReport.test.ts`, `components/interview/VoiceInterviewMode.test.tsx`, `lib/interviewContract.test.ts`, and report-parser tests; no real microphone, deployed quota, persistence, or history-browser test.

### `/ai-coach` — contextual-assistant transition

1. **User goal:** reach assistance beside the opportunity, selected CV bullet, application or interview evidence being worked on.
2. **Primary object:** the selected workflow object and an explicit, inspectable subset of its context; there is no standalone chat-history object.
3. **Data/ownership:** the frontend sends only visible selected context with the authenticated bearer token. Application/CV ownership remains enforced by their existing data paths; the assistant receives no implicit profile object.
4. **Reality:** `/ai-coach` remains a protected bookmark-safe transition page and is no longer primary navigation. Contextual drawers and their strict v2 client response validation are **code/fixture-verified**. The tracked/deployed `career-guidance` function still needs the backwards-compatible v2 implementation in `CONTEXTUAL_ASSISTANT_V2.md`; until deployed, requests fail closed without mutation.
5. **States:** context chips, optional personal-context removal, pending, malformed/no-op, network, authentication, quota and rate-limit errors, proposal review, accept/reject/undo.
6. **Keyboard/mobile:** the shared Radix sheet supplies focus management, Escape close and a full-width narrow-mobile panel; real-device keyboard behavior remains manual.
7. **Dependencies:** Supabase Auth; existing `career-guidance`, Lovable AI gateway and deployed-only `check-feature-access`; subscription/usage tables after v2 server work. No Storage/Paystack/direct PostHog call.
8. **Known defect/claim:** v2 quota enforcement, atomic failure/refund behavior, deployed response validation and live usage are unverified and blocked on the Lovable server handoff. No assistant analytics are emitted before consent rules exist.
9. **Tests:** `features/contextual-assistant/contract.test.ts`, `components/assistant/ContextualAssistantDrawer.test.tsx`, `pages/AICoach.test.tsx`, quota hook/access tests and navigation tests.

### `/pricing` and `/subscription-success`

1. **User goal:** compare plans, begin Paystack checkout, verify payment, and return to the app.
2. **Primary object:** owned `subscriptions` row and Paystack transaction reference.
3. **Data/ownership:** subscription lookup uses authenticated user id; checkout metadata includes user id and plan; verification sends reference/plan with the session bearer token to `verify-paystack-payment`.
4. **Reality:** pricing and checkout caller are **code-verified**; no payment was attempted. `/pricing` is public but payment requires an authenticated user/email. `/subscription-success` is also public and renders success without independently checking navigation state or subscription status.
5. **States:** subscription loading; missing user/key; script-load/init failure; payment closed; verifying; verification failure/success. Subscription hook exposes an error, but pricing does not render it separately after loading.
6. **Keyboard/mobile:** buttons/toggle/cards are responsive; Paystack iframe keyboard/mobile-money behavior unverified.
7. **Dependencies:** Supabase Auth/PostgREST/realtime; Paystack inline script; `verify-paystack-payment` Edge Function.
8. **Known defect/claim:** success route can be visited directly and makes an unverified activation claim. Pricing claims (limits, refund guarantee, plan savings, payment methods) were not reconciled against provider configuration or policy. Exact server-side amount/currency/status/ownership/idempotency verification is unverified because deployed function source was not recovered in this stage.
9. **Tests:** subscription service and access-hook tests; no pricing, Paystack, or success-route test.

### Counsellor entry points

Routes: `/counsellor-dashboard`, `/counsellor-availability`, `/counsellor-sessions`, `/counsellor-clients`, `/counsellor/complete-credentials`; student booking/rating entry points are embedded in the application tracker and counsellor dialogs.

1. **User goal:** publish a counsellor profile/availability, manage sessions/clients, upload credentials, or book/rate counselling.
2. **Primary object:** `counsellor_details`, availability, bookings, sessions, reviews, credentials, and client notes.
3. **Data/ownership:** pages first derive counsellor/user identity from the authenticated session and owned detail row; booking ownership uses student `user_id` and counsellor id. Exact RLS is unverified.
4. **Reality:** **real, code-verified** Supabase UI/callers; no live booking/session flow was exercised.
5. **States:** route-level role redirects; page spinners; missing-profile states; explicit client empty/error state; dashboard empty bookings/reviews; upload progress/error. Several fetch failures are console-only or collapse into missing-detail states.
6. **Keyboard/mobile:** signed-in layouts and form controls are responsive by code; calendar, messaging, upload/crop, and mobile interactions are unverified.
7. **Dependencies:** Supabase Auth/PostgREST; `avatars` and `documents` Storage buckets. No direct Paystack/PostHog call in these entry pages.
8. **Known defect/claim:** credential upload/storage policies, private-document access, meeting links, and role/RLS enforcement require live safe verification. No end-to-end counsellor fixture exists.
9. **Tests:** no focused counsellor page tests found.

### Supporting hub and fallback routes

- `/practice`, `/build`, and `/apply` are real static signed-in hubs linking to the requested workflows. Their cards are clickable containers with nested buttons; keyboard activation of the whole card is not equivalent to pointer activation, a known accessibility gap. No focused tests.
- `/home` redirects to `/dashboard`.
- `*` renders `NotFound`; unauthorised signed-out access redirects to `/sign-in`, missing/incomplete profiles redirect to `/onboarding`, and wrong-role access redirects to the correct role home. There is no dedicated 403 page for student/counsellor role mismatch.
- Global lazy loading uses `LoadingFallback`; route guards use full-screen spinners. `GlobalErrorBoundary` supplies the uncaught-render fallback. Page-specific handling remains inconsistent as noted above.

## Integration inventory

| Boundary | Current use | Evidence and status |
|---|---|---|
| Lovable Cloud Auth | Google OAuth redirect/token bridge | **ACTIVE PLATFORM DEPENDENCY**; fixture-verified handoff, provider configuration unverified |
| Supabase Auth | session, email/password, recovery, ownership identity | code/fixture-verified callers; live configuration unverified |
| Postgres/PostgREST/RLS | profiles, assessments, jobs, saves, applications, CVs, interviews, subscriptions, counsellor domain | query predicates inventoried; deployed schema/RLS not verified |
| Edge Functions | welcome email, intelligence, CV analysis/assistant, interview, TTS, guidance/access, payment verification | caller contracts only; exact deployed source/runtime unverified |
| Storage | counsellor avatars and credential documents | caller code only; policies and privacy unverified |
| Paystack | public-key inline checkout and server verification entry | no transaction attempted; server verification contract unverified |
| PostHog | lazy analytics facade exists and has unit tests | no requested journey imports the page-tracking hook in `App.tsx`; `SignupWizard` and `apiClient` call analytics but are not the active auth forms/direct fetch paths inventoried here. Delivery was not triggered or verified |

The Lovable platform and generated Supabase client/types were inspected, not touched. No Lovable artifact was considered for removal.

## Test and browser-verification baseline

The current suite provides useful fixture-backed behavior for landing, authentication contracts, opportunities/detail, application tracker/detail, CV persistence/scoring, access limits, navigation, and common progressive disclosure. It does not provide full signed-in route coverage for onboarding, dashboard, CV page/export, interview voice/report/history, AICoach streaming, pricing/Paystack, or counsellor journeys.

A true signed-in local browser pass is not safely possible from the repository alone because there is no local Supabase stack/seed, no Playwright or Cypress configuration, and no non-production test account/session fixture for a running browser. Minimum safe enablement would be either:

1. a local Supabase-compatible instance with migrations/RLS and seeded student and counsellor fixture users plus representative owned rows; or
2. an explicitly non-production Lovable Cloud test project and disposable test users, with test-only public configuration supplied locally (never committed), plus browser automation configured to avoid payment, email, analytics, storage mutation, and billable AI calls.

For interview verification, that fixture also needs a browser with microphone permission and mocked/non-billable function responses. For Paystack, use provider test mode and a test verification function only. Production accounts, keys, data, payment references, OAuth grants, and email recipients are not acceptable fixtures.

## Known cross-cutting risks

- Client route guards improve UX but cannot establish authorization; live RLS/function checks remain unverified.
- Several pages log fetch errors and then show empty/partial UI, so absence of data can be ambiguous.
- Pricing, subscription, interview-limit, refund, outcome, and AI-quality wording contains unverified product claims.
- Mobile and keyboard behavior is strongest where targeted component tests exist; route-level focus management and real-device behavior remain unverified.
- Generated types and repository callers are evidence of expected schema, not proof of the live Lovable Cloud schema.

## Rollback

This stage adds documentation only. Rollback is deletion of `docs/CURRENT_PRODUCT_STATE.md`; no product, database, remote configuration, credential, or generated artifact rollback is required.

## Verification results for this baseline

- Frozen install: `pnpm install --config.verify-deps-before-run=false --frozen-lockfile` — **passed** with pnpm 11.20.0; 397 lockfile entries passed the repository supply-chain policy check. The scripted `corepack pnpm ...` spelling could not be used because `corepack` is absent, so the installed pnpm binary ran the same frozen operation directly.
- Typecheck: `pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit` — **passed**.
- Current tests: `pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vitest run` — **did not start**. Rollup could not resolve `@rollup/rollup-darwin-arm64` on this `darwin arm64` host.
- Production build: `pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts` — **did not start** for the same missing Rollup native package.
- Repository cause observed: `pnpm-workspace.yaml` explicitly excludes `rollup>@rollup/rollup-darwin-arm64` and `rollup>@rollup/rollup-darwin-x64`, while the lockfile contains the Linux x64 Rollup native package. A forced frozen reinstall therefore could not make tests/build runnable on this host. The platform policy was not modified in this read-only product stage.
- Local browser: **not run** because the Vite build/dev runtime shares the blocked Rollup startup path. Signed-out behavior remains supported by fixture tests and direct code inspection, not a browser-observed label. Signed-in limitations and minimum safe fixtures are recorded above.
