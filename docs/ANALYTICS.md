# Analytics event model — Syncareer

> Status as of 2026-08-11: typed catalogue is implemented, capture is **disabled** in production because `VITE_POSTHOG_API_KEY` and `VITE_ANALYTICS_CAPTURE_ENABLED` are absent and consent gating requires explicit opt-in. No dashboards are claimed until verification in the configured PostHog project. This document requires owner confirmation for retention/deletion assumptions.

## 1. Configuration and consent verification

### PostHog is actually configured?
- **Result:** No. `.env` (tracked publish env) contains only three Supabase keys. `.env.example` lists `VITE_POSTHOG_API_KEY` as optional, empty.
- Check performed: `grep` for env vars, read `services/analytics.ts` which requires both `VITE_POSTHOG_API_KEY` non-empty **and** `VITE_ANALYTICS_CAPTURE_ENABLED === 'true'`.
- Code path: `captureEnabled()` + `apiKeyConfigured()` → `canCaptureAnalytics()` → early return, no `import('posthog-js')`, queue never loads.
- Action: keep production capture disabled per prompt. Owner must set key in Lovable publish env **and** enable explicit consent UI before enabling `VITE_ANALYTICS_CAPTURE_ENABLED=true`.

### Consent required?
- Target users: African university students and recent graduates (Ghana primary per `Pricing` GH₵). Ghana Data Protection Act requires notice and consent for non-essential tracking. Any EU users (study abroad, diaspora) trigger GDPR/ePrivacy opt-in.
- Current posture: opt-in only (`syncareer.analytics_consent` must be `granted`). Also respects `navigator.doNotTrack === '1'`. Assessment has a second key `syncareer.assessment_analytics_consent`.
- PrivacyPolicy §6 mentions analytics cookies where consented — consistent.
- Implementation: `getAnalyticsConsent`, `canCaptureAnalytics`, `setAnalyticsConsent` with queue clearing + `opt_out_capturing` + `reset` on denial. Assessment lifecycle also checks its own consent before calling `captureProductEvent`, which re-checks global consent.
- Pseudonymity: raw `userId` is never sent. `pseudonymousId` hashes `syncareer-analytics-v1:${userId}` with SHA-256. `identifyAnalyticsUser` sends only hashed id + `user_role` enum (student / career_counsellor / unknown). `resetAnalyticsIdentity` on sign-out.
- No CV content, messages, transcripts, job descriptions, names, emails collected — enforced by `ANALYTICS_PROPERTY_KEYS` allowlist and coarse enums only.

## 2. Typed catalogue

Source: `artifacts/syncareer/src/services/analyticsEvents.ts` (single source of truth). Runtime enforcement in `services/analytics.ts` via `hasOnlyCatalogueProperties`.

### Property rules
- No free-text payloads. All properties are enums, booleans, coarse buckets, or limited strings from a closed set.
- Raw identifiers (job IDs, opportunity raw text, CV text) are never sent. Where an entity is referenced, only `source_kind` (`external`/`native`) or `surface` enum is sent.
- Contextual AI: `context_count_bucket` (`1`/`2`/`3_plus`) + `includes_optional_personal_context` boolean — no context content.

### Event catalogue with product question, owner, and retention hint

> Retention assumption is **30 days raw, 90 days aggregated, then deletion**, unless owner confirms otherwise. PostHog project must have data-deletion workflow enabled. Owner confirmation required before enabling.

