# Performance stage 2 results (2026-08-11)

> **Historical note:** Performance record of the former subscription-era app (pre-2026-09-04). Monetization modules it mentions (`Pricing`, `SubscriptionSuccess`, the subscription hook/service) were removed with the free-product change — see ../FREE_SERVICE_AND_SUPPORT.md.

Branch: `arena/019ff13c-syncareer-8ec74d70` (from `main` @ `4906269`).
Follows `docs/perf/baseline.md` (pre-optimization) and `docs/perf/results.md` (stage 1).

## Method and environment

All numbers below were measured in the same sandbox, on this branch, before and
after the changes, using the same commands:

- Frozen install: `corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile`
- Typecheck: `corepack pnpm --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit`
- Tests: `corepack pnpm --dir artifacts/syncareer exec vitest run`
- Production build: `corepack pnpm --dir artifacts/syncareer exec vite build --config vite.config.ts` (rollup-reported sizes, uncompressed)
- Opportunity-list render cost: React Profiler commit durations in
  `src/pages/Markets.perf.test.tsx` (400 synthetic rows; one search keystroke
  that keeps 342 rows on screen)

Local build timing and Profiler numbers describe this environment only; they
are not production RUM. The sandbox could not reach the live Supabase backend
(outbound blocked), so production payload sizes and network latency were NOT
measured this stage — see "Not verified".

## Changes and measured effect

### 1. framer-motion removed from the app (bundle)

`AnimatedSection` was the only importer of framer-motion, but it is used by
Assessment (public, idle-prefetched from the landing page), CVBuilder,
InterviewSimulator, Analysis, Settings, Pricing, SubscriptionSuccess and the
admin/counsellor pages — every one of those routes paid for a ~119 kB shared
chunk (framer-motion + motion-dom contributed ~367 kB of rendered JS in the
stage-1 analysis) just for a 150 ms fade/slide.

Rewrote `AnimatedSection` with an IntersectionObserver + CSS transition
(same props, same 150 ms ease-out timing, same delay cap, same
`prefers-reduced-motion` behaviour, instant-reveal fallback when
IntersectionObserver is unavailable) and removed the `framer-motion`
dependency (`pnpm-lock.yaml` regenerated, frozen install re-verified).

| Chunk | Before | After |
|---|---:|---:|
| `AnimatedSection-*.js` (shared) | 119.36 kB | **1.08 kB** |
| framer-motion + motion-dom rendered JS | ~367 kB (stage-1 analysis) | 0 |

### 2. Assessment route no longer statically imports recharts (route bundle + landing prefetch)

`pages/Assessment.tsx` imported recharts (Bar/Radar charts) at module scope
although charts only render once a completed result exists. The route is
public and is idle-prefetched from the signed-out landing page, so signed-out
visitors downloaded the route chunk **plus** the 384 kB recharts chunk while
just reading the landing page.

The three chart blocks moved to `components/assessment/AssessmentResultCharts.tsx`
and are `React.lazy`-loaded inside the result view.

| Chunk | Before | After |
|---|---:|---:|
| `Assessment-*.js` route chunk | 58.75 kB | **46.70 kB** |
| `AssessmentResultCharts-*.js` (new, lazy) | — | 14.88 kB (only on result view) |
| `BarChart-*.js` (recharts, lazy shared) | 384.09 kB — static dependency of the route | 384.09 kB — loaded only when a result is shown |

### 3. Opportunity list typing (measured rerender cost)

`Markets.tsx` rendered every filtered row inline; each keystroke re-rendered
every surviving row (each wrapped in a hover-preview card).

Extracted a memoized `OpportunityRow` with stable callbacks
(`toggleSave`/keyboard navigation/selection now `useCallback`s reading the
latest state through refs). No behaviour change: selection, keyboard
navigation, save/unsave and URL sync are covered by the existing 14 Markets
tests, which still pass.

Profiler measurement, 400 synthetic rows (same test, before vs after):

| Metric | Before | After |
|---|---:|---:|
| Initial render of 400 rows | 1992 ms | 1525 ms |
| One keystroke keeping 342 rows | **562.5 ms** | **48.5 ms** (~12× cheaper) |

Guarded by `src/pages/Markets.perf.test.tsx`. Virtualization was deliberately
not added — the measured rerender cost is now small, and the live row count
could not be measured from this sandbox (see "Not verified").

### 4. Application workspace no longer remounts on every keystroke (rerender bug)

`ApplicationWorkspaceDetail` defined its `Overview`/`Actions` sections as
nested component functions. Every keystroke (notes, next action) re-rendered
the parent, which produced fresh component identities, so React unmounted and
remounted the entire workspace subtree — dropping focus and re-rendering every
control. Converted to plain render-function calls (no component boundary).

Regression tests in `src/components/applications/ApplicationWorkspaceDetail.test.tsx`
assert the notes textarea and next-action input keep the same DOM node across
keystrokes; both fail against the previous code (verified by temporary revert)
and pass with the fix.

