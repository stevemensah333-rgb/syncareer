# Syncareer frontend audit & implementation map

**Date:** 2026-08-10
**Stage:** Audit only; no product behavior changed
**Frontend source of truth:** `artifacts/syncareer/`

> **Superseded note (2026-09-04):** rows in this audit that describe
> Pricing/Subscription/Paystack/premium behaviour describe the removed
> monetization model. The product is now free: no plans, no premium gates, no
> subscription UI. `PaystackButton`, `Pricing.tsx`, `SubscriptionSuccess.tsx`,
> `SubscriptionManager`, `subscriptionService`, `useSubscription`,
> `featureAccess`, and `ReferralCard` were removed; `/pricing` and
> `/subscription-success` redirect to `/`. See
> [`FREE_SERVICE_AND_SUPPORT.md`](./FREE_SERVICE_AND_SUPPORT.md).
**Evidence boundary:** This is a repository audit. Live Lovable Cloud/Supabase rows, deployed-only Edge Function source, invocation counts, jobs, PostHog dashboards, and provider spend were not available in this checkout. Findings that depend on those sources are explicitly marked unknown.

> Point-in-time note (2026-08-11): the CV `firstName`/`fullName` scoring mismatch,
> conflated completion/quality display, Activities reload loss, and save-state/error gaps
> identified below have since been repaired. The current contract is
> [`CV_BUILDER_PERSISTENCE.md`](./CV_BUILDER_PERSISTENCE.md); the audit text remains as the
> evidence that motivated that focused repair.

## Executive summary

Syncareer already has the foundations for the intended career-launch loop:

> assessment → CV → interview practice → opportunities → applications → outcome feedback

The current app is real rather than a static prototype: Supabase Auth/RLS reads and writes are present, the assessment scorer is deterministic, CV persistence has dedicated tests and error classification, job aggregation is a tracked Edge Function, and the voice interview/AI coach/payment paths have explicit backend seams.

The main implementation risks before a visual redesign are continuity and truthfulness, not missing UI primitives:

1. **The student IA has two layers of hubs.** Desktop/mobile navigation exposes `Home / Build / Practice / Apply`, while the route hierarchy also has first-class `Opportunities`, `Applications`, `CV Builder`, `Analysis`, `Interview Simulator`, and `SynAI`. `/build` is a one-card hop to `/cv-builder`; `/apply` is a three-card hop to existing destinations. This is the largest information-architecture problem.
2. **The application loop is disconnected for the currently rendered jobs.** `Markets.tsx` filters to `is_external = true`, and external jobs open a source URL. The `job_applications` insert branch is only reachable for non-external jobs, so an external application does not become a tracker row. The tracker is real for existing rows, but the primary discovery-to-tracking path is incomplete.
3. **The CV has a persistence/display contract mismatch.** The builder saves `firstName`/`lastName`, while the dashboard and `useUserContext` score/name helpers look for `fullName`/`full_name`. Activities are explicitly dropped on reload because `resumes` has no activities column. The builder's tested deterministic score is not the same score shown in Dashboard.
4. **Counsellor operations contain schema-era drift.** `CounsellorClients.tsx` queries `student_id`, `booking_date`, `session_type`, and a `profiles` shape that do not match the current app-generated `counsellor_bookings`/`profiles` types. Its notes are explicitly local-only. `SessionsManager` renders Message/Start Session controls without handlers. Credential code uses a different counsellor profile shape and is therefore live-schema-sensitive.
5. **The product is not currently measurable through its intended PostHog vocabulary.** `main.tsx` can lazy-load PostHog, but `.env` contains no PostHog key and `usePageTracking` has no runtime importer. The event catalog and convenience helpers have no product call sites beyond tests/unused modules. Do not make usage-based feature removals until analytics evidence exists.
6. **The landing page mixes a strong editorial system with unsupported claims and stale links.** It includes hard-coded claims such as `2,400+`, `12+ partner universities`, `94% completion rate`, and “thousands,” and several landing/footer CTAs navigate to `/counsellors`, which is not a route. These are content/link integrity issues, not a reason to remove counsellor workflows.
7. **The token foundation is worth preserving, but implementation is split.** Shadcn/Radix primitives, CSS variables, semantic colors, Inter, Instrument Serif, reduced-motion support, skip links, error boundaries, and skeletons are useful. Landing sections still use many raw hex values, cards use mixed interaction patterns, and common transitions are often 300–700ms rather than the 120–180ms direction.

No application feature, data model, Edge Function, platform integration, or workflow file was removed or modified during this audit.

## 1. Current entry points, build, and route/component structure

### Entry and build

- Root `package.json` is a delegating workspace manifest. Its authoritative commands use Corepack pnpm and invoke Vite/TypeScript/Vitest from `artifacts/syncareer`.
- `artifacts/syncareer/src/main.tsx` mounts `App`, imports `index.css` and i18n, schedules decommission cache cleanup, and schedules lazy PostHog initialization.
- `artifacts/syncareer/src/App.tsx` owns `BrowserRouter`, `AuthProvider`, `QueryClientProvider`, `UserProfileProvider`, global error handling, toast providers, lazy routes, and role prefetching.
- `artifacts/syncareer/vite.config.ts` uses `artifacts/syncareer` as the Vite root, reads public `VITE_*` values from the repository root via `envDir`, emits to `artifacts/syncareer/dist/public`, and the root build copies that output to `dist`.
- Vite binds to `0.0.0.0`, allows preview hosts, and uses `BASE_PATH`. The Replit development plugins are conditionally loaded only outside production (and Cartographer/dev banner only when `REPL_ID` exists).
- `components.json`, Tailwind, Radix primitives, `class-variance-authority`, and `tailwind-merge` establish a shadcn-style component library. `App.css` is not imported; `main.tsx` imports `index.css`.
- The root `src/` copy is a Lovable auto-sync target for generated Supabase files. It is not the application build input. The app copy of generated types is currently drifted from the root copy; see §8.

### Route hierarchy

