# Architecture & Data Flow

This is the **current** architecture. Older docs (e.g. `replit.md`,
`docs/archive/`) reference an Express API server, employer dashboards, and an
offline PWA — **none of those exist in the current code**. They are historical.

## System overview

```
Browser (React + Vite SPA in artifacts/syncareer)
   │
   ├── @supabase/supabase-js client ──► Supabase PostgREST/Postgres (public schema + RLS)
   │                                     │
   │                                     ├── database triggers & SECURITY DEFINER functions
   │                                     └── storage (avatars, documents, videos)
   │
   ├── Supabase Auth (email/password) ──► auth.users  ──► profiles (auth.uid())
   │
   ├── Lovable Google OAuth (@lovable.dev/cloud-auth-js) ──► session tokens → supabase.setSession
   │
   └── Supabase Edge Functions (verified JWT) ──► service_role / AI gateway / external APIs
         (only some are tracked in supabase/functions/; many are deployed-only)
```

There is **no Express/Node API server**. All server-side work is Supabase.

## Frontend (React/Vite)

- Location: `artifacts/syncareer/`.
- Entry: `src/main.tsx` → `src/App.tsx` (router in `App.tsx`).
- Auth boundary: `src/lib/auth.tsx` (`AuthProvider`, `useAuth`) backed by
  `supabase.auth`. `useAuth` provides all auth properties and `signOut`; legacy
  Clerk-shaped names (`useClerk`) were removed after migrating verified call sites.
- Analytics boundary: `src/services/analytics.ts` owns PostHog initialization,
  identity, page views, and event tracking (`trackEvent`, `EVENTS`).
- Notifications boundary: authoritative notifications are managed by Supabase
  (`src/hooks/useNotifications.ts`, `src/utils/notifications.ts`, table `notifications`).
  Legacy localStorage notifications were removed as duplicate.
- Route prefetch: `src/lib/routePrefetch.ts` warms role-based dynamically imported
  page chunks during browser idle time.
- Integration seams:
  - `src/integrations/supabase/client.ts` — Supabase client.
  - `src/integrations/supabase/types.ts` — generated DB types.
  - `src/integrations/lovable/index.ts` — `lovable.auth.signInWithOAuth` wrapper.

## Data flow (typical authenticated request)

1. User signs in via email/password (Supabase Auth) or Google OAuth (Lovable →
   tokens → `supabase.setSession`).
2. `profiles.id` equals `auth.uid()`; RLS policies scope every `public` table
   read/write to the caller.
3. Client reads/writes through `supabase.from(...)`. RLS and triggers enforce
   ownership, role immutability, and payment restrictions.
4. AI / payment / email operations call edge functions (JWT-verified) which use
   `service_role` only for legitimate system operations, then return typed JSON.

### Onboarding flow

`/onboarding` restores `profiles` plus the role-specific `student_details` or
`counsellor_details` row before editing. It uses the role already provisioned at
signup and never treats a browser role selector as authorization. Role details
are upserted first; only after that succeeds is `profiles.onboarding_completed`
updated. Initial read failures, unsupported roles, validation failures, RLS
failures, and network failures have visible retry-safe states.

The canonical mentor profile role remains internally named `career_counsellor`. Repository
migration `20260811153000_fix_counsellor_onboarding_role.sql` corrects the
`counsellor_details` INSERT policy while retaining both `auth.uid() = user_id`
and the stored-profile role check. It does not permit client-side role changes.
As with every Lovable Cloud migration, repository presence is not proof of Live
application; an approved Lovable change and post-apply RLS verification are
still required. Before an approved apply, use a verified isolated restore and
confirm that an owner with stored role `career_counsellor` can insert their own
row while students and cross-owner writes remain denied; then run
`supabase/tests/rls_authorization_matrix.sql`. The compensating SQL is
`supabase/rollback/counsellor_onboarding_role_policy_rollback.sql`; it restores
the previous policy and therefore deliberately restores the counsellor setup
failure.