| Event | Product question it answers | Properties (coarse) | Owner | Retention hint (needs confirmation) |
|---|---|---|---|---|
| `page_viewed` | Which routes are actually visited? Where do users drop? | `route`: enum of 12 top-level routes, never raw pathname/query | Product / Growth | 30d raw, 90d aggregated |
| `public_cta_selected` | Which CTA placement drives sign-up intent? | `destination` (`opportunities`/`assessment`), `placement` (`header`/`hero`/`final`) | Growth | same |
| `sign_up_started` | How many start sign-up and with which method/role? | `method` (`email`/`google`), `user_role` enum | Growth | same |
| `account_created` | What fraction finishes creation? Confirmation required bottleneck? | `method`, `user_role`, `confirmation_required` boolean | Growth | same |
| `onboarding_completed` | Do new users complete onboarding? | `user_role` | Product | same |
| `opportunities_viewed` | Is the opportunities tab used? All vs saved? | `view` (`all`/`saved`) | Product | same |
| `opportunity_saved` | What supply leads to saves? External vs native? | `source_kind` | Product | same |
| `opportunity_marked_applied` | Do users act on external apply flow? | `source_kind` | Product | same |
| `application_created` | Where do tracker rows originate (opportunity vs manual)? | `origin` (`opportunity`/`manual`) | Product | same |
| `application_next_action_set` | Are users setting next actions? With due dates? | `has_due_date` boolean | Product | same |
| `application_stage_recorded` | Which stages occur? Where do applications stall? | `stage` enum (considering/applied/interview/offer/other) | Product | same |
| `application_outcome_recorded` | Final outcomes distribution? | `outcome` (offered/rejected/withdrawn) | Product | same |
| `cv_started` | How do users enter CV builder? Navigation vs opportunity vs application? | `entry` enum | Product | same |
| `cv_meaningful_section_completed` | Which CV sections are easiest/hardest to complete? | `section` enum (personal/education/experience/projects/activities/skills) | Product | same |
| `cv_save_finished` | Save success rate and failure reasons? | `result` (success/failure), `failure_code` coarse | Product / Eng | same |
| `cv_previewed` | Do users preview before export? | none | Product | same |
| `cv_exported` | Export success/failure, format | `result`, `format` (`pdf`) | Product | same |
| `interview_setup_opened` | Entry to interview setup (nav vs app vs opp)? | `entry` | Product | same |
| `interview_device_checked` | Device readiness distribution (ready/missing/denied/failed)? | `result` enum | Eng | same |
| `interview_session_started` | Sessions actually started? | `mode` (`voice`) | Product | same |
| `interview_session_finished` | Completion vs failure and failure reasons? | `result` (completed/failed), `failure_code` coarse | Product / Eng | same |
| `interview_retried` | Where do retries happen (device vs session)? | `from` (device/session) | Eng | same |
| `assessment_started` | Top-of-funnel start rate (public route)? | none | Product | same |
| `assessment_progress` | Drop-off by progress buckets? | `progress_bucket` 25/50/75 | Product | same |
| `assessment_abandoned` | Abandonment point? | `progress_bucket` 0/25/50/75 | Product | same |
| `assessment_resumed` | Resume attempt frequency? (resume not supported, but track intent) | `progress_bucket` | Product | same |
| `assessment_completed` | Completion rate among starters? | none | Product | same |
| `contextual_ai_requested` | Which AI tasks are requested? With how much context? Personal context included? | `task` enum (9 tasks), `context_count_bucket`, `includes_optional_personal_context` boolean | Product / AI | 30d raw, no prompt/content stored |
| `contextual_ai_finished` | Success vs failure and failure codes? | `task`, `result` (success/failure), `failure_code` coarse | Product / AI | same, no content |
| `contextual_ai_decided` | Do users accept/reject/undo proposals? | `task`, `decision` (accepted/rejected/undone) | Product / AI | same |
| `contextual_learning_actioned` | For a skill/requirement, what learning action is chosen? | `surface` (opportunity/application/cv), `action` (already_know/learning/practice_selected/resource_requested/not_relevant/evidence_opened) | Product / Learning | same |

Owners:
- Product: Syncareer product lead (funnel, acquisition, retention)
- Growth: marketing / acquisition
- Eng: engineering (reliability, device, save failures)
- AI: AI cost / quality
- Learning: content & skill gap

## 3. Identity transition (stable anonymous → authenticated)

- Anonymous: PostHog generates anonymous distinct_id, stored in localStorage+cookie (if consent granted).
- On sign-in: `AnalyticsBridge` in `App.tsx` calls `identifyAnalyticsUser(rawUserId, role)`. Raw ID is hashed SHA-256 with prefix `syncareer-analytics-v1:`; only hash leaves the browser.
- `posthog.identify(hash, { user_role })` aliases anonymous → pseudonymous.
- On sign-out: `resetAnalyticsIdentity()` → `posthog.reset()`.
- On consent denial: queue cleared, `opt_out_capturing()` + `reset()`.