```text
Public / acquisition
├── /                         Landing.tsx
├── /assessment               Assessment.tsx (guest or authenticated student)
├── /sign-in/*                AuthShell + SignInForm / forgot password variant
├── /sign-up/*                AuthShell + SignUpForm
├── /reset-password           AuthShell + ResetPasswordForm
├── /signed-out               SignedOut.tsx
├── /pricing                  Pricing.tsx
├── /subscription-success     SubscriptionSuccess.tsx
├── /blog                     Blog.tsx
├── /blog/:slug               BlogPost.tsx
├── /terms                    TermsAndConditions.tsx
├── /privacy                  PrivacyPolicy.tsx
├── /unsubscribe              Unsubscribe.tsx (token-based email flow)
└── /auth                     redirect to /sign-in

Authenticated onboarding / shared
├── /onboarding               ProtectedRoute, any role
├── /settings                 ProtectedRoute + student/career_counsellor RoleRoute
└── /home                     legacy redirect to /dashboard

Student-only
├── /dashboard                Dashboard.tsx
├── /opportunities            Markets.tsx
├── /applications             ApplicationTracker.tsx
├── /cv-builder               CVBuilder.tsx
├── /interview-simulator      InterviewSimulator.tsx
├── /ai-coach                 AICoach.tsx
├── /analysis                 Analysis.tsx
├── /build                    Build.tsx hub
├── /practice                 Practice.tsx hub
└── /apply                    Apply.tsx hub

Counsellor-only
├── /counsellor-dashboard
├── /counsellor-availability
├── /counsellor-sessions
├── /counsellor-clients
└── /counsellor/complete-credentials

Admin-only (ProtectedRoute + AdminRoute)
├── /admin/feedback
├── /admin/users
└── /admin/credentials

Fallback
└── *                         NotFound.tsx
```

The guards are a UX boundary only. `ProtectedRoute`, `RoleRoute`, and `AdminRoute` must not be treated as authorization; RLS, database functions, and authenticated Edge Functions are the security authority.

### Shells and component ownership

- **Global:** `App.tsx`, `GlobalErrorBoundary`, `LoadingFallback`, `Toaster`, Sonner, `TooltipProvider`.
- **Student shell:** `StudentLayout` → fixed `Navbar` + collapsible desktop sidebar + `layout/MobileBottomNav` on mobile + `main#main-content`. `PageLayout` selects this shell for non-counsellors.
- **Counsellor shell:** `CounsellorLayout` has the same header/sidebar/mobile structure with role-specific links.
- **Admin shell:** `AdminLayout` is a separate compact header/navigation shell and is used by admin pages.
- **Public shell:** `LandingHeader`/`LandingFooter` are reused by blog pages; the landing home composes `HeroSection`, `MarqueeTicker`, `TabbedShowcase`, `WhyDifferentSection`, `FAQSection`, and `FinalCTASection`.
- **Auth/onboarding shell:** `AuthShell`, `OnboardingShell`, `WelcomeScreen`, and form components share the warm cream/teal editorial treatment.

## 2. Active application objects and relationships

| Object / table | Current frontend use | Relationship / source of truth | State |
|---|---|---|---|
| Auth session | `lib/auth.tsx`, Google OAuth wrapper, sign-in/up/reset | Supabase Auth `auth.users`; `profiles.id` is expected to equal `auth.uid()` | Real; session boundary is tested |
| `profiles` / `student_details` | `UserProfileContext`, Dashboard, Settings, SynAI, market surfaces | profile identity/role; student details keyed by `user_id` | Real, cached for 60s via React Query |
| `qualifications` | Settings → Profile section | user-owned additional education rows | Real CRUD; primary education is displayed read-only |
| `assessments` / `assessment_responses` | `/assessment`, Dashboard, recommendations | assessment owns response rows through `assessment_id`; user owns assessments | Real deterministic scoring; guest results are local-only until sign-up |
| `careers` | `useCareerRecommendations` | static/reference career catalogue read from Supabase | Real if the table is populated; recommendation calculation is client-side |
| `resumes` | CV Builder, Dashboard, SynAI, interview prefill | user-owned JSON sections; one “primary” row is selected by `user_id + is_primary` convention | Real persistence path, but schema uniqueness is not verified and Activities are not persisted |
| `user_skills` | Opportunities fallback/skill matching, Dashboard readiness, SynAI, CV save mirror | user-owned skill rows; CV save best-effort upsert | Real but CV mirror hard-codes `intermediate` and `general` |
| `job_postings` | Opportunities, Dashboard, interview setup, market/alumni backend | aggregated external postings; `job_posting_skills` exists in generated types | Real supply path through tracked cron/Firecrawl; current UI reads only external postings |
| `saved_jobs` | Opportunities saved tab | user ↔ job join | Real; write errors are not surfaced in all paths |
| `job_applications` | Opportunities native branch, Application Tracker, Dashboard, outcome feedback | applicant ↔ job join; RLS should scope applicant ownership | Real table/tracker, but external apply does not create a row in the current UI |
| `recommendation_outcomes` | `useOutcomeTracking` after job apply/status update | user-owned learning/outcome feedback; recompute calls `compute-user-intelligence` | Real seam; deployed function is not in repo |
| `mock_interviews` | Interview history, Dashboard score, voice simulator | user-owned AI sessions; backend creates/updates records | Real client contract; `mock-interview` and `interview-tts` are deployed-only |
| `career_guidance_sessions` | No writer in current frontend | present in the app-generated types; no repository writer | Live existence/writers unknown; do not drop |
| Market caches | `/analysis`, Dashboard university insights, tracked `market-intelligence`/`alumni-outcomes` | cache keyed by major/region or university/major/region | Real integration; cost/usage is unverified |
| Counsellor domain | Ask dialog, counsellor portal, sessions in Applications | `counsellor_details` → availability, bookings, sessions, reviews, credentials; public views expose selected profile data | Core workflow is present, but clients/credentials have schema-era drift |
| `counsellor_messages` | `useSessionMessages`/`SessionMessaging` | messages keyed by booking id | App-generated type includes it; root generated copy does not; live authority must be confirmed |
| `counsellor_credentials` | Credential upload/admin review | documents in `documents` storage plus verification rows | App-generated type includes it; root copy/migration baseline disagree; do not remove |
| `notifications` / preferences | Navbar dropdown, Settings, booking notifications | user-owned notifications/preferences; realtime subscription | Real and tested at utility level; `send-notification` is deployed-only |
| `referrals` | Dashboard `ReferralCard` and `get_my_referral_code` RPC | referrer/referee rows | Supporting, real seam, usage unmeasured |
| Payments/subscriptions/usage | Pricing, Navbar plan badge, subscription manager, AI Coach access | Paystack reference → deployed verification → subscription; usage logs for quotas | Revenue boundary is real; server verification source is deployed-only |

