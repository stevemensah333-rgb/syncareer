# Performance baseline (pre-optimization)

Captured on this branch before optimization work.

## Production build chunks (rollup reported, top N)

```
assets/html2pdf-CnsUO0bh.js                976.35 kB   (lazy; dynamically imported only on CV download)
assets/index-C4j-jTUn.js                   912.56 kB   (initial entry)
assets/BarChart-BA040EPi.js                384.09 kB   (recharts)
assets/use-mobile-CQEb00qP.js              135.04 kB   (shared: react-day-picker/date-fns v4 pulled in via Navbar AskCounsellorDialog)
assets/AnimatedSection-BqD_lacG.js         119.41 kB   (framer-motion shared across many pages)
assets/types-Ckmm97PT.js                    65.47 kB   (zod)
assets/Assessment-B0gsfR2d.js               55.93 kB
assets/CVBuilder-Ct1ePYU2.js                51.95 kB
assets/Settings-CJvoFaJE.js                 43.49 kB
assets/InterviewSimulator-BDqyyhCd.js       37.65 kB
assets/Analysis-B6bkrrD-.js                 36.97 kB
assets/CounsellorDashboard-Dc8nUsjl.js      33.27 kB
assets/Landing-DxvJlrKr.js                  29.93 kB
```

## Package contribution to rendered (uncompressed) JS (from rollup-plugin-visualizer)

- html2pdf.js 1552 kB + html2canvas 446 kB → 1998 kB in html2pdf chunk (dynamic import, OK but still huge)
- recharts 588 kB + lodash 190 kB + d3-* 95 kB → ~940 kB in BarChart chunk (lazy when charts used)
- react-dom 527 kB (in initial index chunk)
- @supabase/auth-js 359 kB (in initial index chunk)
- motion-dom 272 kB + framer-motion 95 kB → 367 kB AnimatedSection chunk
- date-fns v3 117 kB + date-fns v4 117 kB (**two versions** — v4 pulled by react-day-picker v9)
- posthog-js 187 kB (initial index chunk)
- @supabase/postgrest-js 126 kB, storage-js 99 kB, realtime-js 84 kB (initial)
- tailwind-merge 97 kB, i18next 79 kB, react-router 83 kB, sonner 63 kB (initial)
- zod 130 kB

## Landing media (public/)

- public/videos/hero-bg.mp4 — **7.8 MB** (unused — code references `/videos/promo-video.mp4` which doesn't exist)
- public/landing/feature-*.png — 1.2–1.5 MB each × 3
- public/landing/story-*.png — 1.2–1.5 MB each × 3
- public/landing/hero-graduate.png — 1.1 MB (referenced nowhere in src)
- src/assets/landing-bg.png — 2.9 MB (referenced nowhere in src)

## Supabase query overlap (measured by code inspection)

- `useSubscription` calls `getUserSubscription` then `isPremiumUser` which calls `getUserSubscription` again → duplicate subscriptions fetch on every page that mounts Navbar.
- `useCareerReadiness` re-fetches `user_skills`, `resumes`, `mock_interviews` already fetched by Dashboard in parallel.
- Dashboard re-fetches `profiles.full_name` even though `UserProfileProvider` already has the profile.

## External job aggregation edge function (supabase/functions/aggregate-external-jobs)

- Fires `majors × 6 sites` search requests with **no concurrency bound** (Promise.all).
- Inserts jobs row-by-row with a preceding `select ... maybeSingle()` existence check — classic N+1.
- No unique constraint on `external_id` verified in repo (uses maybeSingle+insert race-prone pattern).