### 5. Contextual assistant requests are cancelled when the UI goes away (leak/stale-response bug)

`requestContextualAssistance` (billable AI call to `career-guidance`) had no
cancellation path. The drawer unmounts whenever the user switches workspace
tabs on mobile, navigates, or closes the host panel — the request kept
running and its response could land on a closed UI.

- `requestContextualAssistance(task, instruction, context, signal?)` now
  accepts an `AbortSignal`, passes it to `fetch`, rejects with a new
  `'cancelled'` error code on abort (pre-aborted signal, in-flight abort, or
  response arriving after abort), and emits no failure analytics for
  cancellations.
- `ContextualAssistantDrawer` creates one controller per send and aborts it on
  unmount; cancelled errors are never surfaced as failures.

Regression tests: `contract.test.ts` (+3 cases) and
`ContextualAssistantDrawer.test.tsx` (+2 cases).

### 6. Dead asset removed

`src/assets/syncareer-logo.png` (116 kB) was imported nowhere (all logo
imports use the SVG; the only "logo.png" reference in the repo is a
deployed-site URL in blog JSON-LD). Removed.

## Critical routes — status after this stage

| Route | Effect |
|---|---|
| Signed-out landing first render | Idle route prefetch no longer pulls framer-motion (−119 kB) or the recharts dependency chain; landing chunk itself unchanged (26.17 kB) |
| Sign-in / auth redirect | No change needed (race-guarded already) |
| Dashboard usable state | No change needed (single consolidated query already) |
| Opportunity list / detail selection | ~12× cheaper keystroke rerenders (562 → 48 ms measured) |
| Application workspace selection | Workspace no longer remounts while typing |
| CV load/type/save/preview/export | Route no longer downloads framer-motion; save coalescing already in place |
| Interview setup / session start | Route no longer downloads framer-motion; session-start retry policy unchanged (no retry on billable start) |
| Contextual assistant open/stream/cancel | In-flight billable requests cancelled on unmount; stale responses dropped |

Unchanged by design: initial entry chunk (735.26 kB — react-dom, supabase-js,
router, i18n, UI primitives; reducing it needs deeper surgery than this stage),
html2pdf chunk (still lazy, only on CV download), route-level splitting.

## Verification (exact commands and results, this stage)

- `corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile` — OK (re-verified after lockfile regeneration)
- `tsc -p tsconfig.json --noEmit` — clean
- `vitest run` — **386 passed (68 files)**; baseline was 376 passed (66 files); +10 new regression tests
- `vite build` — OK, ~17 s; chunks listed above
- `git diff -- .github/workflows` — empty (protected path untouched)

## Not verified / risks

- **Live opportunity feed size and payload.** The sandbox cannot reach the live
  backend, so the real row count and the network cost of the unbounded
  `select('*')` on `job_postings` were not measured. Rendering cost is now
  guarded locally; if production telemetry shows hundreds/thousands of rows,
  the follow-up is server-side pagination or a column-limited list query plus
  on-selection detail fetch (behaviour change — needs its own stage).
- AnimatedSection reveal timing is visually equivalent (same duration/delay),
  but was not eyeballed in a real browser from this sandbox.
- Assistant cancellation aborts the HTTP request; whether the deployed Edge
  Function stops its upstream AI call on client disconnect is platform
  behaviour, not verified here.

## Rollback

All changes are in one focused branch/patchset. `git revert` of the stage
commit restores the previous behaviour; the framer-motion dependency returns
by re-adding `"framer-motion": "^12.23.24"` to `artifacts/syncareer/package.json`
and re-running the workspace install.

## Files changed

Frontend (`artifacts/syncareer/`):

- `src/components/landing/AnimatedSection.tsx` — IntersectionObserver + CSS implementation (framer-motion removed)
- `src/components/landing/AnimatedSection.test.tsx` — new reveal/fallback tests
- `package.json` — dropped `framer-motion`
- `src/pages/Assessment.tsx` — charts lazy-loaded
- `src/components/assessment/AssessmentResultCharts.tsx` — new lazy chart module
- `src/pages/Markets.tsx` — memoized `OpportunityRow`, stable callbacks
- `src/pages/Markets.perf.test.tsx` — new render-cost regression guard
- `src/components/applications/ApplicationWorkspaceDetail.tsx` — render functions instead of nested components
- `src/components/applications/ApplicationWorkspaceDetail.test.tsx` — +2 keystroke-remount regression tests
- `src/features/contextual-assistant/contract.ts` — optional `AbortSignal`, `cancelled` error code
- `src/features/contextual-assistant/contract.test.ts` — +3 cancellation tests
- `src/components/assistant/ContextualAssistantDrawer.tsx` — abort on unmount, cancelled errors not surfaced
- `src/components/assistant/ContextualAssistantDrawer.test.tsx` — +2 cancellation tests
- `src/assets/syncareer-logo.png` — removed (unused, 116 kB)

Workspace:

- `pnpm-lock.yaml` — regenerated after removing framer-motion