## 3. Existing design-system foundations worth preserving

- Semantic HSL CSS variables in `index.css`: background/card/foreground/muted/border/ring plus positive/warning/danger and sidebar tokens.
- Warm landing tokens (`--landing-cream`, `--landing-amber`, `--landing-ink`) and Instrument Serif provide a credible editorial accent without forcing the landing aesthetic into every application surface.
- Inter is the application sans; Tailwind aliases semantic colors and fonts. Preserve semantic tokens and move future raw colors into them rather than adding another palette.
- Shadcn/Radix primitives cover buttons, forms, dialogs, dropdowns, tabs, progress, select, switches, scroll areas, tables, toasts, tooltips, alert dialogs, and collapsibles. The primitives already provide visible keyboard focus rings in `button.tsx`, `input.tsx`, and related controls.
- `AnimatedSection` respects `prefers-reduced-motion`; the interview surface has `role=status`, `role=alert`, `role=log`, and live labels; Student/Counsellor shells have skip links; `GlobalErrorBoundary` and `InterviewErrorBoundary` provide recovery actions.
- Loading/empty/error patterns exist in many domains: `Skeleton` in CV/Settings, explicit loading text/spinners in major pages, empty states in notifications/jobs/applications/counsellor/admin, retry on market intelligence/notifications/interviews.
- `features/cv-builder/scoring.ts` is a pure, explainable score engine with tests. `features/cv-builder/persistence.ts` is a focused Supabase seam with validation, ownership scoping, safe error categories, and tests. These are strong foundations for a redesign.
- Desktop persistent navigation and mobile bottom navigation are already the right product direction; consolidate them instead of replacing them with a generic dashboard shell.

## 4. Inconsistencies and usability problems

### IA and naming

- Navigation says `Build`, `Practice`, `Apply`; page titles/routes say `CV Builder`, `Interview Simulator`, `Opportunities`, `Applications`, and `Market Analysis`.
- `/build` contains only one card (`/cv-builder`). `/apply` contains links to `/opportunities`, `/applications`, and `/analysis`; it is a redundant index rather than an application workspace.
- `/analysis` is not a top-level nav item even though it is a substantial AI/cost-bearing supporting surface.
- `/ai-coach` is called `SynAI` in the shell, `AI Coach` in code, and is a generic chat surface next to more contextual AI surfaces.
- `PageLayout` defaults any non-counsellor role to the student shell; routes currently limit the shared page, but this default should remain explicit if more roles are added.

### Core continuity / data behavior

- `Markets.tsx:156-160` selects only `is_external = true`. Its external CTA at `:380-382` opens a source URL, while the `job_applications` insert at `:194-205` is only in the non-external branch. Users can save and open a job, but the visible journey does not reliably create an application-tracker row.
- `ApplicationTracker.tsx` renders an `app.interview` block, but its query only selects `job_applications` plus a `job_postings` relation; there is no current interview relation/population in that query. The scheduled-interview UI is therefore unreachable from repository evidence.
- Application status controls are mostly display-only; the only status mutation exposed to students is Withdraw for `pending`. Deleting an application has no confirmation.
- `cvDataToResumeColumns` writes camelCase personal JSON; Dashboard `scoreResume` checks `fullName/full_name`, so the Dashboard CV score/name signal can disagree with the builder. `useUserContext` has the same shape assumption.
- `resumeRowToCVData` explicitly resets `activities` to `[]`; the form allows editing activities, but reload loses them. This is a real incomplete feature, not a styling issue.
- Dashboard readiness is a second, approximate scoring implementation, separate from the deterministic CV Strength Score and the more complete career-skill framework. It is labelled as a rough estimate in code, but users see it alongside precise-looking percentages.
- The `useNextBestAction` assessment copy says “10 minutes” while landing/FAQ copy says “5 minutes”; user-facing claims are inconsistent.

### Public content and SEO

- `Landing.tsx`, `IntroStatsSection.tsx` (unused), `FinalCTASection`, and FAQ copy contain hard-coded metrics/claims (`2,400+`, `12+`, `94%`, “thousands,” and hiring/ATS assertions) with no repository evidence of their source. AGENTS.md prohibits unverifiable marketing claims; replace or substantiate in a later content decision.
- `/counsellors` is linked from `TabbedShowcase`/`LandingFooter`/dead landing components but is not defined in `App.tsx`; it falls into `NotFound`. Keep counsellor data/workflows; fix the acquisition mapping only after deciding whether the marketplace is a primary or contextual surface.
- Assessment and CareerRecommendations navigate to `/` with `{ state: { openAuth: true } }`, but `Landing.tsx` does not read that state. The “Create Account” result CTA returns to the landing page without opening auth.
- `lib/seo.ts` appends JSON-LD scripts without stable IDs/removal. Route changes can accumulate duplicate structured data. Runtime metadata updates description/OG fields selectively but does not comprehensively reset stale tags or Twitter title/description.
- `index.html` has `author=Lovable`, an external GPT Engineer/Lovable storage social image, and `public/opengraph.jpg` is not referenced. `public/llms.txt` still describes a public portfolio and `/u/` route that are not in the current router. `robots.txt` disallows several retired route names. These are content/platform-review items, not safe blind deletions.

### Visual system

- Application tokens use bright cyan/teal primary (`--primary: 181 100% 40%`) while the landing hard-codes `#0a1512`, `#00c4cc`, `#f7f5ef`, and many custom shadow values. The split is understandable, but future work should bind both surfaces to named semantic tokens.
- App pages mix editorial serif headings, pill-shaped CTAs, default shadcn cards, older slate-gradient pricing, green/amber literal utilities, and raw `hsl(...)` chart colors. The result is not yet one coherent signed-in workbench.
- `AnimatedSection` uses 700ms transitions, many card/landing effects use 300ms, and the CSS `.card-hover-effect` uses 300ms. The interaction direction calls for restrained ~120–180ms transitions.
- `@tailwindcss/typography` is installed but not registered in `tailwind.config.ts`, while BlogPost/Terms/Privacy use `prose` classes. Those pages are likely missing intended typography styling. Do not remove the dependency until the product chooses to register it or remove the classes.

