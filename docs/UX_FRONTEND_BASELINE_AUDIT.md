# Syncareer UX / Frontend Baseline Audit

**Stage:** Audit only — no application behaviour changed.
**Frontend source of truth:** `artifacts/syncareer/` (React 19, Vite, Tailwind, react-router).
**Method:** Static, repository-only review (code + locked tests). No live Lovable/Supabase evidence was available; findings that depend on live rows/deployed functions are explicitly marked `verify`.
**Classification:** `P0` fundamental · `P1` important · `P2` polish.

---

## 0. What the codebase already gets right (preserve)

This audit does not start from a blank canvas. The doctrine in `AGENTS.md`, the
tokens in `index.css` / `tailwind.config.ts`, and several locked tests already
encode most of the intended product/design system. These invariants must be
preserved, not regressed:

- **One cool canvas, not pure white** — `--background`/`--canvas` = `216 33% 97%`
  (locked by `components/ui/designSystem.test.tsx`).
- **One global palette + no re-theming of the shell** by the dossier or by mode
  hooks (locked by `dossierScope.test.ts` and `designSystem.test.tsx`).
- **Document geometry + Literata dossier type scoped to Prove surfaces only**
  (locked by `dossierScope.test.ts`).
- **Restrained motion 120–180ms, `prefers-reduced-motion` respected, no zoom /
  scale / float decoration** (locked by `components/ui/motionInventory.test.ts`).
- **No Instrument Serif, muted (not lavender) hover on shared controls.**
- **SEO hygiene**: per-route titles (`lib/pageTitle.ts`), `noindex` on
  authenticated/personal routes (`useNoIndex`, `ProtectedRoute`, `AuthShell`,
  `NotFound`, `SignedOut`, `Unsubscribe`), `public/robots.txt` + `sitemap.xml`,
  structured data on the landing.
- **Free-product state**: no plans/premium gates/subscription UI in the app;
  `/pricing` and `/subscription-success` redirect to `/`; "Support Syncareer" is
  gated behind `VITE_SUPPORT_URL` (`lib/support.ts`, `Navbar`, `LandingFooter`).

Invariants to respect when changing anything: `designSystem.test.tsx`,
`dossierScope.test.ts`, `motionInventory.test.ts`, `designTokens.test.ts`,
`dossierPrimitives.test.tsx`, `visualFixtureIsolation.test.ts`.

---

## 1. All frontend routes

Defined in `App.tsx`. Current inventory:

**Public / acquisition**
`/`, `/assessment` (guest or student), `/sign-in/*`, `/sign-up/*`,
`/reset-password`, `/signed-out`, `/terms`, `/privacy`, `/unsubscribe`;
`/pricing` & `/subscription-success` → `/`; `/auth` → `/sign-in`.

**Authenticated shared**
`/onboarding`, `/settings` (student + mentor), legacy `/home` → `/dashboard`.

**Student-only**
`/dashboard`, `/opportunities`, `/applications`, `/applications/:id`,
`/applications/:id/cv`, `/applications/:id/interview`, `/cv-builder`,
`/interview-simulator`, `/ai-coach`, `/analysis`, legacy `/build`→`/cv-builder`,
`/apply`→`/opportunities`, `/practice`→`/interview-simulator`, `/mentors`,
`/mentors/:mentorId`, `/mentorship/requests`.

**Mentor (role `career_counsellor`)**
`/mentor/profile`, `/mentor/availability` (both render `MentorAccount`), plus
redirects `/counsellor-dashboard`, `/counsellor-availability`,
`/counsellor-sessions`, `/counsellor-clients`, `/counsellor/complete-credentials`.

**Admin**
`/admin/feedback`, `/admin/users`, `/admin/mentors`; `/admin/credentials` →
`/admin/mentors`.

**Fallback** `*` → `NotFound`.

