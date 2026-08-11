# Feature Portfolio Decision Stage

**Date:** 2026-08-10
**Status:** Decision stage complete — **no code, configuration, or data was removed or modified**.
**Scope:** Classify each Syncareer product feature as `CORE`, `SUPPORTING`, `SIMPLIFY`, `PAUSE`, `REMOVE CANDIDATE`, `LEGACY/DEAD`, or `UNKNOWN`; define the recommended product boundary; list the founder decisions required before any removal happens.

This stage follows `AGENTS.md`: evidence first, no removals without evidence and explicit approval, missing routes are never treated as proof that live data is disposable, and no replacement AI features are proposed. Companion runbooks: [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md), [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md), [`TEST_MATRIX.md`](./TEST_MATRIX.md).

---

## 1. Evidence availability (read this before the tables)

The purpose of this stage is to decide from usage and operational evidence. One of its main findings is that **two of the three planned evidence sources do not currently produce data**.

| Evidence source | Status | Repository proof |
|---|---|---|
| Repository evidence (routes, code ownership, tables, integrations, tests, cost wiring) | **Available — collected** | This document, per-feature sections below. |
| Live database tables / row counts | **BLOCKED — owner must run** | This sandbox has no Lovable project session and its TLS path to the project endpoint fails (`curl` returns `000`, same limitation recorded in `SCHEMA_RECONCILIATION.md` §12). Count queries are prepared in [`supabase/inspection/feature_usage_counts.sql`](../supabase/inspection/feature_usage_counts.sql) — read-only, counts only, no rows. |
| PostHog usage / activation / retention / conversion | **NOT BEING COLLECTED** | `VITE_POSTHOG_API_KEY` is absent from the tracked publish env (`.env` has only the three Supabase keys) and from `.env.example`'s required set; `initializeAnalytics()` is a silent no-op without it. Even with a key, almost nothing would flow: `usePageTracking()` has **zero importers**, `SignupWizard.tsx` has **zero importers**, all 23 `track*` convenience helpers and all `EVENTS.*` catalog entries in `services/analytics.ts` have **zero call sites**, and `lib/apiClient.ts` (the only `api_error` emitter) also has **zero importers**. |
| Support / bug burden | **NOT AVAILABLE in repository** | No issue tracker content (zero GitHub issues). Support contacts are a Gmail address and a Ghana phone number in `Navbar.tsx`; records live outside the repo. |
| External/API cost | **Partially available** | Wiring is known from function sources and the secrets matrix; actual spend requires the Lovable AI-gateway, Firecrawl, Paystack, and email-volume dashboards. |

**Consequence:** classifications below are split into (a) classifications supportable from repository evidence alone, and (b) classifications that are deliberately **evidence-gated** — the feature is marked `UNKNOWN`-conditional and the exact missing evidence is named. This stage does not guess usage.

### Required evidence actions for the owner (before any removal approval)

1. Run `supabase/inspection/feature_usage_counts.sql` in the Lovable SQL editor and paste back only the numbers. (Also covers §14 legacy-table verification.)
2. In Lovable Cloud, record edge-function invocation counts for the last 90 days — at minimum for `mcp`, `generate-module-quiz`, `suggest-courses`, `suggest-free-resources`, `scrape-jobs`, `market-intelligence`, `alumni-outcomes`, `career-guidance`, `mock-interview`, `interview-tts`, `cv-ai-assistant`, `analyze-portfolio`.
3. In Lovable Cloud → Jobs, record job name/schedule/enabled/last-run for `aggregate-external-jobs-daily`, `process-email-queue`, `send-onboarding-nudges`, and confirm `daily-job-scrape` is absent.
4. Decide the PostHog question (FD-1). Without analytics, *no* usage-based removal classification can ever be satisfied.
5. Estimate support burden from the support inbox/WhatsApp for the last 90 days, per feature.
6. Pull cost reports: Lovable AI gateway usage, Firecrawl, Paystack fees, email send volume.

---

## 2. Product boundary recommendation (the short answer)

> **Syncareer's product is: a career-launch loop for African students — Discover (assessment) → Build (CV) → Practice (interview) → Apply (jobs + tracking) — funded by a Paystack premium tier that pays for the AI-metered features inside that loop.**

Everything outside that loop is either infrastructure that supports it (notifications, referrals, admin tooling), a strategic bet requiring a founder decision (counsellor marketplace, i18n), an unmeasured experiment (MCP server), or already-dead surface (learning, portfolio schemas) whose remaining artifacts are queued for evidence-checked removal.

Recommended boundary, in one diagram:

```
CORE LOOP (protect, measure)            SUPPORTING (keep while the loop needs it)
  Career assessment                       Notifications (booking/system messages)
  CV builder (+ deterministic scoring)    Referrals (dashboard card)
  Interview simulator                     Admin dashboards (counselling + feedback ops)
  Job discovery + application tracker     Subscriptions/payments plumbing IS core-boundary:
  Subscriptions (Paystack premium)          it funds the loop's AI cost

DECISION-NEEDED (founder call + evidence)   ALREADY DEAD — removal candidates (evidence-checked)
  Counsellor marketplace (scale vs pause)   Learning schema + 3 orphaned edge functions
  i18n locales (invest vs en-only)          Legacy scrape-jobs cron function
  MCP server (usage logs first)             Portfolio schema (dead) — naming residue only
  Build/Practice/Apply hubs (SIMPLIFY)      Dead analytics modules (SignupWizard, apiClient,
  SynAI chat (SUPPORTING, SIMPLIFY option)    usePageTracking, unused track* helpers)
  Market intelligence/alumni (SUPPORTING,
    PAUSE option if refresh costs > value)
```