### Responsive, hover, focus, touch, keyboard

- Student/Counsellor mobile detection uses `<768px`, matching Tailwind `md`; desktop sidebars disappear below that and bottom navigation appears. Opportunities shifts from a two-pane list/detail at `lg` to a detail dialog below `lg`, which is a sound pattern.
- `StudentLayout`/`CounsellorLayout` reserve `pt-16` while `Navbar` is `h-20`; this 16px mismatch can let page content sit under the fixed header.
- Fixed-height views (`Markets` `h-[calc(100vh-280px)] min-h-[500px]`, SynAI viewport-height chat, interview transcript areas) need testing at short mobile heights and with the fixed bottom nav/safe area.
- Several essential cards are clickable `div`s with `onClick` rather than links/buttons: Dashboard stat cards/get-started rows, Build/Practice/Apply cards, and some counsellor cards. They are not consistently keyboard-operable or announced as actions. Convert essential navigation to links/buttons; do not rely on hover.
- Some secondary content is revealed only through hover opacity (`Onboarding` role-card CTA). It needs an equivalent focus-visible/touch state.
- Job rows and most controls use semantic buttons; form primitives have focus-visible rings. Preserve that strength while standardizing `aria-label`, focus-visible, touch target size, and confirmation for destructive actions.
- `layout/MobileBottomNav.tsx` is the active mobile nav. `components/common/MobileBottomNav.tsx` is a separate older implementation and is not imported.
- `RippleBackground` listens to pointer movement for a decorative cursor effect. It is not essential and should remain absent from touch/keyboard-critical behavior; respect reduced motion if this effect is retained.

## 5. Feature status: real, incomplete, mocked, or dead

| Surface | Classification | Evidence / notes |
|---|---|---|
| Landing, auth, onboarding | Real | Routed, composed, Supabase Auth/Google OAuth contracts tested. Landing redirect behavior depends on profile/onboarding state. |
| Assessment | Real/core | 45 hard-coded deterministic questions, local guest scoring, authenticated inserts to assessments/responses, career recommendations from `careers`, tests. Questions are product content, not fake runtime data. |
| Dashboard | Real but inconsistent | Reads real profile, assessment, applications, interview, resume, skills, jobs, referral RPC, university insights. Readiness/CV score are approximate/duplicated. |
| Opportunities | Real supply + incomplete apply loop | Reads active external postings and saved jobs, filters/search/matches/deadlines, links to external sources, real save path. Match fallback of 75% for missing skills and major→skill arrays are hard-coded heuristics; external apply is not tracked. |
| Applications | Real tracker, incomplete creation/status UX | Reads/updates/deletes real rows and displays counsellor bookings. No visible manual tracking flow for external jobs; interview subview is not populated by current query; no delete confirmation. |
| CV builder | Real core | Structured editor, tested deterministic score, cloud load/save, PDF export, upload/analysis seam, AI assistant seam, skill-gap panel. Activities are lost on reload; AI suggestion application only meaningfully handles skills. |
| Interview practice | Real but deployed-function/browser dependent | Setup, history, mic permission, browser speech recognition, TTS fallback, retry/backoff, `mock-interview` turns/report. Premium gate is client-visible; server enforcement/source is deployed-only. |
| SynAI | Real but supporting/cost-sensitive | Profile-context assembly + tracked SSE `career-guidance` through Lovable AI Gateway; free usage check/increment is the only clearly wired server quota path. Messages are not persisted by the app. |
| Market intelligence/alumni | Real integration, evidence-gated | Tracked Lovable AI/Firecrawl Edge Functions with caches, loading/error/retry UI. Actual accuracy, readership, invocation counts, and spend are unknown. |
| Profile/Settings | Real but mostly read-only | Qualification CRUD, password, notification preferences, theme/compact/local locale settings, account delete seam. Primary profile/education fields are not editable despite copy saying Profile edits them; geo-IP lookup is external. |
| Counsellor browse/booking | Real workflow, operationally unknown | Public view, review aggregation, availability, date/time booking, notification seam, student booking list/rating. Price is displayed but no counsellor booking payment path is evidenced. Ratings are N+1 queries. |
| Counsellor portal | Mixed | Profile/availability/session/credential surfaces are routed. Clients query stale column names; notes are local-only; session Message/Start buttons are no-ops; credentials depend on conflicting generated schema shapes. |
| Admin | Real UI with deployed-only functions | Feedback/users use `admin-feedback`/`admin-users`; credentials use direct Supabase credential API. AdminRoute is UX only. Deployed function source is unavailable here. |
| Payments/subscriptions | Real boundary, not locally end-to-end verified | Paystack public key/plan codes, inline checkout, direct verification Edge Function call, subscription realtime/refetch, tests for subscription logic. `VITE_PAYSTACK_PUBLIC_KEY` is optional/missing in tracked `.env`; live injection must be confirmed. |
| Notifications/email | Real supporting system | Supabase notifications/realtime/preferences; booking and sign-up invoke deployed functions; tracked email queue, templates, suppression/unsubscribe/webhook code. Failures are often logged/toasted but not always surfaced to the initiating flow. |
| Referrals | Real supporting card | RPC/table reads and share link; no analytics/usage evidence. |
| i18n | Incomplete | Config and 9 non-English locale files exist, but most are stubs and only Settings/Security consume translations. Browser detection can produce mixed-language Settings. |
| Static blog | Real static content, content-maintained | `data/blogPosts.ts` is hard-coded editorial HTML. It includes claims such as “over 75%” without source in repo; content needs editorial verification. |
| Learning / portfolio | Legacy/dead by repository evidence | Drop migrations and zero app call sites. Do not infer live data deletion from this alone; live counts/deployed invocation evidence still govern platform cleanup. |
| Generated/dead frontend modules | Dead-code candidates | See §9. No deletion was made. |