Observations:
- The mentor profile and availability are the *same* component at two paths
  (`/mentor/profile` and `/mentor/availability`) — the routes exist but the page
  does not differentiate availability as its own destination (`P1`, #12).
- `/analysis` (market intelligence hub) is registered but reachable only from
  `/opportunities`; it is not in any navigation group and nothing else links it
  (`P1`, #10/#9).
- The router-level redirect hubs (`/build`, `/apply`, `/practice`) still each
  cost a registered lazy chunk only to redirect; acceptable for bookmark
  compat, but they add empty route surface (`P2`).
- Counsellor routing is internally named `career_counsellor` while the sidebar
  and copy say "Career mentor"/"mentor" — consistent copy decision, but `/mentor`
  is also *disallowed* wholesale in `robots.txt` even though it points at a
  mentor's own private profile (fine) and `/mentorship/requests` is covered by
  `/mentorship` disallow (fine). No leak.

---

## 2. Current visual systems

Strong, token-driven, and already doctrine-aligned (see §0). Remaining gaps:

- **Three mode hooks are defined + tested but never applied.** `.mode-discover`,
  `.mode-prove`, `.mode-advance` exist in `index.css`, are locked present by
  `designSystem.test.tsx`, yet **zero page or layout element consumes them**
  (grep across `src` outside CSS/tests returns nothing). Density/geometry today
  is realised only by ad-hoc per-page primitives (`discover-*`, `dossier-*`) —
  not by a layout-level mode. Crucially, `designSystem.test.tsx` *currently
  forbids* pages from adding `mode-discover/prove/advance`, so this is a
  deliberate-but-unfinished seam, not a stray class (`P1`, #6/#15).
- **Advance-mode surfaces are visually undifferentiated.** Discover
  (`Dashboard`, `Markets`) and Prove (Application dossier/CV) have dedicated
  primitives. Assessment, Interview, and Analysis still compose with generic
  `Card`/`Badge`/`Progress` walls on the default density
  (`P1`, #5/#6/#9/#13).
- Two micro-label conventions coexist: the `.eyebrow` token and many hand-rolled
  `text-[10px]/[11px] font-semibold uppercase tracking-*` strings (≈12 call
  sites) (`P2`, #4/#6).

## 3. Current design primitives

- Shared primitives are solid: `button` (incl. `IconButton`), `surface-*`,
  `page-container`/`workspace-container`, `layout-*`, `interactive`, `.type-*`,
  `discover-*`, dossier set, `contextual-preview`, `RecordState`, `RecordList`.
- **Several `ui/` primitives have no app importers** (dead): `empty.tsx`,
  `spinner.tsx`, `button-group.tsx`, `field.tsx`, `item.tsx`, `input-group.tsx`,
  `kbd.tsx`, and `separator.tsx` (0 non-`ui` importers by static grep).
  `breadcrumb` has 1 importer. Empty states are otherwise hand-rolled per page
  (`NotificationEmptyState`, `RecordState`, etc.) rather than via `ui/empty`
  (`P1`, #4).
- `App.css` at the app root is not imported by `main.tsx` or `index.html` —
  legacy dead file (`P2`, #5).

## 4. Duplicate primitives / concepts

- `@/components/ui/empty`, `field`, `item`, `spinner` overlap intent with
  `RecordState`, `RecordList`, `dossier/RecordState` and per-page empty states —
  two "empty state" vocabularies exist (`P1`, #4).
- Scoring/readiness is computed in **at least three independent seams**:
  `useUserContext.ts` and `useCareerReadiness.ts` both derive a
  "Technical 50 / Practical 30 / Professional 20" readiness; CV strength is
  computed by `useCVStrengthScore.ts` *and* by `components/dashboard/home/utils.ts`
  `scoreResume`, and the Dashboard shows `scoreResume` while the CV Builder shows
  `useCVStrengthScore`. Two definitions of "CV readiness" risk showing different
  numbers as facts (`P0`, #19/#8/#13).
- `features/counsellor/constants.ts` and `components/ai-coach/*`
  (`ChatMessage`, `CareerInsightsPanel`, `QuickActions`, `TypingIndicator`) are
  **orphaned**: no live importer outside their own folder/tests. Legacy AI-chat
  UI residue (`P2`, #19).
- Two desktop Chrome systems exist: the shared `AuthenticatedLayout` (sidebar +
  top bar + mobile bottom nav) for student/mentor, and a separate hand-rolled
  `AdminLayout` header. This is defensible for a separate role but means admin
  pages do not benefit from the shared shell/route-focus/motion work
  (`P2`, #12).

## 5. Legacy styling

- Raw hex outside token system is limited to third-party brand marks (Google,
  WhatsApp) — good.
- Legacy aliases retained intentionally: `.app-canvas` (→ `.surface-canvas`) and
  `.eyebrow`/`.type-eyebrow`/`.dossier-eyebrow` — fine, documented.
- `body.compact-view` rules at the *bottom* of `index.css` are global overrides
  (not tokens); a settings feature, implemented via a body class with
  `[class*="CardHeader"]` string selectors — fragile, styles shadcn internals
  rather than the new surface primitives, and won't apply to dossier/surface
  components consistently (`P2`, #7/#12).

## 6. Current navigation

- Desktop sidebar groups: Workspace (Home, Opportunities, Applications), Build
  (CV Builder), Practice (Interview), Connect (Mentors) — clean mapping to
  discover/prove/advance.
- **Advance entry points are hidden.** No nav link to `/assessment` (after
  completion), `/analysis`, or `/ai-coach`. Assessment re-entry exists only from
  the dashboard empty-direction card and the landing/footer; Analysis only from
  Opportunities. A student who has done the assessment has no obvious way back
  to it, and the market-intelligence surface is one mouse-click deep
  (`P0`, #9/#10).
- Mobile bottom nav: student items flatten to Home, Opportunities, Applications,
  then overflow the remaining (CV Builder, Interview, Mentors) into a "More"
  bottom sheet. The Prove-mode CV Builder and Advance-mode Interview are behind
  "More" on mobile (`P1`, #7).
- Top bar `Navbar` carries notifications, account menu, and support. **Personal
  contact details (`+233555156128`, `syncareer01@gmail.com`) are hardcoded as the
  product support channel** in the account menu (`P1`, #9 content/trust; also a
  live-maintenance hazard).

## 7. Page-composition problems

- **Vertical-emptiness / white-card walls**: Advance surfaces
  (`Assessment.tsx`, `InterviewSimulator.tsx`, `Analysis.tsx`, `AICoach.tsx`) and
  several admin/mentor pages stack generic `Card` components on the default
  density; `AICoach.tsx` is literally a `max-w-3xl` stack of cards listing
  destinations (`P1`, #6/#13).
- `Markets.tsx` splits list + detail in two `min-h-[520px]` `surface-content`
  panes — reasonable, but a fixed 520px min keeps it tall on short lists and is
  a whiff of the "fill the viewport" anti-pattern (`P2`).
- `ApplicationTracker.tsx` uses `min-h-[70vh]` to guard an empty list
  (`P2`). Prefer a deliberate empty state over viewport faking.
- Dashboard composes Discover objects well and orders sections responsively;
  this is the reference composition to extend to the other two modes (`P1`).

## 8. Applications weakness

Applications are the strongest surface (`/applications`, the dossier at
`/applications/:id`, `ApplicationDetailSheet` keeps list context, arrow-key
section navigation, `ApplicationStageRail`, evidence ledger, focus restoration).
Weaknesses:

- **Cross-mode hand-off is asymmetric.** A CV/Interview can deep-link *into* an
  application (`/applications/:id/cv`, `:id/interview`), but those editors don't
  surface a persistent "back into this application dossier" affordance as
  strongly as the dossier does — returning to the dossier relies on the current
  sidebar "Current dossier" chip which disappears once you navigate away and is
  desktop/collapsed-only (`P1`, #8).
- `job_applications.resume_url` vs the primary `resumes.is_primary` CV and the
  application-scoped CV are three "which CV is this application using" notions;
  the UI must keep stating which one is shown (it mostly does) — keep the
  lineage labels consistent across `/applications/:id`, `:id/cv`, and
  `/cv-builder` (`P2`, #8).
- Empty-tracker state relies on `min-h-[70vh]` rather than a strong empty
  object + next action (`P2`, #7).

## 9. Career Assessment UX

- Deterministic RIASEC; guest and authed paths; recharts is lazy-loaded;
  per-section pagination; public + SEO-visible. Good core.
- **Gamified/"AI-ish" vocabulary and icons** creep in: `Brain`, `Trophy`,
  `Zap`, `personalityRadar`, `skillsBar` naming and badges — at odds with the
  "human, concrete, career-specific, no AI-sparkle" doctrine (`P2`, #6/#13).
- **Advance mode is not realised** in the results/interpretation step: results
  are laid out as generic Cards on the default canvas, not as a progressive
  "preferences → directions → interpretation" workspace that flows into a Career
  Profile (`P1`, #9/#11).
- Assessment result → "Career Profile / direction" continuity is weak: the
  outcome feeds `direction.primary/secondary/tertiary` into the Dashboard, but
  there is no dedicated, editable Career Profile surface tying interests +
  direction + skills + evidence + goals together (`P0` via #11).

## 10. Market Intelligence UX

- `Markets.tsx` (opportunities) is well-composed with `discover-object` tiles,
  provenance, and honest "not independently verified" treatment.
- `Analysis.tsx` + `components/analysis/*` (market overview, alumni outcomes,
  prescriptive action plan) are the actual "market intelligence" surface and are
  **disconnected and untyped**: not in navigation, only reachable from Markets,
  laid out with generic cards, and heavy recharts with numeric panels
  (`P1`, #10). Align its name and entry with the Opportunities surface.
- Numeric panels ("Success Rate" in the legacy `ai-coach/CareerInsightsPanel`,
  alumni/market percentages in `analysis/*`, readiness 50/30/20) must each carry
  provenance or be removed — doctrine forbids fabricated market statistics and
  ratings. **Verify** every visible percentage that is not a deterministic
  score against a real, labelled source (`P0`/`verify`, #10/#19).

## 11. Career Profile architecture

- There is **no Career Profile object/surface.** The doctrine's core object
  (interests + direction + skills + evidence + gaps + goals) is distributed:
  settings `ProfileSection`, assessment `direction`, CV skills/evidence, and a
  Dashboard `discover` snapshot. This is the single biggest structural gap for
  `discover → prove → advance` continuity (`P0`). Options to sequence later:
  a light profile view + edit entry that composes existing read seams rather
  than new tables (`features/dashboard/discover.ts`, evidence `suggestions.ts`,
  CV guidance) before inventing schema.

## 12. Settings architecture

- Areas: Profile, Account, Notifications, Security, Regional, Preferences.
  Matches the Settings rule (no billing/subscription as a setting); stale deep
  link `?tab=subscription` is guarded to `account`. Good.
- **`Settings.tsx` fires an unconsented third-party geo-IP fetch
  (`https://ipapi.co/json/`)** on first load to pre-fill country/timezone
  (`P1`, privacy/consent + reliability; also a stray empty
  `import { } from '@/utils/countries'`).
- Timezone + language + country + display (dark/compact) preferences are
  persisted ad hoc in `localStorage` across `Settings.tsx`,
  `displayPreferences.ts`, and an i18n key, with a parallel hard-coded fallback
  timezone list and `(Intl as any)` casts — one display-preference seam would be
  simpler (`P2`, #4/#5).
- i18n usage is inconsistent (some labels via `t('…')`, many English literals) —
  the app largely renders English despite 11 locale files (`P2`, #14; tied to
  the open locale decision in `FEATURE_PORTFOLIO_DECISIONS`).

## 13. CV / Interview inconsistencies

- Both are well-engineered and evidence-linked; strong state handling
  (`CV_BUILDER_PERSISTENCE.md`, contextual assistant inside interview/CV). Good
  AI-embedded pattern (contextual drawers, not a chat wall).
- **CV "strength/completion" is computed in two places** (see #4) — reconcile to
  one seam so the score shown in Dashboard equals the score in the CV Builder
  (`P0`, #13).
- Naming drift: UI/copy alternates "Interview simulator",
  "Interview practice", "SynAssist", and route `/interview-simulator`; a single
  public name would read more intentional (`P2`, #13).
- `interview` mode reuses contextual-assistant + voice; keep it Advance-styled
  (progressive question → response → feedback → next), not generic cards
  (`P1`, #13).

## 14. Landing / auth / onboarding inconsistencies

- Landing is strong and truthful (no fabricated counts found; structured data
  built from real FAQ copy; canvas/grid shared with auth). Good.
- Auth shell and onboarding correctly share the public-grid canvas and `noindex`.
- Landing/`AICoach.tsx` still describe a brand "SynAI" that the doctrine wants
  de-emphasised; AICoach page reads like a menu of destinations rather than a
  real surface (`P1`, #9/#14).
- **Contact details are hardcoded in the authenticated top bar** (see #6) —
  keep support channel configurable like `VITE_SUPPORT_URL` rather than a
  phone/Gmail literal (`P1`, #14).

## 15. Motion / microinteraction opportunities

Motion is disciplined and locked (120–180ms, reduced-motion, no zoom/scale/float).
Opportunities, none of which loop or block:
- Advance-mode progress affordances: staged question → answer feedback → next
  (Assessment/Interview) could reuse the existing `route-enter` / one-tick
  patterns instead of new effects (`P2`).
- Onboarding progress bar uses `duration-300` width — faster 180ms token would
  match the inventory (`P2`).
- Discover dashboard already staggers entrance; extend the same restrained
  entrance vocabulary to Market-intelligence and Advance surfaces rather than
  inventing new animation (`P2`).
- Keep every hover-driven affordance reachable by keyboard/touch; dossier
  section nav and inspector already do this — replicate for any new Advance
  controls (`P1`, a11y).

## 16. Accessibility

Strong baseline: skip links, `RouteFocusManager`, `:focus-visible` ring,
`prefers-reduced-motion`, dossier keyboard nav + focus restoration, icon
`aria-hidden`, semantic landmarks. Gaps:
- Many interactive tiles rely on `.discover-object` with `data-interactive` and
  hover; confirm the interactive tiles expose real buttons/links with labels
  (`P1`, verify on Markets/Analysis).
- Hand-rolled micro-labels and color-only status cues should be audited for AA on
  the muted/washes (contrast tests cover tokens; re-run for any new surface)
  (`P2`).
- Admin shell has its own header and does not use `RouteFocusManager`/shared
  focus treatment — verify keyboard context on admin routes (`P2`).

## 17. SEO

Strong: `noindex` on authed/personal routes, unique per-route titles, canonical,
OG, sitemap (/, /assessment, /terms, /privacy), robots, structured data on
landing + assessment. Gaps:
- Title/description manager sets `document.title` per route but **meta
  `description` is only ever the global one** set on the landing `useEffect`;
  other public routes (assessment, terms, privacy) don't install their own
  description/OG, so they inherit stale head tags from the SPA shell (`P2`).
- `/ai-coach`, `/analysis`, and other authenticated-but-not-nav routes are
  correctly disallowed in robots; fine. Keep `/assessment` out of the `noindex`
  set (currently public + in sitemap — correct).
- Single global canonical (`syncareer.me`) is acceptable for an SPA but any
  future public sub-routes need per-route canonicals/descriptions (`P2`).

## 18. Performance risks

- Good: lazy page chunks + route prefetching, async fonts, lazy recharts on
  assessment, lazy PostHog, compositor-friendly motion, `image` dims implied by
  static OG assets.
- `recharts` is statically imported on `Analysis`/`Markets`-adjacent market
  panels and `components/analysis/*` + `CareerOutlookTab`/`MarketOverviewTab`;
  verify it is not downloaded on the Opportunities list cold path
  (`P1`, verify).
- `ipapi.co` call in Settings adds a blocking-ish third-party request on a
  utility page (`P2`).
- `visual-fixtures/EvidenceDossierReview.tsx` and the fixture are isolated by
  `visualFixtureIsolation.test.ts` — keep out of production chunks (`P1`, guard
  already present; keep it).

## 19. Subscription remnants

Healthy free-product state in code:
- Removed monetization surfaces; `/pricing` + `/subscription-success` redirect to
  `/`; free wording in landing/FAQ/terms; support is URL-gated and never unlocks
  features; Settings has no billing; legacy `?tab=subscription` guarded.
- Remaining *remnants are intentional/legacy and clearly marked*: generated
  types still include `subscriptions`, `payments`, `paystack_reference`
  (`integrations/supabase/types.ts`), kept per docs for recovery; root
  `.env.example`/docs mention retained deployed-only `verify-paystack-payment`.
- **Docs are stale on this point**: `docs/FEATURE_PORTFOLIO_DECISIONS.md` §3.9
  still labels Subscriptions "**CORE (the revenue boundary)**", contradicting the
  free-product doctrine and the superseded note in `FRONTEND_AUDIT.md`. Reconcile
  the doc, not the code (`P1`, #19 → fixture/production doc mismatch).
- `components/ai-coach/*` and `features/counsellor/constants.ts` are orphaned
  legacy modules (see #4) (`P2`).

## 20. Fixture → production mismatches

- `visual-fixtures/` is isolated from routes by `visualFixtureIsolation.test.ts`
  — good; keep fixture components out of the lazy route graph.
- The dossier concept demonstrated in `visual-fixtures/EvidenceDossierReview.tsx`
  now ships on `/applications/:id`: the requirement → evidence → application
  material → next action chain, selection-driven inspector with a keyed
  entrance, a mobile inspector sheet, and next actions that focus the control
  that performs the change. `visualFixtureIsolation.test.ts` guards that
  parity so the richer interaction cannot retreat into the fixture.
- The three-mode hooks are implemented + tested but the test *blocks* pages from
  using them (deliberate). When applying mode layout, migrate
  `designSystem.test.tsx` deliberately (this is the "fixture vs applied" gap) so
  the two stay in sync (`P1`, #6/#20).
- Doc drift: `FRONTEND_AUDIT.md` (2026-08-10) describes routes/features that no
  longer exist (Pricing, `/blog`, counsellor clients etc.) with only a partial
  superseded note; `FEATURE_PORTFOLIO_DECISIONS.md` still lists removed/module
  features as active. Audit docs should be refreshed to the current dossier
  architecture (`P1`, #20).
- Hard-coded copy ("SynAI", phone/Gmail) is a form of fixture→production drift
  once those claims/config move (`P1`).

---

## Severity summary

| ID | Finding | Area | Sev |
|---|---|---|---|
| A | Career Profile object/surface absent; assessment/CV/goals not readable as one profile | 9/11 | P0 |
| B | Advance-loop entry gaps: assessment re-entry, analysis, assistant not reachable from nav | 1/6/9/10 | P0 |
| C | Duplicate CV/readiness scoring seams → divergent "facts" (Dashboard vs CV Builder) | 4/13/8 | P0 |
| D | Unproven numeric panels (market/alumni/"success"/readiness) need provenance or removal | 10/19 | P0 (verify) |
| E | Advance-mode surfaces not differentiated; mode hooks defined but un-applied | 2/5/7/15 | P1 |
| F | Dead primitives + orphaned legacy modules (ai-coach, counsellor constants, App.css) | 3/4/5 | P1 |
| G | Hard-coded phone/Gmail support channel; ipapi.co call in Settings | 6/12/14 | P1 |
| H | Mobile: CV/Interview behind "More"; current-dossier chip disappears on nav | 6/8 | P1 |
| I | Doc/fixture drift (subscription doc, audit docs) contradicts current state | 19/20 | P1 |
| J | Micro-label duplication, generic Card walls on Advance, eyebrow drift | 2/7/13 | P2 |
| K | Mobile geo-ip + timezone/localStorage duplication + i18n inconsistency | 12/14 | P2 |
| L | Empty-state vocab duplication (`ui/empty` vs hand-rolled) | 4/3 | P2 |

---

## Proposed implementation order

Work in sequence so each step strengthens `discover → prove → advance` and
reuses existing seams before adding anything new. **Nothing below changes
application behaviour yet**; each is a scoped, testable change.

**Phase 0 — Truth & single-source (P0: D, C)**
1. Inventory every visible percentage/numeric panel (Dashboard readiness, CV
   strength, market/alumni/analysis, legacy ai-coach). For each: keep only
   deterministic scores that are labelled and sourced; remove or add provenance
   to anything unverifiable. Add one "score provenance" contract test.
2. Collapse CV/readiness scoring to a single module used by Dashboard and CV
   Builder (delete `useCareerReadiness.ts` duplicate or make it the one seam;
   unify `scoreResume` and `useCVStrengthScore`). Add a test asserting Dashboard
   and CV Builder render the same number from the same input.

**Phase 1 — Connect the object model (P0: A, B)**
3. Introduce a light **Career Profile** entry that composes existing read seams
   (direction from assessment, skills/evidence, goals) into one editable
   surface; do not add schema. Wire Assessment result → Profile → Dashboard.
4. Add persistent navigation entry points for Advance: Assessment (incl.
   "retake/refine" once complete), and Analysis. Promote the now-empty `More`
   overflow so CV Builder/Interview are first-class on mobile if capacity
   allows; otherwise make the labels/entry unmistakable. Reconcile the
   `/ai-coach` transitional page's purpose and copy (drop "SynAI" as a brand).

**Phase 2 — Distinct workspaces, one language (P1: E, A-from-mode)**
5. Apply mode density/geometry at the layout or page level for Advance surfaces
   (Assessment results, Interview, Analysis) using existing mode hooks; do this
   as an intentional migration of `designSystem.test.tsx` and `motionInventory`
   guardrails. Reuse Discover's restrained entrance vocabulary.

**Phase 3 — Consolidate primitives & hygiene (P1: F, H, I; P2: J, K, L)**
6. Remove dead `ui/` primitives (empty, spinner, button-group, field, item,
   input-group, kbd, separator) and orphaned modules (`components/ai-coach/*`,
   `features/counsellor/constants.ts`, `App.css`); standardise empty states on
   `RecordState`.
7. Refresh `docs/FRONTEND_AUDIT.md` + `docs/FEATURE_PORTFOLIO_DECISIONS.md` to
   the current dossier architecture and free-product model.
8. Settings cleanup: replace the hard-coded geo-IP call, unify timezone/country/
   display preference storage, remove the empty import, align i18n usage.
9. Centralise eyebrow/micro-label styling on `.eyebrow`; replace generic-Card
   walls on Advance surfaces with purposeful object composition; unify "Interview
   simulator/practice/SynAssist" naming.

**Phase 4 — Configuration & polish (P1: G; P2)**
10. Move the support contact (phone/email) behind configuration (like
    `VITE_SUPPORT_URL`) so no personal data is hardcoded in chrome; confirm
    consent for any retained network call.
11. Verify market/Analysis recharts are lazy on cold paths; keep
    `visual-fixtures` isolated.

---

## Verification note

This audit is static. No application code changed and no build/test was run;
the commit is documentation + `AGENTS.md` only. The referenced locked tests
(`designSystem.test.tsx`, `dossierScope.test.ts`, `motionInventory.test.ts`,
`designTokens.test.ts`, `visualFixtureIsolation.test.ts`) define the invariants
any later implementation phase must keep green.