---

## 3. Per-feature assessment

Format per feature: identity & ownership → data → usage/burden/cost/security/tests → platform dependencies → problem centrality & AI necessity → **classification** (with the evidence condition where relevant).

### 3.1 Career assessment — **CORE**

- **Routes/ownership:** `/assessment` (public, no login required) — `pages/Assessment.tsx` (594 lines), `pages/assessment/assessmentConstants.ts`, `features/assessment/{scoring,jobMatcher,chartData}.ts`, `data/assessmentQuestions.ts` (45 hardcoded questions), `hooks/useAssessment.ts`, `components/assessment/{CareerRecommendations,GuidedJourney}.tsx`.
- **Data:** `assessments`, `assessment_responses`, read of `careers`; post-completion invokes deployed-only `compute-user-intelligence`.
- **Usage/burden/cost:** PostHog events defined (`assessment_started/completed/abandoned`) but **never emitted** (§1). No external API cost for scoring (pure deterministic RIASEC arithmetic); `compute-user-intelligence` is an authenticated DB function. Support burden unknown (§1).
- **Security/privacy:** Guest path computes locally with zero persistence — good privacy posture. Authed writes are RLS owner-scoped. Public route intentionally acquires guests.
- **Tests:** `assessmentConstants.test.ts` (scoring, normalization, tie behavior) — Layer 1.1/5.2.
- **Platform deps:** Supabase tables + one deployed-only function. No Lovable AI cost.
- **Centrality/AI:** The top-of-funnel hook and first value moment; **no AI needed** for the core (deterministic scoring is a strength, tested as such).
- **Classification: CORE.** Protect. It is also the only feature with a public acquisition surface.

### 3.2 CV builder — **CORE**

- **Routes/ownership:** `/cv-builder` — `pages/CVBuilder.tsx` (494 lines), `components/cv-builder/*` (10 components), `features/cv-builder/*`, `hooks/useCVStrengthScore.ts` (deterministic), `hooks/useCVAnalysis.ts` (AI upload-parse).
- **Data:** `resumes` (JSON sections incl. projects), skill fields feeding `user_skills`.
- **Usage/burden/cost:** Events defined (`cv_saved`, `cv_downloaded`, `cv_section_completed`), none emitted. AI cost via deployed-only `cv-ai-assistant` and `analyze-portfolio` (both Lovable AI gateway). Export is client-side `html2pdf.js` (no server cost).
- **Security/privacy:** CV content is highly personal; RLS owner-scoped; file upload validated client-side (type/size) then parsed server-side — server-side validation of the uploaded file's payload is unverifiable (function source not in repo).
- **Tests:** `useCVStrengthScore.test.ts` (Layer 1.2/5.3).
- **Platform deps:** Two deployed-only AI functions — recovery-blocked like the rest (§5 of BACKEND_PLATFORM_INVENTORY).
- **Centrality/AI:** Central promise ("ATS-ready CV"). Deterministic strength score needs no AI; AI assistant is genuinely useful here (bullet rewriting) but is not the core value — the editor + score are.
- **Classification: CORE.** The deterministic core carries the feature; AI assistant is a SUPPORTING add-on inside it (its limits are displayed but only enforced for AI coach — see 3.9).

### 3.3 Interview simulator ("SynAssist") — **CORE**, cost-watched

- **Routes/ownership:** `/interview-simulator` — `pages/InterviewSimulator.tsx` (525 lines), `components/interview/{VoiceInterviewMode,InterviewErrorBoundary}.tsx`, `hooks/useVoiceInterview.ts`, `features/interview/*`.
- **Data:** `mock_interviews`.
- **Usage/burden/cost:** Events defined (`interview_started/completed/question_answered`), none emitted. **Highest per-session external cost in the product**: LLM turns via `mock-interview` + audio via `interview-tts` (`OPENAI_API_KEY`/`ELEVENLABS_API_KEY`/Lovable gateway — provider split unknown, deployed-only source).
- **Security/privacy:** Voice answers are personal data processed by third-party AI; server-side enforcement of the interview paywall is unverifiable in-repo (client gates on `isPremium`; the functions are expected to enforce but are deployed-only).
- **Tests:** `interviewContract.test.ts` (retry/backoff + phase contract; LLM prose intentionally excluded, Layer 4.4).
- **Platform deps:** Two deployed-only functions with three possible AI providers — the thickest deployed-only seam in the app.
- **Centrality/AI:** "Practice" pillar of the loop; voice AI is the feature's substance, so AI is justified — but cost-per-session must be measured against conversion.
- **Classification: CORE.** Simplification option exists (a text-only mode would cut TTS cost) but is **evidence-gated**: requires usage + cost data (§1 actions 1, 2, 6) and a founder call; do not build replacement AI.

### 3.4 Job discovery / application tracking — **CORE**