## 6. Proposed component boundaries for later implementation

Keep business logic and vendor seams separate. Do not introduce a generic vendor-neutral abstraction solely for the redesign.

### Application shell

- `AppShell`/`StudentShell`: global header, desktop rail, mobile navigation, skip link, page title/context region, content width, bottom safe area.
- `PrimaryNav`: one source of truth for student destinations and active route matching.
- `SecondaryNav`/`AccountMenu`: Profile, notifications, plan/support; admin and counsellor remain role-specific shells.
- `PageHeader`, `Surface`, `StatusBanner`, `EmptyState`, `ErrorState`, `LoadingSkeleton`: compose existing shadcn primitives and semantic tokens.

### Student information architecture

Use the requested shape as the primary navigation:

```text
Home          /dashboard
Opportunities /opportunities
Applications  /applications
Practice      /practice
Profile       /settings
```

Deviations are deliberate:

- **CV Builder remains a first-class core workspace** at `/cv-builder`, but should be reachable contextually from Home, Opportunities, Practice, and Profile rather than buried in a generic account page.
- **Market analysis** stays a supporting route/subsurface linked from Opportunities or the Home “signals” area, not a primary nav destination until usage proves otherwise.
- **SynAI and interview simulator** belong to Practice as contextual destinations, while their deep routes remain stable for links/bookmarks.
- **Counsellor guidance** remains contextual from the student shell/dialog until supply, booking volume, and operating strategy justify a primary nav destination. Do not remove the workflow based on the missing `/counsellors` marketing route.
- `/build` and `/apply` should become compatibility redirects or genuinely useful summaries only after product/analytics confirmation; the current one-card/link hubs should not remain mandatory hops.

### Domain workspaces

- **Home:** `Dashboard` → `NextBestAction`, `ReadinessSummary`, `Journey`, compact application/opportunity previews, and explicit state ownership. Replace approximate duplicate calculations with one display contract.
- **Opportunities:** `OpportunitySearch`, `OpportunityList`, `OpportunityRow`, `OpportunityDetail`, `SaveOpportunityButton`, `MatchExplanation`, and a clear “apply externally / mark as applied” boundary. Keep the actual `job_postings`/`saved_jobs`/`job_applications` adapters near the data seam.
- **Applications:** `ApplicationSummary`, `ApplicationFilters`, `ApplicationCard`/pipeline row, `ApplicationStatusEditor`, `InterviewDetails`, `CounsellorBookingSummary`. Keep job and counsellor tracking visually related but distinct objects.
- **CV:** `CVWorkspace`, `CVSectionNav`, section editors, `CVPreview`, `CVScorePanel`, `SkillGapPanel`, `AIAssistancePanel`, and persistence adapter. Preserve `CVData`, `scoring.ts`, `persistence.ts`; solve the Activities/schema decision before claiming complete persistence.
- **Practice:** `PracticeHub`, `AssessmentEntry`, `InterviewEntry`, `SynAIEntry`, `PracticeHistory`. Keep voice/browser/AI internals in `useVoiceInterview` and Edge Function seams, not in navigation components.
- **Profile:** `ProfileOverview`, `EducationEditor`, `QualificationsList`, `SecuritySettings`, `NotificationSettings`, `AppearanceSettings`, `SubscriptionSummary`. Make editable/read-only states explicit.
- **Human guidance:** `CounsellorEntry`, `CounsellorList`, `CounsellorProfile`, `AvailabilityPicker`, `BookingConfirmation`, `SessionSummary`, and notification boundary. Do not add networking, contacts, events, gamification, company databases, or generic social features.

### Integration boundaries to preserve

- `integrations/supabase/client.ts` and generated types remain the only browser client boundary.
- `lib/auth.tsx` remains the auth contract; role guards remain UX only.
- `integrations/lovable/index.ts` remains the Google OAuth seam.
- `services/analytics.ts`, `lib/seo.ts`, payment components, notification utilities, and deployed Edge Function names remain explicit integration seams.
- Do not reconstruct or edit deployed-only Edge Functions from frontend call sites.

## 7. Exact files likely to change in later stages

This is a planning map, not an instruction to change them during the audit.

