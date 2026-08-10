# Performance optimization results

Branch: `arena/019feba0-syncareer`.

## Bundle (production `vite build`, reported chunk sizes / kB)

| Chunk | Before | After | Δ |
|---|---:|---:|---:|
| Initial entry (`index-*.js`) | 912.56 | 726.31 | **−186 kB (−20%)** |
| Analytics chunk (`posthog-js`, lazy) | (in index) | 190.82 | moved out of initial |
| Ask-counsellor dialog (`react-day-picker` + date-fns v4, lazy) | (in index/use-mobile, ~300 kB) | 81.84 | moved out of initial |
| `use-mobile-*.js` (shared UI primitives) | 135.04 | 53.86 | **−81 kB** |
| `html2pdf-*.js` (CV export) | 976.35 | 976.35 | kept lazy (only on download) |
| `BarChart-*.js` (recharts) | 384.09 | 384.09 | already lazy per route |
| `AnimatedSection-*.js` (framer-motion) | 119.41 | 119.41 | kept, already lazy chunk |
| `types-*.js` (zod) | 65.47 | 52.92 | reduced by tree-shaking |

Initial JS transferred on landing (uncompressed, sum of chunks referenced from `index.html`):

- Before: ~912 kB entry JS → critical JS ~912 kB + css ~111 kB
- After: ~726 kB entry JS + posthog fetched lazily on first interaction (~190 kB not in critical path) → critical JS **reduced by ~190 kB** and the posthog chunk is deferred until after first paint / first interaction.

## Landing media

| Asset | Before | After | Δ |
|---|---:|---:|---:|
| `public/videos/hero-bg.mp4` | 7,834 kB (unused) | 0 (deleted) | **−7.8 MB** |
| `public/landing/feature-*.png` × 3 | 1.2–1.5 MB each | 16–26 kB each (webp) | **~95% smaller** |
| `public/landing/story-*.png` × 3 | 1.2–1.5 MB each | 24–38 kB each (webp) | **~97% smaller** |
| `public/landing/hero-graduate.png` | 1.1 MB (unused) | 10 kB webp placeholder | −1.1 MB |
| `src/assets/landing-bg.png`, `landing-hero.jpg`, `landing-spotlight.jpg` | 3.2 MB total (unused) | 0 (deleted) | −3.2 MB |

`public/landing/` total: **9.2 MB → 180 kB** (≈ 98% reduction).

Images are served with `<img loading="lazy" decoding="async">` below the fold; `<video>` modal for the non-existent `/videos/promo-video.mp4` was replaced with a "Start free" CTA to avoid a broken network request on every page.

## Supabase query overlap on key routes

### Dashboard