> **Status update (2026-08-11):** the opportunity-to-application workflow described by the
> frontend audit is now implemented. External postings apply on the source site and then
> "I applied — start tracking" creates a `job_applications` row through the shared
> duplicate-safe write seam (`features/application-tracker/tracking.ts`), so the
> discovery→tracking loop closes for every rendered job. A tracker detail sheet
> (`components/applications/ApplicationDetailSheet.tsx`) shows the status journey
> (`features/application-tracker/workflow.ts`), next recommended action, deadline,
> targeted CV, interview-practice entry point, notes, and outcome recording. The
> classification and decisions below are unchanged.

- **Routes/ownership:** `/opportunities` (`pages/Markets.tsx`, 614 lines), `/applications` (`pages/ApplicationTracker.tsx`, 618 lines), `hooks/useOutcomeTracking.ts`, `features/application-tracker/` (`workflow.ts`, `tracking.ts`, `constants.ts`), `components/opportunities/*`, `components/applications/ApplicationDetailSheet.tsx`.
- **Data:** `job_postings`, `job_posting_skills`, `saved_jobs`, `job_applications`, `recommendation_outcomes`.
- **Usage/burden/cost:** Events defined (`job_view`, `job_apply`, `application_status_update`); apply/outcome feedback is emitted through `useOutcomeTracking` (`trackAction` / `updateOutcome`) from the opportunity and tracker pages. External cost: daily Firecrawl crawl via tracked `aggregate-external-jobs` cron (6 job-board domains × majors; `FIRECRAWL_API_KEY`). Legacy `scrape-jobs` cron superseded (removal candidate RC-2).
- **Security/privacy:** RLS owner-scoped write paths; external job content is scraped third-party HTML feed into LLM extraction — prompt-injection-resistant handling lives in the tracked function's schema-constrained extraction.
- **Tests:** Dedicated coverage added for the later application contract: opportunity facts and provenance honesty (`opportunity.test.ts`), status journey/next-action logic (`workflow.test.ts`), tracker write seam + error classification (`tracking.test.ts`), preview progressive disclosure (`OpportunityPreview.test.tsx`), and the application detail sheet (`ApplicationDetailSheet.test.tsx`). See `TEST_MATRIX.md` Layers 1.7–1.11 and 5.6–5.9.
- **Platform deps:** Tracked cron function + Firecrawl + pg_cron/pg_net.
- **Centrality/AI:** The "Apply" pillar — without supply of jobs the tracker is empty, so the Firecrawl spend is load-bearing. AI extraction from scraped pages is genuinely needed.
- **Classification: CORE.** Verify the daily cron's success rate from Jobs evidence (§1 action 3); a silently failing crawler would change this to "CORE but broken".

### 3.5 Counsellor marketplace & workflows — **UNKNOWN** (scale-or-pause decision)

- **Routes/ownership:** Student side: navbar "Ask a Counsellor" dialog (`components/counsellor/AskCounsellorDialog.tsx`, 589 lines) — browse/filter counsellors, availability, booking, reviews. Counsellor side: `/counsellor-dashboard`, `/counsellor-availability`, `/counsellor-sessions`, `/counsellor-clients`, `/counsellor/complete-credentials` (1,364 lines of pages + ~1,444 lines of components incl. messaging, meeting links). Admin side: `/admin/credentials` review.
- **Data:** `counsellor_details`, `counsellor_availability`, `counsellor_bookings`, `counsellor_sessions`, `counsellor_reviews`, `counsellor_messages`, `counsellor_credentials`, 3 public views. `counsellor_credentials`/`counsellor_messages` are called by the app but **absent from both generated type copies** — live existence unknown (`SCHEMA_RECONCILIATION.md` §6). Hence §14-must-verify and count query 5.
- **Usage/burden/cost:** No analytics events exist for this domain at all. No per-use external API cost (messaging/bookings are plain DB), but the **operational** cost is the highest in the product: human vetting, credential review, dispute/safety exposure, and the hardening history in migrations (session/booking enforcement triggers). Support burden unknown.
- **Security/privacy:** The most sensitive relational surface in the product (1:1 human contact, session notes?, meeting links, credentials documents in storage). Protected by the strictest triggers in the schema. Migrations show repeated hardening passes (2026-07-01 → 2026-08-01).
- **Tests:** RLS matrix Layers 3.4/3.9; booking contracts. UI untested.
- **Platform deps:** Supabase tables/views/triggers + `send-notification` (deployed-only) for booking messages. No AI.
- **Marketing coupling:** 9 of 17 landing components reference counsellors; pausing the marketplace requires landing-page copy changes (content decision, not cleanup).
- **Centrality/AI:** Two-sided marketplaces are a supply-and-ops business, not an AI question. Human counselling is the brand's trust differentiator *if supply exists*.
- **Classification: UNKNOWN pending two numbers** — (a) verified counsellor supply and (b) booking volume (`feature_usage_counts.sql` §5) — plus founder decision FD-3. If supply ≈ 0 → **PAUSE** (keep code, hide acquisition entry points, keep data). If bookings are real → **SUPPORTING** and invest in the credential/messaging schema unknowns.

### 3.6 SynAI generic career chat — **SUPPORTING** (SIMPLIFY option flagged)