| Later stage | Likely files | Scope / constraint |
|---|---|---|
| IA and shell | `artifacts/syncareer/src/App.tsx`, `components/layout/StudentLayout.tsx`, `components/layout/Navbar.tsx`, `components/layout/MobileBottomNav.tsx`, `components/layout/PageLayout.tsx`, `lib/routePrefetch.ts`, `pages/Build.tsx`, `pages/Apply.tsx`, `pages/Practice.tsx` | Consolidate nav/redirects; preserve deep URLs, auth guards, prefetch behavior, counsellor/admin shells. |
| Tokens and shared surfaces | `src/index.css` (app copy), `tailwind.config.ts`, `components/ui/button.tsx`, `card.tsx`, `input.tsx`, `dialog.tsx`, `tabs.tsx`, plus new focused shell/status components if needed | Tokenize raw colors, align motion/focus/spacing, do not weaken strict TS or replace working primitives wholesale. `App.css` is not part of this stage except as a deletion candidate. |
| Home/dashboard | `pages/Dashboard.tsx`, `components/dashboard/UniversityInsightsCard.tsx`, `components/assessment/GuidedJourney.tsx`, `hooks/useNextBestAction.ts`, `lib/progressCalculations.ts`, `components/referral/ReferralCard.tsx` | Unify readiness/CV/application signals; preserve real queries and supporting cards; verify external insight function before changing copy. |
| Opportunities | `pages/Markets.tsx`, `features/application-tracker/constants.ts`, `features/assessment/jobMatcher.ts`, `hooks/useOutcomeTracking.ts`, `components/ui/*` used by filters/dialogs | Separate external apply from tracked application semantics; preserve Firecrawl-generated data and RLS. |
| Applications | `pages/ApplicationTracker.tsx`, `components/counsellor/RateCounsellorDialog.tsx`, `features/application-tracker/constants.ts`, any verified application/interview data adapter | Add explicit statuses/confirmation only after schema/query contract is verified. Do not invent an interview relation. |
| CV persistence/editor | `pages/CVBuilder.tsx`, `components/cv-builder/CVForm*.tsx`, `CVPreview.tsx`, `CVAIAssistant.tsx`, `CVUploadDialog.tsx`, `CVSkillGapPanel.tsx`, `CVStrengthScore.tsx`, `features/cv-builder/types.ts`, `persistence.ts`, `scoring.ts`, `hooks/useCVPersistence.ts`, `hooks/useCVAnalysis.ts` | Fix field contract and Activities decision; keep validation/error categories and tests. Any schema change requires explicit migration/rollback/verification approval. |
| Practice/interview/SynAI | `pages/Practice.tsx`, `pages/InterviewSimulator.tsx`, `components/interview/VoiceInterviewMode.tsx`, `hooks/useVoiceInterview.ts`, `features/interview/reportParser.ts`, `pages/AICoach.tsx`, `components/ai-coach/*`, `hooks/useUserContext.ts` | Preserve browser permission/TTS fallback, retry, usage gates, deployed function names, AI data boundary. |
| Profile/settings | `pages/Settings.tsx`, `components/settings/ProfileSection.tsx`, `SecuritySection.tsx`, `components/notifications/NotificationSettingsPanel.tsx`, `contexts/UserProfileContext.tsx`, `utils/languages.ts` | Resolve read-only/editable contract, i18n decision, theme/geo-IP behavior; do not weaken delete-account or auth boundaries. |
| Counsellor | `components/counsellor/AskCounsellorDialog.tsx`, `pages/counsellor/*`, `components/counsellor/{AvailabilityCalendar,SessionsManager,SessionMessaging,MeetingLinkManager}.tsx`, `lib/credentialApi.ts`, `hooks/useSessionMessages.ts`, `utils/notifications.ts` | First reconcile live schema and deployed notification/credential behavior. No platform/table deletion from UI work. |
| Public landing/content/SEO | `pages/Landing.tsx`, `components/landing/{LandingHeader,HeroSection,TabbedShowcase,WhyDifferentSection,FAQSection,FinalCTASection,LandingFooter}.tsx`, `pages/Blog*.tsx`, `lib/seo.ts`, `index.html`, `public/{robots.txt,sitemap.xml,llms.txt}` | Remove/verify unsupported claims and dead `/counsellors` links; preserve SEO and social-preview seams after owner decision. |
| Payments/analytics verification | `components/payment/PaystackButton.tsx`, `components/subscription/SubscriptionManager.tsx`, `hooks/useSubscription.ts`, `lib/featureAccess.ts`, `services/analytics.ts`, `hooks/usePageTracking.ts` | Confirm live public key/invocation behavior and PostHog decision before altering product limits or measurement. |

No later stage should touch `.github/workflows/` under any circumstance.

## 8. Supabase/Lovable risks and evidence gaps

1. The root migration directory is not a full schema baseline. `schema:repo:smoke` reports 35 generated tables without CREATE TABLE in the active root migrations and one nested migration outside the root directory. Do not reconstruct schema from generated types.
2. `schema:types:check` currently fails because the root and app generated copies differ: `counsellor_credentials` and `counsellor_messages` exist only in the app copy, `migrate_skills_to_relational` exists only in the app copy, and `counsellor_details` definitions differ. This is a source-of-truth question, not a frontend cleanup opportunity.
3. The app calls deployed-only functions: `send-notification`, `admin-feedback`, `admin-users`, `delete-account`, `check-feature-access`, `compute-user-intelligence`, `interview-tts`, `mock-interview`, `analyze-portfolio`, `verify-paystack-payment`, and `compute-university-insights`. Their current deployed source/config is not in the repository. A historically deployed `cv-ai-assistant` has no current repository caller and remains `UNKNOWN`; recover exact source and live usage before removal.
4. Lovable Cloud is the hosted-backend authority. Do not run `supabase link`, `db pull`, `db push`, migration repair, function deployment, or remote type generation from a personal Supabase account.
5. All browser values are public configuration only. Service-role, Paystack secret, Lovable API, email/webhook, and Firecrawl secrets must stay in Edge Function/Lovable Cloud secrets. No browser route guard is a security control.
6. Payment access must remain server-granted after Paystack status/amount/currency/plan/ownership/idempotency checks. The client callback cannot be trusted.
7. AI inputs include selected CV evidence, interview answers and application notes. Preserve authenticated function boundaries and cost/usage enforcement. SynAI is a contextual workspace assistant through the typed `career-guidance` v2 client; do not broaden it into a generic AI feature.
8. Credentials and counsellor messages touch high-sensitivity data/storage and have conflicting generated-type evidence. Verify live RLS, storage policies, triggers, and deployed notification behavior in an isolated/owner-approved environment before redesigning those flows.
9. External jobs and market/alumni data are third-party/AI-derived. Preserve source URLs, cache semantics, provenance, and honest uncertainty; never turn generated salary/outcome values into unsupported product claims.

## 9. Lovable-specific artifact classifications

The current checkout was scanned for Lovable-specific paths, package names, comments, secrets names, gateway URLs, generated seams, and platform docs. The categories below follow `AGENTS.md`. Classification is based on repository evidence only.

