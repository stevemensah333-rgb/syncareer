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

### Assessment flow

```
Assessment.tsx
  ├── guest: calculateScoresLocally(answers)  (deterministic RIASEC)
  └── authed: supabase.from('assessments').insert(...) + assessment_responses
             → invoke('compute-user-intelligence') (deployed-only) to refresh
               Career Readiness / Next Best Action
```

### CV strength flow

```
CVBuilder.tsx ──► useCVStrengthScore.ts (pure, deterministic 0–100 + label)
  ├── save/load via supabase (resumes)
  └── AI assistant + skill-gap via deployed-only edge functions
```

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