- **Routes/ownership:** `/ai-coach` — `pages/AICoach.tsx` (241 lines), `components/ai-coach/*` (5 components), tracked function `career-guidance` (SSE streaming via Lovable AI gateway, Gemini 2.5 Flash), `hooks/useUserContext.ts` (profile-context assembly).
- **Data:** none persisted by the app (`career_guidance_sessions` exists in latest generated types but has **no writer anywhere** in app or tracked functions — verify deadness via count §6, currently zero-evidence retention risk only).
- **Usage/burden/cost:** No chat-specific events. Cost: LLM tokens per message; free tier 5 sessions/month enforced via `check-feature-access` (the **only** feature with live server-side increment calls from the client).
- **Security/privacy:** Chat content contains career/personal data sent to the AI gateway. Streaming CORS is open (`*`) but JWT-gated. Rate limiting beyond monthly quota is unverifiable.
- **Tests:** `useAICoachAccess.test.ts` (quota boundary, Layer 4.2 partial).
- **Platform deps:** Lovable AI gateway — direct `LOVABLE_API_KEY` consumer.
- **Centrality/AI:** Generic career chat is **commodity** (every LLM chat does it); its only differentiation is the Syncareer profile context injection, which is well-implemented. Feature overlaps the CV assistant, market intelligence, and interview feedback.
- **Classification: SUPPORTING.** It rounds out the loop and is the only metered AI feature wired end-to-end. SIMPLIFY option (merge entry points with CV assistant, cap free tier harder) is evidence-gated on usage/cost data and FD-1; no replacement AI may be added.

### 3.7 Market intelligence / alumni outcomes — **SUPPORTING** (PAUSE option flagged)

- **Routes/ownership:** `/analysis` — `pages/Analysis.tsx` (233 lines), `components/analysis/*` (4 tabs/cards), `hooks/useMarketIntelligence.ts`, dashboard `UniversityInsightsCard.tsx`. Tracked functions `market-intelligence`, `alumni-outcomes` (both in-repo), deployed-only `compute-university-insights`.
- **Data:** `market_intelligence_cache`, `alumni_outcomes_cache`, `university_insights`.
- **Usage/burden/cost:** No events. Cost model: Firecrawl crawls + Gemini calls, results cached per major/region — cost scales with *distinct* major/region pairs and refresh cadence, not headcount. If the user base is small and concentrated, cost is modest; if traffic is thin, the feature is paying rent for zero readers.
- **Security/privacy:** Aggregated labor-market data; no personal data beyond major/region keys. Alumni-outcomes crawls public web data about institutions — keep an eye on source terms.
- **Tests:** none feature-specific (hook exercised indirectly). Gap.
- **Platform deps:** Tracked functions + Firecrawl + Lovable AI gateway.
- **Centrality/AI:** Supports the "Discover/Apply" story with African-market-specific data that generic tools lack — credible differentiation, but it is a *read* surface, not the transactional loop. AI/web crawling is genuinely needed to produce it.
- **Classification: SUPPORTING**, with a PAUSE trigger: if counts (cache freshness vs. distinct readers) and invocation logs show near-zero consumption, pause refresh and keep the last cache (static read remains).

### 3.8 Admin dashboards — **SUPPORTING** (coupled to 3.5 + feedback)

- **Routes/ownership:** `/admin/feedback`, `/admin/users`, `/admin/credentials` (964 lines) + `components/admin/*`. `AdminRoute` (UX-only; server is authority).
- **Data:** `user_feedback`, `user_roles`, `counsellor_credentials`.
- **Usage/burden/cost:** No external cost. Two of three backends (`admin-feedback`, `admin-users`) are **deployed-only and missing from the repo** — recovery-blocked; any bug there requires the recovery runbook first.
- **Security/privacy:** Highest privilege UI; relies on deployed-only functions using the Auth Admin API (ban, role change). Client guard is UX-only per policy; trust depends on those functions enforcing admin checks — unverifiable in-repo.
- **Tests:** none at UI level; RLS admin layer 3.5.
- **Classification: SUPPORTING.** Cannot be removed while counsellor vetting and feedback exist. If the marketplace is paused (3.5), credential review pauses with it and this shrinks to feedback + users.

### 3.9 Subscriptions — **CORE** (the revenue boundary)

- **Routes/ownership:** `/pricing`, `/subscription-success`, Settings subscription tab — `pages/Pricing.tsx`, `components/payment/PaystackButton.tsx`, `components/subscription/SubscriptionManager.tsx`, `services/subscriptionService.ts`, `lib/featureAccess.ts`, `hooks/useSubscription.ts`. Plans: **GH₵30/month, GH₵300/year**, Paystack, GHS.
- **Data:** `subscriptions`, `payments`, `usage_logs`.
- **Usage/burden/cost:** Subscription events defined, none emitted → **conversion cannot be measured today**. Cost: Paystack transaction fees only.
- **Security/privacy:** Server-grants-premium trust model documented in `PAYMENT_AND_SUBSCRIPTIONS.md`; RLS blocks client self-grant (payments insert restricted to `status='pending'`); `verify-paystack-payment` and `check-feature-access` are deployed-only (verification steps unverifiable in-repo).
- **Tests:** `subscriptionService.test.ts`, `featureAccess.test.ts` (Layers 1.3/1.6 — the revenue failure policy).
- **Enforcement asymmetry (evidence):** `FREE_LIMITS` defines 7 feature keys, but the client performs **server-side checks only for `ai_coach_session`** (`AICoach.tsx`); the interview page hard-gates voice behind `isPremium`; `cv_export`, `career_assessment`, `job_application` limits are **display-only** via `SubscriptionManager` (no enforcement call sites found in `CVBuilder`, `Assessment`, `Markets`, `ApplicationTracker`). Whether the deployed functions enforce the rest is unverifiable in-repo.
- **Classification: CORE.** Simplification work (align FREE_LIMITS with actual enforcement) is a hardening task, not a removal; requires the deployed-only function sources (recovery runbook).