| Artifact | Category | Evidence and safe disposition |
|---|---|---|
| `@lovable.dev/cloud-auth-js` in root and app `package.json` | `ACTIVE PLATFORM DEPENDENCY` + `USEFUL INTEGRATION` | App wrapper imports it; `GoogleSignInButton.tsx` calls the wrapper; OAuth contract tests cover the session handoff. Do not remove or replace without an approved OAuth migration. |
| `artifacts/syncareer/src/integrations/lovable/index.ts` | `USEFUL INTEGRATION` | Small wrapper around `createLovableAuth`; converts redirect/tokens/errors into the app's Supabase session contract. Keep near the auth seam. |
| `src/integrations/lovable/index.ts` | `USEFUL INTEGRATION` / generated sync target | It is explicitly auto-generated by Lovable and is the root synchronization landing zone even though the app imports its `artifacts` copy. Keep; do not hand-edit. |
| `src/integrations/supabase/client.ts` | `HISTORICAL COMPATIBILITY` + `GENERATED CODE DEBT` | Root Lovable auto-sync target; the application imports the app copy. Removing it would break the documented sync workflow. |
| `src/integrations/supabase/types.ts` | `HISTORICAL COMPATIBILITY` + `GENERATED CODE DEBT` | Root generated source used by `scripts/schema/generated-types.mjs`; not a safe deletion target despite no app import. |
| `artifacts/syncareer/src/integrations/supabase/types.ts` | `GENERATED CODE DEBT` | Generated application copy is imported by the app and currently differs from the root source. Do not manually edit; reconcile through Lovable and the repository sync command. |
| Root `.env` public `VITE_*` config and both `bun.lock` files | `ACTIVE PLATFORM DEPENDENCY` | Build `envDir` and Lovable's private package proxy depend on this operating arrangement. Values are public client config only; never add server secrets. Do not regenerate Bun locks against the public registry. |
| `supabase/config.toml` Lovable project/function configuration | `ACTIVE PLATFORM DEPENDENCY` | Registers tracked function JWT settings and the hosted project reference. Treat as backend/deployment configuration; no routine frontend cleanup. |
| `npm:@lovable.dev/email-js` in `process-email-queue` | `ACTIVE PLATFORM DEPENDENCY` | Tracked email worker uses Lovable delivery and `LOVABLE_SEND_URL`; removing breaks transactional email. |
| `npm:@lovable.dev/webhooks-js` in `handle-email-suppression` | `ACTIVE PLATFORM DEPENDENCY` | Tracked webhook handler verifies Lovable bounce/complaint requests; preserve HMAC boundary. |
| `LOVABLE_API_KEY` / `LOVABLE_SEND_URL` secret seams | `ACTIVE PLATFORM DEPENDENCY` + `USEFUL INTEGRATION` | AI Gateway, email delivery, and webhook behavior depend on these server-side names. Secret values are not in the repository and must stay in Lovable Cloud. |
| `https://ai.gateway.lovable.dev/` calls in tracked Edge Functions | `USEFUL INTEGRATION` | Career guidance, market intelligence, and alumni outcomes use the Lovable AI Gateway with server-side keys; deployed-only CV/interview functions are documented as additional consumers. Preserve the function boundary. |
| `index.html` social image URL on `storage.googleapis.com/gpt-engineer-file-uploads/...` | `USEFUL INTEGRATION` | It is a live social-preview reference. `public/opengraph.jpg` is unused, but replacing the external URL is a content/SEO decision, not safe cleanup. |
| `index.html` `meta author=Lovable` | `UNKNOWN` | It is live SEO metadata and may be factually wrong, but the correct owner/author value is not evidenced. Do not alter during frontend cleanup without a content decision. |
| `artifacts/syncareer/public/sw.js` + `removeLegacyBrowserCaches()` in `main.tsx` | `UNKNOWN` | They are decommission code that unregisters old service workers/caches. Repository evidence cannot prove the decommission window has elapsed. Keep until deployment/analytics evidence is supplied. |
| iOS PWA meta tags in `index.html` | `UNKNOWN` | They may still affect existing home-screen launches even though there is no active PWA. Do not remove without owner confirmation. |
| `@replit/vite-plugin-*` and conditional imports in `vite.config.ts` | `ACTIVE PLATFORM DEPENDENCY` (Replit, not Lovable) | Current config and package manifest still load the runtime error modal in non-production and optional Cartographer/dev banner on Replit. The checkout has no `.replit` file, so broader Replit cleanup requires a separate verified platform decision. |
| `docs/LOVABLE_INTEGRATION.md`, `BACKEND_PLATFORM_INVENTORY.md`, `EDGE_FUNCTIONS.md`, `SCHEMA_RECONCILIATION.md` | `USEFUL INTEGRATION` | Current runbooks define the operating boundary and no-remote-mutation policy. They are not historical removal targets. |

No current `.lovable/` directory was present. No Lovable artifact above is a removal recommendation. Missing deployed-only source is classified by the existing backend inventory and remains recovery-blocked, not dead.

## 10. Candidate deletions and import/reference evidence

These are candidates for a later, separately approved cleanup pass. None was deleted in this audit. “No importer” means no source importer/call site found in `artifacts/syncareer/src`; it is not proof that a platform or external consumer cannot exist.