All paths are try/catch; identity failures log generic warning in DEV only, never payload.

## 4. Wiring (page tracking once)

- `usePageTracking` uses `useLocation().pathname` → `routeCategory()` → coarse enum. Query strings and IDs never captured.
- Mounted once in `App.tsx` via `AnalyticsBridge` below `BrowserRouter`. No other component calls `usePageTracking`.
- `initializeAnalytics` lazy-loads `posthog-js` on first user interaction (`pointerdown`, `keydown`, `scroll`) or idle, after consent check. Queued events replay after `loaded` callback.

## 5. Failure isolation

- `safeCapture`: try/catch around `client.capture`.
- `captureProductEvent`: validates catalogue keys + value types before any network work; if invalid, drops silently (no throw).
- All call sites wrap in try/catch where UI flow must not break (CV save, interview, contextual assistant, learning).
- Dev console warnings are generic (`[Analytics] Provider unavailable`, `[Analytics] Capture failed`) — never log event names with PII or instruction content. CV persistence logs only category/code per existing pattern.

## 6. Tests

- `services/analytics.test.ts`: consent gating (unknown/denied/granted, DNT, missing key, disabled flag), property validation (rejects raw URLs, nested objects), queue replay, no-throw on capture error, pseudonymous hash length & non-leak, catalogue integrity (all required funnel names present).
- `features/assessment/lifecycle.test.ts`: opt-in, bucket mapping, no answer leakage, consent storage.
- `hooks/usePageTracking` routeCategory unit implicitly via analytics test.
- Manual scenarios (see prompt):
  - landing CTA → should not throw, queued until consent, no network if disabled
  - sign-up start → granted consent → event visible in PostHog (if enabled)
  - opportunities viewed/saved/marked applied → coarse source_kind only
  - application created → origin opportunity vs manual
  - CV started → entry inferred, meaningful section emits once per section
  - CV save failure → failure_code coarse, no content
  - interview device check → ready/missing/denied/failed
  - assessment progress buckets → 25/50/75 only
  - contextual AI requested → task + bucket + personal boolean, no instruction
  - contextual learning actioned → surface + action only

## 7. What is still disabled / needs owner approval

- Enablement: set `VITE_POSTHOG_API_KEY` in Lovable publish env **and** `VITE_ANALYTICS_CAPTURE_ENABLED=true`. Do **not** enable without:
  1. Consent banner UI that calls `setAnalyticsConsent('granted'|'denied')` and persists choice. Currently consent key must be manually set or via future banner.
  2. Updating PrivacyPolicy to describe PostHog, retention, opt-out path.
  3. Confirming retention/deletion schedule with owner (default assumption 30d raw / 90d aggregated).
  4. Verifying no PII in PostHog project settings (disable session recording, autocapture, pageleave — already disabled in code).
- Do not change remote PostHog settings without approval per prompt.
- No dashboard creation until verified flowing.

## 8. Lovable artifact classification

- `posthog-js` dependency: **USEFUL INTEGRATION** (analytics, not platform core)
- `src/services/analytics.ts` & `analyticsEvents.ts`: **ACTIVE PLATFORM DEPENDENCY** (product decision measurement)
- `src/hooks/usePageTracking.ts`: **ACTIVE PLATFORM DEPENDENCY** (single page tracking mount)
- `src/integrations/lovable/index.ts`: **ACTIVE PLATFORM DEPENDENCY** — unrelated to analytics, kept.
- `career-guidance` edge function: **USEFUL INTEGRATION** (Lovable AI gateway). Analytics around it does not mutate it.
- No PostHog env printed, no secrets logged.

## 9. Verification commands

```bash
# Ensure no workflows changed
git diff -- .github/workflows

# Typecheck
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit

# Tests (analytics)
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vitest run src/services/analytics.test.ts src/features/assessment/lifecycle.test.ts

# Full suite (some pre-existing failures in unrelated files)
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vitest run
```