### 3.10 Referrals — **SUPPORTING** (unmeasured)

- **Routes/ownership:** Dashboard card only — `components/referral/ReferralCard.tsx` rendered in `pages/Dashboard.tsx`.
- **Data:** `referrals`, RPC `get_my_referral_code` (SECURITY DEFINER with July hardening migrations).
- **Usage/burden/cost:** No cost; no events wired (`referral_copied`/`referral_clicked` types exist, neither emitted — no measurement).
- **Tests:** none specific; RPC covered by grant-hardening smoke checks.
- **Classification: SUPPORTING.** Keep — it is one card on the dashboard. If counts (§9 query) show zero referrals ever, demote to PAUSE (hide card, keep table) at the same approval as FD-1 measurement work.

### 3.11 Portfolio schema / features — **LEGACY/DEAD**

- **What it was:** public portfolio pages backed by `portfolio_projects`, `portfolio_reviews`, `portfolio_settings`, `portfolio_views`, plus a public RPC/view.
- **Repository evidence of death:** drop migrations 2026-07-12 (`20260712012949` drops portfolio tables + public RPC; `20260701211158` had already replaced the view); tables absent from the newer root generated types; **zero** `.from('portfolio_*')` call sites in the app.
- **Residual live risk:** §14 inspection query verifies drops took effect live. If any count returns rows, STOP (that would mean live data exists → export decision required).
- **Residue (naming/content, not schema):** the deployed-only function **`analyze-portfolio`** is *active* but misnamed — its current caller sends `{fileBase64, fileMimeType, fileName}` (CV upload parsing); `BACKEND_PLATFORM_INVENTORY.md` §3 still describes a stale payload `{portfolioId, items}` (doc drift to correct on next inventory pass). `CVSkillGapPanel.tsx` contains "portfolio" copy. `CVFormProjects.tsx` (CV projects section) is resume data and is **not** the dropped portfolio feature — do not conflate.
- **Classification: LEGACY/DEAD.** Nothing in this stage removes; RC-1–RC-2 cover the platform remnants.

### 3.12 Learning schema / features — **LEGACY/DEAD**

- **What it was:** learning paths/goals/activities/streaks/module completions/course progress/user stats/question bank + three AI suggest functions.
- **Repository evidence of death:** drop migration 2026-07-07 (`20260707223408` drops learning/stats/question-bank objects and functions); none of the 12 tables exist in the newer root types; **zero** app call sites.
- **Platform remnants:** deployed functions `generate-module-quiz`, `suggest-courses`, `suggest-free-resources` classified in `BACKEND_PLATFORM_INVENTORY.md` as **"Legacy / Orphaned (Learn table dropped)"** — removal candidates RC-1. One live-table residue: `CareerInsightsPanel.tsx` reads `user_intelligence_profiles.learning_momentum` (a field name inherited from the learning era on a live table — cosmetic, not the dropped schema).
- **Classification: LEGACY/DEAD.** Removal of the three orphaned deployed functions is RC-1 (requires invocation-log evidence + second removal-safety classification).

### 3.13 Local notifications — **SUPPORTING** (legacy variant already gone)

- **Current system:** `notifications` table + `hooks/useNotifications.ts` (realtime), `components/notifications/*` (dropdown, item, settings panel, empty state), `notification_preferences`, deployed-only `send-notification` function (in-app + email). `utils/notifications.ts` has a passing contract test.
- **Legacy variant:** localStorage-based notifications were removed in a prior stage (documented in `ARCHITECTURE.md`); `utils/notifications.test.ts` now tests the Supabase path only. Nothing "local" remains to remove.
- **Consumers of the send path:** counsellor booking/messaging flows (`AskCounsellorDialog`, sessions) — i.e., notifications are load-bearing for 3.5.
- **Classification: SUPPORTING.** Its fate follows the marketplace decision; if 3.5 pauses, keep in-app notifications for system messages and downgrade email volume.

### 3.14 Build / Practice / Apply hub pages — **SUPPORTING**, SIMPLIFY recommended