- Removed `useCareerReadiness(major)` which re-fetched `user_skills`, `resumes`, `mock_interviews` in a second parallel round trip that duplicated queries the Dashboard was already issuing.
- Removed duplicate `profiles.full_name` fetch (already in `UserProfileProvider`'s cached bundle).
- Removed duplicate `student_details` fetch (already in `UserProfileProvider`).
- Dashboard now fires **one** consolidated `Promise.all` for assessment, applications, interview, resume, job postings, and (conditionally) skills instead of the earlier 7 queries + 3 from `useCareerReadiness` = ~10 → **6 focused queries**, with profile/student_details served from the already-cached React Query bundle.

### Subscription hook

- `useSubscription` previously called `getUserSubscription()` then `isPremiumUser()` which called `getUserSubscription()` again → **2 subscriptions queries per Navbar mount**. Refactored `isPremiumUser` in terms of a new pure `isActivePremium(sub)` helper; the hook now reads the row once and scores it locally.

### External job aggregation (`supabase/functions/aggregate-external-jobs`)

- Bounded outbound Firecrawl concurrency to **MAX_CONCURRENT_SEARCHES = 6** with a simple task-pool runner (previously `Promise.all` over `majors × 6 sites`, unbounded).
- Replaced N+1 existence check + single `insert` with a single **bulk `upsert`** in 200-row chunks using a new unique partial index on `job_postings(external_id) WHERE external_id IS NOT NULL` (added as migration `20260810120000_job_postings_external_id_unique.sql`). Existing rows are updated in place rather than skipped via SELECT-then-INSERT race.
- Deduplicated jobs by `external_id` within a single run before upsert.
- Inserted/updated counts are reported back using a before/after row count.

## Lazy-loading / code-splitting changes

- **PostHog analytics** (~190 kB) now loads lazily: the `posthog-js` module is fetched on the first tracked event or on `initializeAnalytics()` (called during idle from `main.tsx`). Events fired before load are queued and replayed in order; previously a static top-level `import posthog from 'posthog-js'` pulled the whole library into the initial chunk.
- **AskCounsellorDialog** (~300 kB of `react-day-picker` + date-fns v4 + popover/calendar UI) is now `React.lazy()`-loaded from `Navbar`, with an idle/hover/focus preload hint so the chunk is usually cached by the time a user clicks "Ask a Counsellor".
- **html2pdf.js** (~976 kB) was already dynamically imported on CV download; no change needed (verified still in its own lazy chunk).
- **recharts** (~940 kB with lodash/d3) stays in the Assessment / FeedbackDashboard route chunks — confirmed not pulled into the initial entry.
- Removed an unused 761-line shadcn-style `components/ui/sidebar.tsx` that was re-exporting tooltip/sheet/skeleton/separator dependencies into the shared `use-mobile` chunk.

## Media & dead-asset cleanup

- Removed unused `public/videos/hero-bg.mp4` (7.8 MB) and the `public/videos/` directory.
- Removed unused `src/assets/landing-bg.png`, `landing-hero.jpg`, `landing-spotlight.jpg` (3.2 MB total).
- Converted all landing photographic PNGs to WebP (q=80, max 720px wide) — visual quality reviewed side-by-side; file sizes dropped ~95–97%.
- Updated all landing image components to use `.webp` paths and added `loading="lazy" decoding="async"` to non-LCP images.
- Removed the broken `/videos/promo-video.mp4` modal from `TabbedShowcase` (the asset didn't exist; the UI referenced a 404). Replaced with a direct "Start free assessment" CTA.

## Verification

- `pnpm --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit` — clean.
- `pnpm --dir artifacts/syncareer exec vitest run` — **108 tests passing**. Updated `analytics.test.ts` and `useAICoachAccess.test.ts` to cover the new lazy-loading behavior and the `isActivePremium` refactor.
- `npm run build` (production) — completes successfully; chunks listed above.
- No behavioral changes to auth, SEO meta tags/JSON-LD, PostHog event names/payloads, Lovable OAuth flow, or RLS. Analytics event names and convenience helpers (`trackEvent`, `trackPageView`, `trackCVDownloaded`, etc.) retain their previous signatures.

## Files changed

Frontend:
- `artifacts/syncareer/src/services/analytics.ts` — lazy posthog-js loader with replay queue
- `artifacts/syncareer/src/services/analytics.test.ts` — tests for lazy loading
- `artifacts/syncareer/src/services/subscriptionService.ts` — extracted `isActivePremium` to remove duplicate fetch
- `artifacts/syncareer/src/hooks/useSubscription.ts` — uses cached subscription row, no double fetch
- `artifacts/syncareer/src/hooks/useAICoachAccess.test.ts` — updated mocks
- `artifacts/syncareer/src/components/layout/Navbar.tsx` — lazy AskCounsellorDialog with hover preload
- `artifacts/syncareer/src/pages/Dashboard.tsx` — consolidated queries, dropped duplicate useCareerReadiness fetch
- `artifacts/syncareer/src/components/landing/TabbedShowcase.tsx` — removed dead video modal, replaced with CTA
- `artifacts/syncareer/src/components/landing/CommunitySection.tsx`, `SolutionSection.tsx`, `SuccessStoriesSection.tsx` — webp paths + `decoding="async"`
- `artifacts/syncareer/src/components/ui/sidebar.tsx` — deleted (unused)
- `artifacts/syncareer/src/main.tsx` — analytics warmup scheduling (load on first interaction or idle)
- `artifacts/syncareer/public/landing/*` — replaced PNGs with optimized WebPs
- `artifacts/syncareer/public/videos/hero-bg.mp4` — removed (dead asset)
- `artifacts/syncareer/src/assets/landing-bg.png`, `landing-hero.jpg`, `landing-spotlight.jpg` — removed (dead assets)

Backend:
- `supabase/functions/aggregate-external-jobs/index.ts` — concurrency-bound searches + bulk upsert
- `supabase/migrations/20260810120000_job_postings_external_id_unique.sql` — unique partial index for external_id (enables upsert; was missing)

Tooling:
- `scripts/analyze-bundle.mjs` — bundle analysis helper used during this pass (reads rollup-plugin-visualizer output)