| Candidate | Evidence | Classification / guardrail |
|---|---|---|
| `artifacts/syncareer/src/App.css` | `main.tsx` imports `index.css`; no current source imports `App.css`; contents are default Vite logo/card styles. | `GENERATED CODE DEBT`; safe-looking frontend candidate after one build/reference check. |
| `components/common/MobileBottomNav.tsx` | `StudentLayout` and `CounsellorLayout` both import `components/layout/MobileBottomNav.tsx`; no importer for the `common` copy. | `GENERATED CODE DEBT`; candidate only after confirming no external deep import. |
| `components/common/OptimizedImage.tsx` | Definition exists; no in-repo importer. | `GENERATED CODE DEBT`; candidate after asset/runtime reference scan. |
| `components/common/SkeletonCard.tsx` | Definition exists; no in-repo importer; pages use `Skeleton` directly. | `GENERATED CODE DEBT`; candidate after reference scan. |
| `components/counsellor/MeetingLinkDisplay.tsx` | Definition exists; no in-repo importer; current surfaces use `MeetingLinkManager`/availability/session links. | `GENERATED CODE DEBT`; do not remove until counsellor workflow is schema-verified. |
| `components/dashboard/ProgressDisplay.tsx` | Definition exists; no in-repo importer; Dashboard uses inline stats/readiness and `GuidedJourney`. | `GENERATED CODE DEBT`; candidate after confirming no platform-generated import. |
| `components/landing/FeatureSpotlightSection.tsx`, `HowItWorksSection.tsx`, `IntroStatsSection.tsx`, `LandingBackground.tsx`, `ProgramViewSection.tsx` | No current importer; `Landing.tsx` composes a different set of landing sections. Some contain hard-coded mockup/stat/claim content. | `GENERATED CODE DEBT` / content residue; candidate only as a group after confirming design history and external links. Do not delete `RippleBackground.tsx`: it is imported by active `WhyDifferentSection.tsx`. |
| `hooks/useCareerReadiness.ts` | No importer; Dashboard comment says the duplicate sibling hook was removed from the live data path. | `GENERATED CODE DEBT`; candidate after checking external generated imports. |
| `hooks/usePageTracking.ts` | No importer. | `UNKNOWN` until the PostHog decision: wire it into the app or remove it with its event catalog/tests. Do not delete merely because current analytics is unmeasured. |
| `lib/apiClient.ts` | No importer; current frontend calls Supabase directly; it is the only `api_error` emitter. | `GENERATED CODE DEBT`, but analytics decision comes first. |
| `lib/errorHandling.ts` | No in-repo importer found. | `GENERATED CODE DEBT`; candidate after confirming no generated/runtime import. |
| `components/auth/SignupWizard.tsx` | No importer; `App.tsx` uses `SignUpForm.tsx`; the wizard has its own analytics calls. | `GENERATED CODE DEBT` / historical auth flow; analytics and auth-contract checks first. |
| Unused individual `components/ui/*` primitives | Many shadcn/Radix files have no current importer, but they are generator output and package-backed library surface. | `GENERATED CODE DEBT` candidate group only after a complete import graph and component-generator policy check; do not remove the library wholesale. |
| `src/assets/syncareer-logo.png` | No source reference; active shell/landing code imports `syncareer-logo.svg`. | `GENERATED CODE DEBT` candidate after checking external/static references. |
| `public/opengraph.jpg`, `favicon.ico`, `favicon.svg` | No direct runtime source reference for some files, but public assets may be requested by crawlers/browsers and `opengraph.jpg` is an intentional fallback candidate in current docs. | `UNKNOWN`/content infrastructure; do not remove as part of a UI redesign. |
| `public/llms.txt`, stale route names in `robots.txt` | Current files mention `/u/`, portfolio, learn, and other retired routes not in `App.tsx`. | `UNKNOWN` content/platform artifact; update only after an SEO/content owner decision. |
| `public/sw.js` | Referenced operationally by the cache cleanup strategy and public path, despite no normal import. | `UNKNOWN`; not a deletion candidate yet. |
| `/counsellors` links | Broken route references from active/dead landing components; there is no `/counsellors` route. | Not a deletion target. This is evidence for a later link/IA fix, not evidence that counsellor data/code is dead. |

Existing shadcn primitives, generated Supabase copies, Replit plugins, PWA decommission code, public SEO assets, and deployed-only Edge Functions are intentionally not removed by this audit.

## 11. Verification plan

### Static and contract checks

1. Run the frozen install, strict typecheck, Vitest suite, production build, `schema:repo:smoke`, and `schema:types:check`.
2. Maintain route/link inventory from `App.tsx`; assert every internal CTA maps to a route or an intentional external URL. Specifically test `/counsellors`, `/support`, `/privacy` vs `/privacy-policy`, and `/terms` vs `/terms-and-conditions`.
3. Add focused tests for the later application contract: external job → mark/track application, status update/outcome, save job, and application empty/error states.
4. Add CV persistence contract coverage for camelCase personal data, reload round trip, Activities decision, and dashboard score parity. Keep the existing persistence/scoring tests.
5. Before counsellor changes, run an isolated verified-schema/RLS matrix for booking ownership, messages, credentials/storage, and admin review. Confirm deployed `send-notification` behavior.
6. Before payment/AI changes, recover exact deployed-only function source/config from Lovable Cloud and test JWT, plan/amount/currency/ownership/idempotency, quotas, retries, and error shapes. Never infer deployed logic from call sites.
7. If analytics is retained, mount page tracking and emit only an agreed event vocabulary; verify PostHog identity/reset and Do Not Track behavior. If analytics is paused, document the decision before removing helpers.

### Responsive and interaction matrix

Test at 360×800, 390×844, 768×900, 1024×768, 1280×800, and 1440×900:

- landing header/menu, auth, onboarding, dashboard, opportunities list/detail, application cards, CV editor/preview, interview transcript, SynAI chat, settings, counsellor booking/calendar, and admin tables;
- short viewport with mobile bottom nav and safe-area inset;
- keyboard-only Tab/Shift+Tab/Enter/Space/Escape, visible focus, skip link, dialogs/popovers/dropdowns, tabs/selects, expandable transcript/FAQ, destructive confirmations;
- touch-only operation without hover, including card navigation, job detail, save, mobile menus, date/time selection, and contextual guidance;
- `prefers-reduced-motion` and screen-reader live regions for loading/success/error states.

### Data-state matrix

For each core route, test loading, successful populated data, empty data, stale/partial data, permission/RLS error, Edge Function 4xx/5xx, offline/network failure, and retry/recovery. Use isolated fixtures only; do not use production data or secrets.

### Platform safety

- Do not run remote Supabase mutation/link/deploy commands from this checkout without explicit ownership/operation approval.
- Do not edit generated Supabase files manually; reconcile through Lovable source and the supported sync script.
- Do not touch `.github/workflows/`.
- Any destructive cleanup must carry import/reference evidence, Lovable classification, live invocation/row evidence where applicable, migration/export and rollback notes, and explicit approval.

## Audit verification snapshot

- Frozen install: **PASS** (`corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile`).
- Typecheck: **PASS** (`corepack pnpm run typecheck`, strict settings, 0 reported errors).
- Unit/integration tests: **PASS**, 16 files / 148 tests (`corepack pnpm run test`). Existing test stderr includes intentional PostHog/error-path logs and React `act(...)` warnings; no test failed.
- Production build: **PASS** (`corepack pnpm run build`). Vite emitted the app build and the root copy step completed. Largest emitted chunks include `html2pdf` and Recharts/vendor bundles; no build failure.
- Repository schema smoke: **PASS with warnings** (`corepack pnpm run schema:repo:smoke`); it reports the migration directory is not a complete baseline and one migration is nested outside the root directory.
- Generated type freshness: **FAIL / pre-existing drift** (`corepack pnpm run schema:types:check`); root/app generated copies differ as described in §8. No type file was edited.
- Live Supabase/RLS, deployed-only Edge Function behavior, browser E2E, PostHog data, payment provider behavior, and provider spend: **NOT VERIFIED in this audit**.

## Final safety check

Before this audit is considered complete, run:

```sh
git diff -- .github/workflows
```

It must produce no output. This audit made no changes under `.github/workflows/`.