The active product no longer schedules counsellor sessions. The additive mentor
request boundary is documented in `docs/MENTORSHIP_SERVICE.md`. Profile discovery
reads an approved, privacy-limited view; request creation and state transitions
run through authorization-checking database functions; accepted introductions
use the existing transactional email queue through a service-only outbox. Legacy
booking/session tables are retained for recovery and are not the active workflow.

### Home/dashboard flow

`features/dashboard/data.ts` is the read seam for `/dashboard`. It settles
assessment, application, save, and CV requests independently so a secondary
source cannot discard data from successful sources. It reads only verified Live
columns. Since Live `saved_jobs` does not currently expose a foreign-key
relationship to PostgREST, saved IDs and shared `job_postings` details are read
in two queries. See [`DASHBOARD_CONTINUATION_RULES.md`](./DASHBOARD_CONTINUATION_RULES.md).

### Assessment flow

```
Assessment.tsx
  ├── guest: calculateScoresLocally(answers)  (deterministic RIASEC)
  └── authed: supabase.from('assessments').insert(...) + assessment_responses
             → invoke('compute-user-intelligence') (deployed-only) to refresh
               Career Readiness / Next Best Action
```

### CV completion and quality flow

```
CVBuilder.tsx ──► useCVStrengthScore.ts
  ├── completion: pure deterministic meaningful-content percentage (0–100%)
  ├── quality: separate deterministic writing/evidence guidance (0–100)
  ├── confirmed save/load via Supabase (resumes)
  └── AI assistant + skill-gap via deployed-only edge functions
```

The score rules, create/update contract, save states, JSON compatibility for
Activities, and schema evidence boundary are documented in
[`CV_BUILDER_PERSISTENCE.md`](./CV_BUILDER_PERSISTENCE.md).

### Opportunity → application flow

The saved opportunity / tracked application is the central product object of the
"Apply" pillar. Both `/opportunities` (`pages/Markets.tsx`) and `/applications`
(`pages/ApplicationTracker.tsx`) are list + detail surfaces over the same
`job_postings` / `saved_jobs` / `job_applications` tables; the tracker detail is a
right-hand sheet (`components/applications/ApplicationDetailSheet.tsx`) so list
context is preserved.

```
Markets.tsx (job_postings, is_external = true)
  ├── save          → saved_jobs (user_id, job_id)                 [saved tab]
  ├── apply external → source_url (new tab) + "I applied — start tracking"
  │                     → startTrackingApplication() → job_applications insert
  │                       (applicant_id, job_id, status='pending')
  ├── apply native  → startTrackingApplication() (same insert seam)
  └── open tracker  → /applications?application=<id>

ApplicationTracker.tsx (job_applications ⋈ job_postings, applicant-owned)
  ├── status update → updateApplicationStatus()  → job_applications.status
  ├── notes         → saveApplicationNotes()     → job_applications.notes
  ├── outcome       → updateOutcome()/trackAction() (recommendation feedback)
  └── remove        → removeApplicationRecord()  → delete (confirmed dialog)
```

- The write seam is `features/application-tracker/tracking.ts`; it is
  duplicate-safe (read-before-write + unique-violation mapping), scopes every
  query to `applicant_id`, and classifies errors into safe user-facing
  categories (auth-expired / permission / network / server).
- The status vocabulary and journey (`Applied → In review → Interview → Offer →
  Outcome`) live in `features/application-tracker/workflow.ts`, re-exported by
  the Home/dashboard helpers; unknown stored statuses are tolerated and surfaced
  honestly, never guessed.
- CV and interview functionality are connected where the schema permits:
  `job_applications.resume_url` is displayed when present, the user's primary CV
  (`resumes.user_id + is_primary`) is shown as the targeted CV, and the CV
  builder / interview simulator are reached via context deep links
  (`/cv-builder?targetRole=…`, `/interview-simulator?role=…&skills=…`), which the
  simulator pre-fills. There is no FK between those features and
  `job_applications`, so the links are the safe integration boundary.
