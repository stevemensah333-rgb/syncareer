This is a large refactor. I'll ship it in ordered, low-risk passes so the app is buildable after each step. Nothing here changes business logic except where listed (subscription tiers, analytics).

## Phase 1 — Deletions (safe, biggest wins fast)

1. **Repo doc cleanup**
   - Move all root `*.md` / `*.txt` / `*.sql` planning docs (COUNSELLOR_*, IMPLEMENTATION_*, ERROR_REPORT, LAUNCH_CHECKLIST, PHASE_1_*, QUICK_START, SETUP_GUIDE, URL_GUIDE, VERIFICATION_*, README_FIRST, DATABASE_SCHEMA.sql, etc.) into `/docs/archive/`.
   - Keep at root: `README.md`, `replit.md`, `PUBLISH_TROUBLESHOOTING.md`.
2. **Drop unused workspace packages** from `pnpm-workspace.yaml` and delete folders:
   - `artifacts/api-server/`
   - `artifacts/mockup-sandbox/`
   - `artifacts/syncareer-mobile/`
   - `lib/api-client-react/`, `lib/api-spec/`, `lib/api-zod/`, `lib/db/`
   - `scripts/` (only contains a hello placeholder)
3. **Strip Apple OAuth scaffolding** in `src/integrations/lovable/index.ts` (narrow `OAuthProvider` to `"google"`).

## Phase 2 — Analytics consolidation

- Keep **PostHog** (already wired across the app via `analyticsEvents.ts` + `usePageTracking.ts`).
- Remove **Sentry**: delete `services/sentry.ts`, all imports, `initializeSentry()` from `main.tsx`, and `@sentry/react` from `package.json`.
- Remove **Web Vitals** wiring (`lib/webVitals.ts`) — PostHog autocaptures performance.

## Phase 3 — Performance budget

- **Lazy i18n**: switch `i18n/config.ts` from preloading 10 language bundles to `i18next-http-backend` style dynamic import per language (only `en` eager).
- **Defer PostHog**: move `initializeAnalytics()` into a `requestIdleCallback` (fallback `setTimeout(_, 2000)`) inside `main.tsx`.
- Confirm PWA precache stays under 5 MB.

## Phase 4 — Offline scope reduction

- Keep offline only for: Assessment, Interview practice questions.
- Delete: `useOfflineDraft.ts` usage in CV Builder, `OfflinePracticeMode.tsx` if unused, `CachedDataIndicator.tsx`.
- Simplify `OfflineBanner.tsx` to a one-line "Check your connection" toast that only shows after a real failed fetch (already partially done).

## Phase 5 — Tour/help removal

- Delete `TourProvider`, `TourOverlay`, `QuickTour.tsx`, `helpContent.ts`, tour analytics events.
- Replace any "Start tour" CTA with empty-state inline hints already present on each page.

## Phase 6 — Subscription simplification

- Collapse to 2 tiers: **Free** and **Pro**. Remove any intermediate tier logic in `featureAccess.ts`, `subscriptionService.ts`, `SubscriptionManager.tsx`, Pricing page.
- Keep Paystack integration as-is; only the tier list changes.
- Edge function `check-subscription-limits` (if present) keeps its current Pro gates; Free becomes the default else branch.

## Phase 7 — Navigation consolidation (4 sections)

New sidebar/mobile-nav structure:

```text
Home       → /dashboard   (Dashboard, includes Career Readiness + next action)
Build      → /build       (tabs: CV | Portfolio | Learn)
Practice   → /practice    (tabs: Interview | AI Coach)
Apply      → /apply       (tabs: Opportunities | Applications)
```

- Add 3 new wrapper pages (`Build.tsx`, `Practice.tsx`, `Apply.tsx`) using shadcn `Tabs`. Each tab renders the existing page content extracted into a sub-component.
- Keep old routes (`/cv-builder`, `/portfolio`, `/learn`, `/interview-simulator`, `/ai-coach`, `/opportunities`, `/applications`) as `<Navigate>` redirects to the new tabbed routes with `?tab=…`.
- Update `Sidebar`, `MobileBottomNav`, `Onboarding` next-step links, and any `useNavigate` calls to the new paths.
- Settings, Counsellor routes, Admin routes unchanged.

## Phase 8 — Dashboard "Next Best Action"

- Replace generic Getting Started checklist with a single prominent card driven by a new `useNextBestAction()` hook:
  - If readiness < 30: "Take the 45-question Career Assessment"
  - Else if no CV: "Build your CV in 5 minutes"
  - Else if CV strength < 70: "Add a quantified bullet to your strongest role"
  - Else if no interview practice in 7d: "Practice 1 behavioural question"
  - Else if no application in 14d: "Apply to a matched role"
- Each action deep-links to the precise step.

## Phase 9 — Counsellor focused dashboard

Rebuild `CounsellorDashboard.tsx` with three cards above the fold:
- **Today's Sessions** (count + list of next 3 with join links)
- **Pending Notes** (sessions ended >24h ago without notes)
- **This Month** (sessions completed, clients active, revenue if Paystack data present)

Below: existing client list + availability summary.

## Technical notes

- Each phase is its own commit-equivalent batch; I'll typecheck after each.
- i18n lazy-load uses i18next's `resources` removed in favour of `import()` per namespace.
- Tour removal: search-and-delete `<TourProvider>` and `<TourOverlay>` usages, then `rm` the files.
- Subscription tier collapse: keep DB columns intact; only the UI + access map change. No migration.
- Old route redirects preserve external links and deep links from emails/notifications.

## Out of scope

- No DB schema changes.
- No edge function changes (except removing analytics-server endpoints if any — none found).
- No visual restyle beyond the new tab wrappers.

## Risk

The nav consolidation (Phase 7) touches the most files. If anything breaks, the redirects will keep old URLs functional while we patch.
