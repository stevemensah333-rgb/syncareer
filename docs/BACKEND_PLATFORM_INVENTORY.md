# Backend & Platform Inventory

## 1. Executive Summary & Hard Stop Status

- **Objective:** Establish an authoritative inventory of all Supabase Edge Functions, backend touchpoints, secrets, and Lovable platform dependencies before any backend refactoring.
- **Live Access Status:** This repository snapshot does not provide a Lovable project-session inspection tool. Personal Supabase CLI access is neither configured nor an approved substitute for Lovable Cloud ownership.
- **Hard Stop Execution:** In strict adherence to repository engineering policy (`AGENTS.md` and session constraints: *"If live project access is unavailable, do not recreate functions from call sites"*), missing deployed edge functions have **not** been reverse-engineered from frontend call sites.
- **Next Step:** Section 7 provides the Lovable Cloud **View code**, Git sync, and support-assisted recovery path. The former personal-Supabase-CLI path is explicitly prohibited.

---

## 2. Complete Edge Function Inventory

| Function Name | Callers / Triggers | Tracked Source Status | Deployed Status | `verify_jwt` | Secrets & Integrations Used | Trust Level | Recovery Status |
|---|---|---|---|---|---|---|---|
| **`aggregate-external-jobs`** | Database cron (`aggregate-external-jobs-daily` @ 6 AM UTC) | Tracked (`supabase/functions/aggregate-external-jobs/`) | Active Deployed | `true` | `FIRECRAWL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Service Role / Cron | **Tracked & Present** |
| **`alumni-outcomes`** | `AlumniOutcomesCard.tsx` (`functions.invoke`) | Tracked (`supabase/functions/alumni-outcomes/`) | Active Deployed | `true` | `FIRECRAWL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` (Gemini 2.5 Flash) | Authenticated User | **Tracked & Present** |
| **`career-guidance`** | `AICoach.tsx` (raw fetch / SSE stream) | Tracked (`supabase/functions/career-guidance/`) | Active Deployed | `true` | `LOVABLE_API_KEY` (Lovable AI Gateway / Gemini 2.5 Flash) | Authenticated User | **Tracked & Present** |
| **`handle-email-suppression`** | Lovable email bounce/complaint webhooks | Tracked (`supabase/functions/handle-email-suppression/`) | Active Deployed | `false` (HMAC) | `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Webhook (HMAC) | **Tracked & Present** |
| **`handle-email-unsubscribe`** | `Unsubscribe.tsx` (raw fetch), direct email links | Tracked (`supabase/functions/handle-email-unsubscribe/`) | Active Deployed | `false` (Token) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Public (Signed Token) | **Tracked & Present** |
| **`market-intelligence`** | `useMarketIntelligence.ts` (raw fetch) | Tracked (`supabase/functions/market-intelligence/`) | Active Deployed | `true` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` (Gemini 2.5 Flash) | Authenticated User | **Tracked & Present** |
| **`mcp`** | External Model Context Protocol clients | Tracked (`supabase/functions/mcp/`) | Active Deployed | `false` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | MCP Protocol / Token | **Tracked & Present** |
| **`preview-transactional-email`** | Admin / internal email template previews | Tracked (`supabase/functions/preview-transactional-email/`) | Active Deployed | `false` (API Key) | `LOVABLE_API_KEY` | Admin / Internal | **Tracked & Present** |
| **`process-email-queue`** | Database cron / worker | Tracked (`supabase/functions/process-email-queue/`) | Active Deployed | `true` | `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Service Role / Worker | **Tracked & Present** |
| **`send-onboarding-nudges`** | Database cron / onboarding pipeline | Tracked (`supabase/functions/send-onboarding-nudges/`) | Active Deployed | `true` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Service Role / Cron | **Tracked & Present** |
| **`send-transactional-email`** | `SignUpForm.tsx` (`functions.invoke`), triggers | Tracked (`supabase/functions/send-transactional-email/`) | Active Deployed | `true` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **Tracked & Present** |
| **`admin-feedback`** | `FeedbackDashboard.tsx` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Admin Only | **BLOCKED (Requires Live Pull)** |
| **`admin-users`** | `UsersDashboard.tsx` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Auth Admin API) | Admin Only | **BLOCKED (Requires Live Pull)** |
| **`analyze-portfolio`** | `useCVAnalysis.ts` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`check-feature-access`** | `featureAccess.ts`, `useSubscription.ts` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`compute-university-insights`** | `UniversityInsightsCard.tsx` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`compute-user-intelligence`** | `useAssessment.ts`, `useOutcomeTracking.ts`, `CVBuilder.tsx` | **Missing** | Deployed | `true` (Expected) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`cv-ai-assistant`** | `CVAIAssistant.tsx` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `LOVABLE_API_KEY` (AI Gateway) | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`delete-account`** | `Settings.tsx` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Auth Admin API) | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`interview-tts`** | `useVoiceInterview.ts` (raw fetch audio blob) | **Missing** | Deployed | `true` (Expected) | `OPENAI_API_KEY` / `ELEVENLABS_API_KEY` / `LOVABLE_API_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`mock-interview`** | `useVoiceInterview.ts` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `LOVABLE_API_KEY` (AI Gateway) | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`send-notification`** | `notifications.ts` (`functions.invoke`) | **Missing** | Deployed | `true` (Expected) | `RESEND_API_KEY` / `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`verify-paystack-payment`** | `PaystackButton.tsx` (raw fetch) | **Missing** | Deployed | `true` (Expected) | `PAYSTACK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Authenticated User | **BLOCKED (Requires Live Pull)** |
| **`scrape-jobs`** | Legacy cron (`daily-job-scrape` @ 6 AM UTC) | **Missing** | Legacy Deployed | `true` (Expected) | Firecrawl / Scraper API | Service Role / Cron | **Legacy (To be unscheduled)** |
| **`generate-module-quiz`** | Historical Learn module | **Missing** | Legacy / Orphaned | `true` | `LOVABLE_API_KEY` | Historical | **Orphaned (Learn table dropped)** |
| **`suggest-courses`** | Historical Learn module | **Missing** | Legacy / Orphaned | `true` | `LOVABLE_API_KEY` | Historical | **Orphaned (Learn table dropped)** |
| **`suggest-free-resources`** | Historical Learn module | **Missing** | Legacy / Orphaned | `true` | `LOVABLE_API_KEY` | Historical | **Orphaned (Learn table dropped)** |

---

## 3. Frontend Call Site & Parameter Mapping for Missing Functions

1. **`admin-feedback`**
   - **File:** `artifacts/syncareer/src/pages/admin/FeedbackDashboard.tsx`
   - **Operations:** Fetches all user feedback items, updates resolution status and admin notes.
   - **Payloads:** `{ action: 'fetch' }`, `{ action: 'update_status', feedbackId, status, adminNotes }`.

2. **`admin-users`**
   - **File:** `artifacts/syncareer/src/pages/admin/UsersDashboard.tsx`
   - **Operations:** Lists users, modifies user roles (`student`, `counsellor`, `admin`), toggles user ban status.
   - **Payloads:** `{ action: 'list' }`, `{ action: 'update_role', userId, role }`, `{ action: 'ban_user', userId, banned }`.

3. **`analyze-portfolio`**
   - **File:** `artifacts/syncareer/src/hooks/useCVAnalysis.ts`
   - **Operations:** Evaluates portfolio items and projects, scores skill alignment.
   - **Payload:** `{ portfolioId, items: [...] }`.

4. **`check-feature-access`**
   - **Files:** `artifacts/syncareer/src/lib/featureAccess.ts`, `artifacts/syncareer/src/hooks/useSubscription.ts`
   - **Operations:** Checks quota limits for free tier vs premium tier (e.g. `ai_coach_session`, `mock_interview`, `cv_export`, `career_assessment`, `job_application`), optionally increments `usage_logs`.
   - **Payload:** `{ feature_key: string, increment: boolean }`.
   - **Response Shape:** `{ allowed: boolean, used: number, limit: number, message?: string, is_premium: boolean }`.

5. **`compute-university-insights`**
   - **File:** `artifacts/syncareer/src/components/dashboard/UniversityInsightsCard.tsx`
   - **Operations:** Computes peer benchmarks and university employment insights for the user's institution and major.
   - **Payload:** `{ university: string, major: string }`.

6. **`compute-user-intelligence`**
   - **Files:** `artifacts/syncareer/src/hooks/useAssessment.ts`, `artifacts/syncareer/src/hooks/useOutcomeTracking.ts`, `artifacts/syncareer/src/pages/CVBuilder.tsx`
   - **Operations:** Aggregates assessment results, resume completeness, and skill data to compute unified Career Readiness scores and Next Best Actions.
   - **Payload:** `{ userId?: string }` (or derives user from auth context).

7. **`cv-ai-assistant`**
   - **File:** `artifacts/syncareer/src/components/cv-builder/CVAIAssistant.tsx`
   - **Operations:** Generates section bullet points, optimizes phrasing for ATS, fixes grammar and impact metrics.
   - **Payload:** `{ section: string, content: string, jobTarget?: string }`.

8. **`delete-account`**
   - **File:** `artifacts/syncareer/src/pages/Settings.tsx`
   - **Operations:** Permanently removes user account, revokes auth credentials via Supabase Auth Admin API, cleans up user data under RLS cascade.
   - **Payload:** None (derives caller from JWT).

9. **`interview-tts`**
   - **File:** `artifacts/syncareer/src/hooks/useVoiceInterview.ts`
   - **Operations:** Synthesizes voice audio blob from interviewer response text.
   - **Payload:** `{ text: string }`.
   - **Response:** Raw audio binary / blob (`audio/mpeg` or `audio/wav`).

10. **`mock-interview`**
    - **File:** `artifacts/syncareer/src/hooks/useVoiceInterview.ts`
    - **Operations:** Manages interactive interview simulator turn generation, answer grading, and final evaluation report generation.
    - **Payloads:**
      - Turn: `{ action: 'answer', interviewId, answer, conversationHistory, sessionLength }`
      - Feedback: `{ action: 'feedback', interviewId }`

11. **`send-notification`**
    - **File:** `artifacts/syncareer/src/utils/notifications.ts`
    - **Operations:** Dispatches multi-channel notification (in-app + email) to a recipient user.
    - **Payload:** `{ userId: string, title: string, message: string, type?: string, link?: string }`.

12. **`verify-paystack-payment`**
    - **File:** `artifacts/syncareer/src/components/payment/PaystackButton.tsx`
    - **Operations:** Verifies Paystack transaction reference against Paystack API, creates/updates active subscription in `subscriptions` table.
    - **Payload:** `{ reference: string, plan: 'monthly' | 'yearly' }`.
    - **Response Shape:** `{ status: 'success' | 'error', message?: string }`.

---

## 4. Tracked Source vs Deployed Drift Analysis

- **Tracked Functions in `supabase/functions/`:**
  - `aggregate-external-jobs`, `alumni-outcomes`, `career-guidance`, `handle-email-suppression`, `handle-email-unsubscribe`, `market-intelligence`, `mcp`, `preview-transactional-email`, `process-email-queue`, `send-onboarding-nudges`, `send-transactional-email`.
- **Drift Observations & Recommendations:**
  - `aggregate-external-jobs`: Pinned to ESM/NPM package imports (`@supabase/supabase-js@2`, `@tamagui/html-parse-core`). Replaces the legacy `scrape-jobs` cron.
  - `career-guidance`: Implements streaming SSE using `LOVABLE_API_KEY` with model `google/gemini-2.5-flash`.
  - `supabase/config.toml`: Accurately registers all 11 tracked functions with their intended `verify_jwt` configurations.
  - **Drift Policy:** When live function sources are pulled via Supabase CLI, do not blindly overwrite existing local implementations. Perform a 3-way diff between deployed and tracked versions to preserve intentional bug fixes while capturing deployed configurations.

---

## 5. Lovable Artifact & Integration Classification

| Artifact / Seam | Location | Classification | Rationale & Operational Role |
|---|---|---|---|
| **`@lovable.dev/cloud-auth-js`** | `package.json`, `artifacts/syncareer/package.json` | `USEFUL INTEGRATION` / `ACTIVE PLATFORM DEPENDENCY` | Provides OAuth flow bindings (`GoogleSignInButton.tsx` via `lovable.auth.signInWithOAuth`). Essential for one-click OAuth login. |
| **`bun.lock` (Root & Workspace)** | Root `bun.lock`, `artifacts/syncareer/bun.lock` | `ACTIVE PLATFORM DEPENDENCY` | Used by Lovable sandbox environment and proxy cache endpoints (`europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/`). Must remain in Git to prevent Lovable build failures. |
| **`src/integrations/lovable/index.ts`** | Root & `artifacts/syncareer/src/integrations/lovable/` | `USEFUL INTEGRATION` | Wrapper around `@lovable.dev/cloud-auth-js` exposing the `lovable` auth interface. |
| **`src/integrations/supabase/types.ts`** | Root `src/` | `HISTORICAL COMPATIBILITY` / `GENERATED CODE DEBT` | Auto-sync target for Lovable database type generation. (Application imports `artifacts/syncareer/src/integrations/supabase/types.ts`). |
| **`LOVABLE_API_KEY` (Secret)** | Supabase Edge Function Secrets | `ACTIVE PLATFORM DEPENDENCY` / `USEFUL INTEGRATION` | Required by `career-guidance`, `alumni-outcomes`, `market-intelligence`, `process-email-queue`, `preview-transactional-email`, `handle-email-suppression`. Authenticates with Lovable AI Gateway and email infrastructure. |
| **`LOVABLE_SEND_URL` (Secret/Env)** | Supabase Edge Function Secrets | `USEFUL INTEGRATION` | Optional override for email dispatch endpoint in `process-email-queue`. |
| **`npm:@lovable.dev/email-js`** | `supabase/functions/process-email-queue/` | `ACTIVE PLATFORM DEPENDENCY` | Deno package for transactional email delivery through Lovable. |
| **`npm:@lovable.dev/webhooks-js`** | `supabase/functions/handle-email-suppression/` | `ACTIVE PLATFORM DEPENDENCY` | Deno package for cryptographic verification of Lovable bounce webhooks. |
| **Cloud Managed Env Vars** | `.env` / Platform runtime (`VITE_SUPABASE_*`) | `ACTIVE PLATFORM DEPENDENCY` | Provided automatically by Lovable Cloud; required for client builds. |
| **`.lovable/plan.md`** | `.lovable/plan.md` | `HISTORICAL COMPATIBILITY` | Audit log from prior automated cleanup passes. Retained for historical context. |

> The repository-wide classification of **all** platform artifacts (Replit, Lovable,
> GPT Engineer, Clerk, PWA, duplicate package managers), including what was removed
> during platform cleanup and the evidence for each decision, lives in
> [`PLATFORM_ARTIFACT_INVENTORY.md`](./PLATFORM_ARTIFACT_INVENTORY.md).

---

## 6. Required Secrets Matrix (Names Only)

*Never commit secret values. For this Lovable Cloud backend, configure them only through Lovable's Cloud secret UI/approved chat flow. A personal Supabase Dashboard or `supabase secrets set` is not an approved substitute for Cloud ownership.*

| Secret Name | Consuming Edge Functions | Purpose |
|---|---|---|
| **`SUPABASE_URL`** | All edge functions | Supabase project endpoint |
| **`SUPABASE_ANON_KEY`** | `mcp` | Client / anon database access |
| **`SUPABASE_SERVICE_ROLE_KEY`** | `aggregate-external-jobs`, `alumni-outcomes`, `handle-email-suppression`, `handle-email-unsubscribe`, `market-intelligence`, `process-email-queue`, `send-onboarding-nudges`, `send-transactional-email`, `admin-feedback`, `admin-users`, `check-feature-access`, `compute-user-intelligence`, `delete-account`, `verify-paystack-payment` | Bypasses RLS for system operations, queue processing, and admin management |
| **`LOVABLE_API_KEY`** | `career-guidance`, `alumni-outcomes`, `market-intelligence`, `preview-transactional-email`, `handle-email-suppression`, `process-email-queue`, `cv-ai-assistant`, `mock-interview`, `analyze-portfolio` | Lovable AI Gateway LLM inference & email webhook authentication |
| **`LOVABLE_SEND_URL`** *(Optional)* | `process-email-queue` | Custom email sending endpoint override |
| **`FIRECRAWL_API_KEY`** | `aggregate-external-jobs`, `alumni-outcomes`, `scrape-jobs` | Web crawling for external job aggregation & alumni data |
| **`PAYSTACK_SECRET_KEY`** | `verify-paystack-payment` | Payment verification with Paystack API |
| **`RESEND_API_KEY`** *(Optional)* | `send-notification` | Direct email delivery if configured alongside Lovable email |
| **`OPENAI_API_KEY` / `ELEVENLABS_API_KEY`** | `interview-tts` | Text-to-speech audio synthesis for Voice Interview Mode |

---

## 7. Current Lovable-supported recovery runbook

> **Supersedes the earlier personal-Supabase-CLI guidance.** This backend is Lovable Cloud. Do not run `supabase link`, remote `db pull`/`db dump`, remote type generation, migration repair, or function downloads against project reference `fsorkxlcasekndigezlx` through a developer's personal Supabase account.

1. Open the Syncareer project in Lovable and select **Cloud -> Edge functions**.
2. For each deployed function, use **View code** and Lovable's existing Git synchronization to recover the deployed source. Record the environment and deployed update timestamp. Do not reconstruct a function from its frontend call site.
3. Compare the recovered source with both the current working tree and historical Git source. Git history contains older versions of several currently missing functions, but historical source is not proof of what is deployed now.
4. Ask Lovable support for an export of deployed function source/configuration if **View code** or Git sync cannot recover it. Request code and non-secret configuration only; never request or copy secret values.
5. Save confirmed source under `supabase/functions/<function-name>/`, update `supabase/config.toml` only from confirmed configuration, and review without deploying.

Database schema/export/type reconciliation is documented separately in [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md). That runbook also records Lovable Cloud's supported full-database export, its schema-only portability gap, and the required no-production-change workflow.