- Honesty rules: `job_postings` carries no verification/freshness evidence, so
  opportunities always render provenance (source, source URL, posted/updated
  timestamps) with an explicit "not independently verified" note, never claim a
  listing is current, and show missing fields (deadline, salary, experience
  level, organisation) as explicitly absent. Required-but-not-applied schema
  migrations for verification evidence, per-application CV targeting, and a
  status CHECK constraint are reported in [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md) §13.

### Payment / subscription flow

See [`PAYMENT_AND_SUBSCRIPTIONS.md`](./PAYMENT_AND_SUBSCRIPTIONS.md).

## Backend data model

- Application tables live in `public`, RLS-enabled, ownership keyed on
  `auth.uid()`.
- Key domains: profiles/roles, student details, assessments/assessment_responses,
  resumes, job_postings/saved_jobs/job_applications, counsellor_details /
  counsellor_availability / counsellor_bookings / counsellor_sessions /
  counsellor_reviews / counsellor_messages / counsellor_credentials,
  payments, subscriptions, usage_logs, notifications, referrals, email
  infrastructure tables.
- Critical enforcement lives in triggers + SECURITY DEFINER functions:
  - `enforce_counsellor_session_updates` (payment fields + client-only-cancel).
  - `enforce_counsellor_booking_updates` (immutable user_id/counsellor_id).
  - `prevent_client_payment_escalation` (historical; replaced by the above).
  - `get_profile_user_type`, `has_role`, `is_counsellor_owner`,
    `user_has_counsellor_booking`, `get_my_referral_code` (role/ownership helpers).
- Email queue RPCs (`enqueue_email`, `read_email_batch`, `delete_email`,
  `move_to_dlq`) are granted to `service_role` only.

> **Schema status:** `supabase/migrations/` is **not** a complete baseline. See
> [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md) before reconstructing
> or applying schema.

## Trust boundaries (diagram)

```
┌─ Client (browser) ─────────────────────────────────────────────┐
│  Route guards = UX only.  NO trust for authorization.          │
└───────────┬────────────────────────────────────────────────────┘
            │ JWT (authenticated)
            ▼
┌─ Supabase Auth ────────────────────────────────────────────────┐
│  auth.users  ·  profiles.id = auth.uid()  ·  RLS on public     │
│  tables enforce ownership / role / payment rules.              │
└───────┬───────────────────────────────────┬────────────────────┘
        │ public via RLS                    │ edge functions
        ▼                                   ▼
┌─ Public tables ────────────┐   ┌─ Edge functions (verify_jwt) ─┐
│  user rows (owner only)    │   │  service_role / AI gateway /   │
│  counsellor read scope     │   │  Paystack / email / webhooks   │
└────────────────────────────┘   └────────────────────────────────┘
```

- **Authenticated users** may touch only their own rows (RLS).
- **Counsellors** additionally see their own counsellor domain rows and public
  client-facing data; they cannot read other users' private data.
- **Service role** (edge functions) may perform system/admin operations
  (payment webhook, email queue, admin tools). It is never exposed to the client.
- **Payment/usage gates are enforced server-side** (edge function + RLS); a
  browser-only check is not a security control.

## Service worker (decommission)

The repo ships **no offline PWA**. `artifacts/syncareer/public/sw.js` and the
`removeLegacyBrowserCaches()` helper in `src/main.tsx` are **decommission code**:
on load they unregister any legacy service workers and delete browser caches.
There is no `vite-plugin-pwa`, no `offline.html`, and no offline-banner UI.

## Related docs

- [`EDGE_FUNCTIONS.md`](./EDGE_FUNCTIONS.md) — function inventory & deployment.
- [`SCHEMA_RECONCILIATION.md`](./SCHEMA_RECONCILIATION.md) — schema & types.
- [`LOVABLE_INTEGRATION.md`](./LOVABLE_INTEGRATION.md) — platform boundaries.
- [`PAYMENT_AND_SUBSCRIPTIONS.md`](./PAYMENT_AND_SUBSCRIPTIONS.md) — payments.
- [`INCIDENT_RECOVERY.md`](./INCIDENT_RECOVERY.md) — recovery.
