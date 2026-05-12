## System scan results

I ran a full pass: TypeScript typecheck (217 errors, 156 substantive), production build (succeeds, 22s), the Supabase database linter, edge-function inspection, cron-job inspection, RLS policies for every table, and a manual review of the recently-shipped Markets / Analysis / Dashboard / CV / Interview code. **The app builds and runs**, but I found a handful of real issues worth fixing before they become user-visible bugs.

### What's healthy
- Production build green; PWA precache OK; no runtime console errors in the preview.
- All 35+ public tables have RLS enabled with sensible policies (verified each one).
- New `saved_jobs`, `alumni_outcomes_cache`, `application_deadline / company_domain / experience_level` columns exist in the database with correct policies.
- New `aggregate-external-jobs-daily` cron is registered and active (6 AM UTC).
- Recent edge functions (alumni-outcomes, market-intelligence, aggregate-external-jobs) all handle CORS + OPTIONS + error paths correctly.

### Issues found (ranked by impact)

**1. Out-of-sync Supabase types file (high, silent risk)**
`@/integrations/supabase/types.ts` (the file the app actually imports, at `artifacts/syncareer/src/integrations/supabase/types.ts`) is missing `saved_jobs`, `alumni_outcomes_cache`, and the new `job_postings` columns. The root copy at `src/integrations/supabase/types.ts` was updated, but the artifacts copy was not. Runtime works (PostgREST doesn't enforce TS types), but the typecheck fails on Markets.tsx and any future code touching saved_jobs will be unsafe. **Fix:** copy the up-to-date types from root to `artifacts/syncareer/src/integrations/supabase/types.ts`.

**2. Duplicate daily job-scrape cron (high, runtime cost + duplicate data)**
Two cron jobs run at `0 6 * * *` and both insert into `job_postings`:
- `daily-job-scrape` → calls a pre-existing deployed `scrape-jobs` function
- `aggregate-external-jobs-daily` → calls the new `aggregate-external-jobs` function

They will both run tomorrow at the same minute, doubling Firecrawl spend and producing near-duplicate rows (different `external_id` prefixes mean dedupe won't catch them). **Fix:** unschedule the older `daily-job-scrape` so only the new aggregator runs, OR offset them by 12 hours if both are intentional. I recommend unscheduling — the new one covers more sources.

**3. Markets.tsx TS errors caused by issue #1 (high, blocks typecheck)**
6 errors in Markets.tsx are all `'saved_jobs' is not assignable to ...table names`. They disappear once the types file is refreshed (issue #1).

**4. Pre-existing strict-mode TS errors in older files (medium, no runtime impact today)**
~150 errors across Assessment, Dashboard, Onboarding, Settings, Learn, Portfolio, etc. — almost all from `noUncheckedIndexedAccess` (`array[i]` is `T | undefined`) and a few unused-import warnings. Not introduced by recent work. **Fix:** out of scope for this pass — recommend a separate dedicated cleanup task. Flagging only.

**5. Edge-function import inconsistency in `aggregate-external-jobs` (low)**
Mixes `https://esm.sh/@supabase/supabase-js@2.39.0` with `npm:@supabase/supabase-js@2/cors`. Works, but `npm:` specifiers are more stable on edge-runtime. **Fix:** switch the createClient import to `npm:@supabase/supabase-js@2`.

**6. Pre-existing supabase linter warnings (informational, not introduced now)**
3× public-bucket-allows-listing on existing buckets and 5× SECURITY DEFINER function executable warnings. All present before today. Not blocking — flagging for future hardening.

### Plan: fix-up pass

I'll do a small, focused cleanup — no feature work, no refactors — that resolves the items that actually matter today:

1. **Refresh the in-use Supabase types file** so it includes `saved_jobs`, `alumni_outcomes_cache`, and the new `job_postings` columns. This eliminates 6+ TS errors and prevents future silent bugs.
2. **Unschedule the legacy `daily-job-scrape` cron** so we don't run two scrapers at 6 AM UTC.
3. **Pin `aggregate-external-jobs` to `npm:` imports** for runtime stability.
4. **Verify** by re-running typecheck on Markets.tsx and listing cron jobs to confirm only one daily aggregator remains.

What I'm explicitly NOT doing in this pass (let me know if you want any of these):
- Sweeping the ~150 strict-null TS errors in older files (separate effort).
- Tightening the 3 pre-existing public-bucket policies (storage hardening).
- Reviewing the 5 pre-existing SECURITY DEFINER functions (auth hardening).
- Any visual/UX changes.

### Technical details

- Types file path used by the app: `artifacts/syncareer/src/integrations/supabase/types.ts` (resolved via `@/*` alias in `artifacts/syncareer/tsconfig.json`).
- Cron unschedule: `SELECT cron.unschedule('daily-job-scrape');`
- Edge-function migration: replace `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';` with `import { createClient } from 'npm:@supabase/supabase-js@2';`.