- **Routes/ownership:** `/build` (44 lines, **one card**), `/practice` (56 lines, 3 cards), `/apply` (56 lines) — pure link pages rendered inside `StudentLayout`. They are the primary student IA on both desktop sidebar (`StudentLayout.tsx`) and mobile bottom nav (`MobileBottomNav.tsx`).
- **Cost/burden:** none; no events.
- **Assessment:** They duplicate the nav as content (each card's target is one nav layer down). `/build` has a single child (CV builder) — it is a redundant hop. This is an **information-architecture** issue, not maintenance cost: total surface is ~157 lines of trivial code.
- **Classification: SUPPORTING.** SIMPLIFY recommendation (evidence-gated on FD-1 page-view data): either fold `/build` into `/cv-builder` directly and enrich `/practice`/`/apply` with real summary widgets, or keep hubs as genuinely useful dashboards. Decide with product, not cleanup.

### 3.15 i18n locales — **PAUSE/SIMPLIFY candidate** (founder market decision)

- **Routes/ownership:** `i18n/config.ts` + `i18n/locales/{af,ar,de,es,fr,pt,xh,zh,zu}.ts`; deps `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- **Repository evidence:** Only **2 files** consume `useTranslation` (`pages/Settings.tsx`, `components/settings/SecuritySection.tsx`). Locale files are **stubs** (9–14 lines each; English 53 lines). `LanguageDetector` auto-detects browser language and **dynamically loads stub locales** — a French-browser user gets a partially-"translated" Settings page (mixed-language UI), and detection caches the choice in localStorage.
- **Usage/cost:** No analytics on language; no runtime cost beyond bundle (lazy chunks) and the detection behavior.
- **Centrality:** African-market strategy could justify French/Portuguese/Swahili etc. — but a stub-level i18n that auto-activates on one settings page is **worse than English-only** and currently invisible to measurement.
- **Classification: PAUSE the multi-locale surface** (set supported languages to `en` only, which also stops auto-detection from loading stubs) **or SIMPLIFY to a real en+fr scope** — this is founder decision FD-4 (market strategy). Removal of locale files (RC-4) only after that decision. No user data is implicated either way.

### 3.16 MCP server — **UNKNOWN** → REMOVE CANDIDATE (conditional)

- **Routes/ownership:** tracked edge function `supabase/functions/mcp/index.ts` (316 lines), `verify_jwt = false` in `config.toml`. Purpose: expose 8 read-only tools (profile, readiness, CV, skills, saved jobs, applications, job search/get) to **external MCP clients** (Claude/ChatGPT/Cursor/custom) under the caller's Supabase JWT → PostgREST RLS.
- **Repository evidence:** **No in-product consumer** — nothing in the app, docs marketing, or landing references it. Auth model: decodes (not verifies) the JWT for the `user_id` echo, but all data queries carry the caller's original JWT to PostgREST, so Supabase validates it and RLS scopes results; read-only by design (all writes intentionally omitted); input sanitization on search; run under anon key.
- **Usage/cost:** No telemetry in-repo; cost is plain PostgREST reads. Only Lovable invocation logs can separate "zero use" from "someone's agent depends on it".
- **Security/privacy surface:** A public, unauthenticated-*gateway* endpoint (401 without a user JWT) that document-ably lets any signed-in user script their own data — bounded by RLS; scanner-attracting CORS-open JSON-RPC surface; maintenance burden is a hand-rolled MCP protocol implementation (protocol version `2025-06-18`).
- **Classification: UNKNOWN pending invocation logs (§1 action 2).** If invocations ≈ 0/non-Syncareer → **REMOVE CANDIDATE RC-3** (it is a speculative integration with an ongoing security-review surface and no measured user). If real external consumers exist → keep as SUPPORTING and add verification hardening to the backlog.

---

## 4. Decision table

| # | Feature | Primary classification | Secondary option | Evidence gate for any change |
|---|---|---|---|---|
| 1 | Career assessment | **CORE** | — | none (protect; wire events) |
| 2 | CV builder | **CORE** | AI assistant = SUPPORTING within it | invocation/cost data for AI add-ons |
| 3 | Interview simulator | **CORE** | SIMPLIFY (text-only mode) | usage + cost + founder call |
| 4 | Job discovery / application tracking | **CORE** | — | Jobs health check only |
| 5 | Counsellor marketplace/workflows | **UNKNOWN** | SUPPORTING if traction / PAUSE if zero supply | live counts §5 + FD-3 |
| 6 | SynAI generic career chat | **SUPPORTING** | SIMPLIFY | usage/cost via FD-1 + logs |
| 7 | Market intelligence / alumni outcomes | **SUPPORTING** | PAUSE (freeze refresh, keep cache) | consumption vs cost |
| 8 | Admin dashboards | **SUPPORTING** | shrink if marketplace pauses | follows #5 |
| 9 | Subscriptions | **CORE** | simplify limits to enforced set | recovery of deployed-only functions |
| 10 | Referrals | **SUPPORTING** | PAUSE (hide card) | zero-referral proof via §9 query |
| 11 | Portfolio schema/features | **LEGACY/DEAD** | — | §14 verification that drops are live |
| 12 | Learning schema/features | **LEGACY/DEAD** | — | same; platform remnants = RC-1 |
| 13 | Local notifications | **SUPPORTING** (current system) | legacy variant already removed | follows #5 |
| 14 | Build/Practice/Apply hubs | **SUPPORTING** | **SIMPLIFY** (IA redesign) | FD-1 page-view data + product call |
| 15 | i18n locales | **PAUSE/SIMPLIFY candidate** | invest (fr) vs en-only | FD-4 market decision |
| 16 | MCP server | **UNKNOWN** | **REMOVE CANDIDATE** | invocation logs + FD-5 |

Out-of-list but discovered this stage (code-level, zero-data-impact removal candidates — RC-5):

| Artifact | Evidence (zero importers / dead) | Classification |
|---|---|---|
| `components/auth/SignupWizard.tsx` | No importer; app signs up via `SignUpForm.tsx` | REMOVE CANDIDATE (dead code) |
| `lib/apiClient.ts` | No importer; app uses `supabase-js` directly | REMOVE CANDIDATE (dead code) |
| `hooks/usePageTracking.ts` | No importer | REMOVE CANDIDATE (dead code) — but see FD-1: if PostHog is enabled, *wire it in* instead |
| 23 `track*` helpers + uncalled `EVENTS` entries, `analytics.ts` | Zero call sites (service itself retained by `main.tsx`) | REMOVE CANDIDATE (trim to init/identify/reset) — depends on FD-1 |
| `services/analytics.test.ts` (partial) | Tests uncalled helpers | Follows the analytics decision |

---

## 5. Remove candidates — full safety detail

> None of these remove user data rows. Two touch the Lovable platform and therefore require invocation-log evidence **and** a second removal-safety classification per `AGENTS.md` Lovable policy before execution. All require explicit approval. **Nothing in this section has been executed.**

### RC-1 — Orphaned learning edge functions (`generate-module-quiz`, `suggest-courses`, `suggest-free-resources`)

- **Evidence:** `BACKEND_PLATFORM_INVENTORY.md` §2 classifies all three "Legacy / Orphaned (Learn table dropped)". Learning tables were dropped by tracked migration `20260707223408` (2026-07-07). Zero call sites in the app; no source in repo.
- **User/data/integration impact:** None provable from repo — the functions' backing tables no longer exist in current schema evidence; a caller would fail regardless. Because the functions are **deployed-only**, external exposure can only be ruled out via Lovable invocation logs.
- **Migration/export plan:** None for data (tables already dropped; §14 inspection confirms). Before deletion, use Lovable **View code** to archive each function's exact deployed source + config into a private location (not necessarily the repo — decide whether to track under `supabase/functions/` for history).
- **Rollback plan:** redeploy from the archived source through Lovable Cloud; no data rollback needed.
- **Artifacts requiring a second removal-safety classification (Lovable artifacts):** the three deployed functions in Lovable Cloud → Edge functions; `BACKEND_PLATFORM_INVENTORY.md` §2/§6 rows (`LOVABLE_API_KEY` consumers list); `docs/EDGE_FUNCTIONS.md` deployed-only list; preceding invocation-log evidence bundle.

### RC-2 — Legacy `scrape-jobs` cron function

- **Evidence:** Inventory classifies it "Legacy (To be unscheduled)"; migration `20260512094313` (2026-05-12) unscheduled `daily-job-scrape`; superseded by tracked `aggregate-external-jobs`.
- **User/data/integration impact:** None in app. Risk is only if the cron is somehow still scheduled live — §1 action 3 verifies via Lovable Jobs view.
- **Migration/export:** None. Archive deployed source via View code as in RC-1.
- **Rollback:** redeploy/reschedule is possible from archive, but the replacement (`aggregate-external-jobs`) makes rollback unnecessary in practice.
- **Artifacts requiring second classification:** deployed `scrape-jobs` function (Lovable), Jobs/schedules view state, inventory rows in both backend docs.

### RC-3 — MCP server (conditional on invocation logs)

- **Evidence:** No in-product consumer anywhere in the repo; speculative external integration; 316-line hand-rolled protocol surface. Conditional on log evidence of non-use (§3.16).
- **User/data/integration impact:** Any external MCP client holding a user JWT loses read-only tools access. No stored data is affected (the function is stateless). If logs show real consumers, STOP — do not remove.
- **Migration/export plan:** Announce sunset where the endpoint is discoverable (the GET discovery response); the repo retains full tracked source at `supabase/functions/mcp/` so capability can be re-offered later.
- **Rollback plan:** Source is fully tracked in-repo — redeploy via Lovable Cloud restores behavior exactly (same protocol version/constants).
- **Artifacts requiring second removal-safety classification (Lovable artifacts):** deployed `mcp` function (Lovable deletion); `supabase/config.toml` `[functions.mcp]` entry (`verify_jwt=false` removal); `BACKEND_PLATFORM_INVENTORY.md` §2/§6 rows (`SUPABASE_ANON_KEY` consumer); `docs/EDGE_FUNCTIONS.md` tracked table; `supabase/functions/mcp/index.ts` source tree; README/docs mention check.

### RC-4 — Non-English stub locales (only after FD-4 chooses en-only)

- **Evidence:** §3.15 — stubs of 9–14 lines, 2 consuming files, auto-detection currently degrades UX.
- **User/data/integration impact:** Browser settings for non-English users fall back to English everywhere — which is today's effective behavior except Settings; no user data is implicated.
- **Migration/export:** None. If localization resumes, the stub files have negligible translation value to preserve (they are starter scaffolds, not completed translations).
- **Rollback:** `git revert` restores files; config change is two lines in `i18n/config.ts`.
- **Artifacts requiring second classification:** none platform-side (pure frontend code). Decision-point artifacts: `i18n/locales/*` (9 files), loaders/`SUPPORTED` in `i18n/config.ts`, and the three i18n packages in `artifacts/syncareer/package.json` (keep if `t()` usage remains; remove only if i18n is abandoned wholesale — separate approval).

### RC-5 — Dead analytics/orphan frontend modules

- **Evidence:** zero-importer proof for `SignupWizard.tsx`, `apiClient.ts`, `usePageTracking.ts`; zero call sites for all `track*` helpers/`EVENTS` entries (verified by exhaustive grep, §1).
- **User/data/integration impact:** None — nothing executes this code. (`main.tsx` still calls `initializeAnalytics()`; that stays until FD-1.)
- **Migration/export:** None.
- **Rollback:** `git revert`.
- **Artifacts requiring second classification:** none platform-side. **Dependency on FD-1:** if PostHog is enabled, `usePageTracking.ts` and the event helpers should be *wired in*, not deleted — RC-5's exact target list is decided by that answer. `services/analytics.test.ts` test scope follows.

### Explicitly NOT remove candidates (guardrails)

- `counsellor_credentials` / `counsellor_messages` call sites: live-existence **UNKNOWN** — per constraint, missing routes/types are not proof that live data is disposable. Verify via §5 count queries first.
- `career_guidance_sessions` table: no writer in tracked code, but it's present in the newest Lovable-generated types → do not drop without live count + a check of deployed-only writers.
- PWA decommission residue (`public/sw.js`, `removeLegacyBrowserCaches`) — already tracked as `UNKNOWN` with its own evidence list in `PLATFORM_ARTIFACT_INVENTORY.md` §2.4/§5.1; unchanged by this stage.
- `@tailwindcss/typography` prose bug — known latent bug, not dead weight; unchanged.

---

## 6. Unknowns and required founder/user decisions

| ID | Decision needed | Why it matters (what it unblocks) |
|---|---|---|
| **FD-1** | **Analytics:** is `VITE_POSTHOG_API_KEY` set anywhere in the live publish environment? If not, approve either (a) wiring PostHog properly (set key, mount `usePageTracking` in the app, emit the already-defined events) or (b) removing analytics surface (RC-5 extended). | Every usage-based classification. The repo defines a solid event vocabulary that is currently 100% un-emitted. No future stage can "retain, simplify, pause, or remove based on usage" without this. |
| **FD-2** | **Run the count + log evidence pack** (§1 actions 1–3, 5–6) and share only aggregates. | Converts counsellor marketplace, MCP, market intelligence, referrals, legacy-table verification from UNKNOWN/conditional to decidable. |
| **FD-3** | **Counsellor marketplace strategy:** scale it (supply acquisition, vetting ops) or pause it (hide entry points, keep data + code)? Note the 9-component landing-page marketing coupling and that booking payments appear unwired (`hiring_price` exists but only subscriptions flow through `verify-paystack-payment` — confirm billing intent). | Determines the fate of the largest ops surface, admin credential review, notifications load, and landing copy. |
| **FD-4** | **i18n strategy:** which markets matter in the next 12 months? en-only (RC-4 execution) vs a funded en+fr (or other) scope. | Resolves the stub-locale UX debt either way. |
| **FD-5** | **MCP consumers:** confirm whether any external agent/integration is meant to exist (partners, demo scripts, your own tooling). | Final input to RC-3 alongside invocation logs. |
| **FD-6** | **Hub IA:** after page-view data exists, choose between flattening the Build/Practice/Apply hubs or making them real dashboards. | Resolves 3.14 SIMPLIFY. |
| **FD-7** | **Support/intel channel:** designate where user feedback & bug reports aggregate (the product collects `user_feedback` via FeedbackModal used in Assessment/CV/Interview; is `/admin/feedback` actually being checked?). | Converts "support burden unknown" into an input for the next review; otherwise classifications stay evidence-starved. |
| **FD-8** | **Paystack key in publish env:** tracked `.env` lacks `VITE_PAYSTACK_PUBLIC_KEY`; confirm Lovable injects it at build time, else checkout silently can't initialize. | Revenue path sanity — not a removal, a verification. |

### Open unknowns table (status at end of this stage)

| Unknown | Blocking | Resolution path |
|---|---|---|
| Live row counts for every feature table | All usage-based classification | `supabase/inspection/feature_usage_counts.sql` (owner-run) |
| Edge-function invocation counts (90d) | RC-1, RC-2, RC-3, cost sizing | Lovable Cloud console (owner) |
| Cron job health (`aggregate-external-jobs-daily`, email queue, nudges) | 3.4 "CORE but broken?" risk; RC-2 | Lovable Jobs view (owner) |
| Whether portfolio/learning drops reached Live | RC-1 safety; §14 queries | same SQL pack |
| `counsellor_credentials`/`counsellor_messages` live existence | 3.5 hardening; possible broken call sites | same SQL pack + `SCHEMA_RECONCILIATION.md` owner actions |
| PostHog live status | All retention/activation/conversion evidence | FD-1 |
| Support/bug burden per feature | Remove/pause judgments | FD-7 |
| External cost per feature (AI gateway, Firecrawl, TTS) | SIMPLIFY judgments (3.3, 3.6, 3.7) | provider dashboards (owner) |

---

## 7. What this stage deliberately did NOT do

- Deleted no code, configuration, migrations, docs, or data.
- Treated no missing route/type as proof of disposable live data.
- Proposed no replacement AI features (per constraint). SIMPLIFY options listed are reductions, not substitutions.
- Reconstructed no deployed-only function logic; live verification steps defer to the owner.
- Optimized nothing "for the number of features removed": the recommended boundary keeps most features; only already-dead or never-wired surfaces are queued, each behind evidence + approval.

## 8. Next stages (order-sensitive)

1. **Evidence stage (owner + agent):** FD-1…FD-8 answers; run `feature_usage_counts.sql`; pull invocation logs and Jobs status; record results back into this document's tables.
2. **Removal-safety classification stage:** apply AGENTS.md's Lovable classification pass to RC-1…RC-5 exact artifacts (with the §5 second-classification lists), one candidate per focused branch.
3. **Execution stages (separate, approved):** dead-code removal (RC-5) → platform remnant removal (RC-1/RC-2, possibly RC-3) → i18n decision execution (FD-4/RC-4) → optional PAUSE hides (marketplace/referrals) behind feature flags, never data deletion.
