# Migration proposal — application journey integrity (revised, NOT APPLIED)

Status: **proposal only**. No SQL has been executed. No files under `.github/workflows/` were touched.

Live inspection date: 2026-08-11 UTC. Postgres **17.6** (relevant: `ON DELETE SET NULL (column_list)` is supported, PG15+).

---

## 0. Verified live facts

### Existing keys/constraints

| Table | Constraint |
| --- | --- |
| `job_applications` | PK `(id)`; UNIQUE `(job_id, applicant_id)`; FK `job_id → job_postings(id) ON DELETE CASCADE`; FK `applicant_id → auth.users(id) ON DELETE CASCADE`; CHECK status in `pending, reviewing, shortlisted, interview, offered, hired, rejected, withdrawn` |
| `saved_jobs` | PK `(id)`; UNIQUE `(user_id, job_id)`; **no foreign keys at all**; both columns NOT NULL |
| `resumes` | PK `(id)`; FK `user_id → auth.users(id) ON DELETE CASCADE` |
| `mock_interviews` | PK `(id)`; FK `user_id → auth.users(id) ON DELETE CASCADE`; CHECK status in `in_progress, completed, abandoned` |
| `job_postings` | PK `(id)`; UNIQUE partial index `idx_job_postings_external_id (external_id) WHERE external_id IS NOT NULL`; CHECK status in `draft, active, closed, paused` |

### Row counts (live)

`job_applications` 9 · `saved_jobs` 0 · `resumes` 1 · `mock_interviews` 2 · `job_postings` 24 (20 external) · `profiles` 89 · Auth users 89.

All 9 applications point at **internal** postings (`is_external = false`, no `source_url`, no `company_name`): 5× "Social Media Manager", 2× "Senior software engineer", 1× "MANAGER", 1× "ML ENGINNER"; statuses 8 `pending`, 1 `withdrawn`. Zero orphan `saved_jobs` rows (table is empty).

### RLS (unchanged by this proposal)

- `job_applications`: `ALL USING (auth.uid() = applicant_id)` + two legacy employer policies keyed on `job_postings.employer_id`.
- `resumes`, `mock_interviews`: `ALL USING (auth.uid() = user_id)`.
- `saved_jobs`: separate SELECT/INSERT/DELETE policies on `auth.uid() = user_id`.
- `job_postings`: authenticated SELECT of `status = 'active'`; employer-owned ALL.

Note: the legacy employer policies dereference `job_applications.job_id`. When `job_id` becomes nullable the `EXISTS` sub-select simply returns false for null rows — **no policy behaviour change for the current student-only product**, and no widening.

---

## 1. Aggregator deletion behaviour (item 4) — verified

Source: `supabase/functions/aggregate-external-jobs/index.ts`, scheduled by pg_cron job `aggregate-external-jobs-daily` at `0 6 * * *`.

- **Write mode:** `.upsert(chunk, { onConflict: 'external_id', ignoreDuplicates: false })` in 200-row chunks. Rows are **updated in place**; `id` and `created_at` are preserved. Nothing is deleted or recreated.
- **Identity across refreshes:** `external_id = "<source.id>:<source_url>"` (e.g. `jobberman:https://…`), matched through the unique partial index.
- **Is `external_id` stable?** Only as stable as the scraped `source_url`. It is *reasonably* stable but not guaranteed: if a board changes its URL shape, adds tracking params, or Firecrawl returns a canonicalised vs. non-canonicalised URL, the same posting yields a **new** `external_id` and therefore a **new row**. Old rows are then simply left behind — they are never deleted, so no cascade fires, but stale duplicates accumulate.
- **Expiry/inactivation:** none. There is **no** code path that sets `status = 'closed'`, no deadline sweeper, no pruning job. `job-digest` and `send-onboarding-nudges` are read-only with respect to `job_postings`.
- **Code paths that can currently trigger `ON DELETE CASCADE`:** no application or edge-function code deletes from `job_postings`. The realistic triggers today are (a) manual/admin deletion via SQL or the Cloud table editor, (b) a future pruning job, (c) `employer_id` user deletion if an employer-owned cascade is ever added. So the cascade risk is **latent, not currently firing** — which is precisely why it is safe to fix now.
- **Inner joins:** `rg "!inner"` returns nothing. Every read uses PostgREST's default **left** embed:
  - `ApplicationTracker.tsx` → `job:job_postings(title, location, employment_type, salary_min, salary_max, company_name, department, source, source_url, application_deadline, skills, experience_level, updated_at)`
  - `Dashboard.tsx` → `job:job_postings(id, title, company_name, location, employment_type, application_deadline)`
  - `Markets.tsx` reads `job_applications(id, job_id, status)` flat.
  - MCP `list_my_saved_jobs` → `saved_jobs.select("job_id, created_at, job_postings(...)")` — also a left embed.
  These already render `app.job?.title || 'Tracked application'`, so a null embed degrades rather than crashes. **No query breaks when `job_id` becomes nullable.**

Conclusion: changing the `job_id` FK is safe, and no current process depends on cascade semantics.

---

## 2. Migration state reconciliation (item 7) — verified

- Live ledger (`supabase_migrations.schema_migrations`) max version: **`20260801114257`**.
- Repository root `supabase/migrations/` contains a later file, `20260810120000_job_postings_external_id_unique.sql`, which is **not in the ledger**, yet `idx_job_postings_external_id` **does exist live**. This is the "out-of-ledger index": the index was created against the live database out of band (direct SQL / an earlier apply that was not recorded), and the file was written afterwards as documentation. It is *drift in the ledger, not drift in the schema*.
  - **Do not** mark it applied and **do not** re-run it as part of this work. It is left alone. (If it is ever reconciled, it must be a separate, deliberate `CREATE UNIQUE INDEX IF NOT EXISTS` no-op migration.)
- Therefore every new migration filename must sort **after `20260810120000`**. Proposed timestamps: `20260811T…` as below.
- The nested `artifacts/syncareer/supabase/migrations/20260508201500_add_profiles_tour_completed.sql` is **out of scope** and will not be applied here. All new canonical migrations go in root `supabase/migrations/`.
- Idempotency: `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` are used (safe, additive). Constraint and trigger creation is **not** blanket-idempotent — it is guarded by explicit `DROP CONSTRAINT IF EXISTS` / `DROP TRIGGER IF EXISTS` immediately before creation so a re-run is deterministic rather than silently skipping a *changed* definition.

---

## 3. Revised schema

### `job_applications` (additive, plus one FK replacement)

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `job_id` | uuid | **becomes nullable** | FK → `job_postings(id) ON DELETE SET NULL` |
| `resume_id` | uuid | null | composite FK, see below |
| `outcome` | text | null | CHECK in `offer, rejected, ghosted, withdrawn, accepted` |
| `outcome_at` | timestamptz | null | CHECK: null unless `outcome` is set |
| `outcome_notes` | text | null | free text |
| `next_action` | text | null | short user-authored next step |
| `next_action_due` | date | null | |
| `job_title_snapshot` | text | null | |
| `company_name_snapshot` | text | null | |
| `source_url_snapshot` | text | null | |
| `location_snapshot` | text | null | |
| `deadline_snapshot` | date | null | |
| `external_id_snapshot` | text | null | re-link key if the posting reappears |

**Snapshot fields evaluated, not blindly accepted.** The tracker card renders title, company, location, deadline, source link and a "source" badge; `employment_type`, `salary_*`, `skills`, `experience_level` are decorative in the list and available from the live posting when it exists. So:

- **Include:** `job_title_snapshot`, `company_name_snapshot`, `source_url_snapshot`, `location_snapshot`, `deadline_snapshot`, `external_id_snapshot`.
- **Exclude `work_mode_snapshot`:** there is no `work_mode` column. `employment_type` is the nearest field, and it is not needed to render a detached application. Adding it would create a column with no interface consumer.

### `mock_interviews`

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `application_id` | uuid | null | composite FK → `job_applications(id, applicant_id)`, `ON DELETE SET NULL (application_id)` |

Standalone interviews remain fully supported: `application_id` stays nullable and unconstrained when null.

### `saved_jobs`

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `user_id` | uuid | NOT NULL | new FK → `auth.users(id) ON DELETE CASCADE` |
| `job_id` | uuid | **becomes nullable** | new FK → `job_postings(id) ON DELETE SET NULL` |
| `job_title_snapshot` | text | null | |
| `company_name_snapshot` | text | null | |
| `source_url_snapshot` | text | null | |
| `external_id_snapshot` | text | null | |
| `saved_state` | text | NOT NULL default `'available'` | CHECK in `available, unavailable` |

Why not cascade on `saved_jobs.job_id`: a saved opportunity is a *user artefact*, not a mirror of the aggregator. The aggregator is a best-effort scraper with unstable `external_id` derivation; letting it silently erase a student's shortlist is a data-loss bug, not a feature. `saved_jobs` has **zero rows**, so this is the last moment it can be done with no backfill risk at all.

The `ON DELETE SET NULL` on `job_id` interacts with UNIQUE `(user_id, job_id)`: Postgres default `NULLS DISTINCT` means multiple detached saves per user are permitted, which is correct (they are different opportunities). Live-posting duplicates remain blocked.

---

## 4. Ownership enforcement (items 1 and 2)

**Chosen implementation: composite foreign keys.** Both are safe here:

- The parent-side unique keys required (`resumes(id, user_id)` and `job_applications(id, applicant_id)`) are **supersets of an existing primary key**, so they can never fail to be satisfied, add no duplication risk, and require no data alteration. They cost one extra btree index each on tables of 1 and 9 rows.
- `MATCH SIMPLE` (the default) means the constraint is **not checked when any referencing column is NULL**. Since `applicant_id`/`user_id` are NOT NULL, this reduces to: "checked when the link column is set, skipped when it is null" — exactly the required semantics, with standalone interviews and résumé-less applications untouched.
- `ON DELETE SET NULL (link_column)` (PG15+) nulls only the link column, so deleting a résumé or an application cannot violate the NOT NULL on the owner column.

A trigger is therefore **not** needed for either rule; triggers are strictly weaker here (bypassable by `session_replication_role`, no planner-level guarantee, more code to maintain). Frontend validation, UUID secrecy and RLS are explicitly **not** relied on: the constraint holds even for `service_role` writes and edge functions.

Downgrade path if composite FK is rejected in review: a `BEFORE INSERT OR UPDATE OF resume_id, applicant_id` trigger raising `ERRCODE 23514` with message `résumé does not belong to the application owner`. Included in the rollback section, not the primary plan.

---

## 5. Outcome consistency (item 3)

Proposed constraints:

```sql
CHECK (outcome IS NULL OR outcome IN ('offer','rejected','ghosted','withdrawn','accepted'))
CHECK (outcome_at IS NULL OR outcome IS NOT NULL)
CHECK (outcome IS NULL OR outcome_at IS NOT NULL)   -- see note
```

The third is a deliberate choice: recording an outcome without a timestamp produces an unsortable, unreportable row. It is enforceable cheaply because the application layer always has "now" available. If review prefers laxer behaviour, drop the third check and set `outcome_at` from a `BEFORE` trigger instead — but not both.

**Should `status` change automatically when an outcome is recorded?** Recommendation: **no automatic trigger.** Reasons:

- The eight existing status values (`pending, reviewing, shortlisted, interview, offered, hired, rejected, withdrawn`) already encode a *pipeline position*, while `outcome` encodes a *terminal result*. They are near-duplicates in three places (`offered/offer`, `rejected/rejected`, `withdrawn/withdrawn`) and orthogonal elsewhere (`ghosted` has no status; `hired` has no outcome unless mapped to `accepted`).
- An automatic trigger would rewrite `status` on 3 of 5 outcome values and be silent on the other 2, producing an inconsistent, invisible state machine. It would also mutate rows the user did not touch, breaking the tracker's "you reported this" provenance and the existing `enforce`-style update discipline used elsewhere in this schema.
- Worse, a trigger firing during backfill or a bulk correction would silently reclassify historic applications, which is exactly the kind of irreversible change this proposal is trying to avoid.

So: **the application layer sets both `status` and `outcome` in the same update**, and the database only enforces internal consistency of the outcome pair. If a coupling is wanted later, the safe form is an explicit `record_application_outcome(app_id, outcome)` `SECURITY INVOKER` function, not a trigger.

---

## 6. Exact SQL migration plan

Four files, in order, in root `supabase/migrations/`. All timestamps are later than both the live ledger max (`20260801114257`) and the out-of-ledger file (`20260810120000`).

### `20260811090000_app_journey_resume_link.sql` (Migration A)

```sql
-- Parent-side unique key: superset of resumes' PK, cannot fail, no data change.
CREATE UNIQUE INDEX IF NOT EXISTS resumes_id_user_id_key
  ON public.resumes (id, user_id);

ALTER TABLE public.resumes
  DROP CONSTRAINT IF EXISTS resumes_id_user_id_key;
ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_id_user_id_key UNIQUE USING INDEX resumes_id_user_id_key;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS resume_id      uuid,
  ADD COLUMN IF NOT EXISTS outcome        text,
  ADD COLUMN IF NOT EXISTS outcome_at     timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_notes  text,
  ADD COLUMN IF NOT EXISTS next_action    text,
  ADD COLUMN IF NOT EXISTS next_action_due date;

-- Composite FK: proves the résumé belongs to the application owner.
-- MATCH SIMPLE => not checked while resume_id IS NULL.
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_resume_owner_fkey;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_resume_owner_fkey
  FOREIGN KEY (resume_id, applicant_id)
  REFERENCES public.resumes (id, user_id)
  ON UPDATE CASCADE
  ON DELETE SET NULL (resume_id);

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_outcome_check,
  DROP CONSTRAINT IF EXISTS job_applications_outcome_at_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_outcome_check
    CHECK (outcome IS NULL OR outcome IN ('offer','rejected','ghosted','withdrawn','accepted')),
  ADD CONSTRAINT job_applications_outcome_at_check
    CHECK ((outcome IS NULL) = (outcome_at IS NULL));

CREATE INDEX IF NOT EXISTS idx_job_applications_resume ON public.job_applications (resume_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_outcome
  ON public.job_applications (applicant_id, outcome) WHERE outcome IS NOT NULL;

COMMENT ON CONSTRAINT job_applications_resume_owner_fkey ON public.job_applications IS
  'Composite FK enforcing job_applications.applicant_id = resumes.user_id for the attached résumé.';
```

No new GRANTs are needed: no table is created, and `authenticated`/`service_role` privileges on `job_applications` are column-agnostic (`GRANT … ON TABLE`). This will be re-verified with `\dp` before apply.

### `20260811090100_app_journey_interview_link.sql` (Migration B)

```sql
CREATE UNIQUE INDEX IF NOT EXISTS job_applications_id_applicant_id_key
  ON public.job_applications (id, applicant_id);

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_id_applicant_id_key;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_id_applicant_id_key
  UNIQUE USING INDEX job_applications_id_applicant_id_key;

ALTER TABLE public.mock_interviews
  ADD COLUMN IF NOT EXISTS application_id uuid;

ALTER TABLE public.mock_interviews
  DROP CONSTRAINT IF EXISTS mock_interviews_application_owner_fkey;
ALTER TABLE public.mock_interviews
  ADD CONSTRAINT mock_interviews_application_owner_fkey
  FOREIGN KEY (application_id, user_id)
  REFERENCES public.job_applications (id, applicant_id)
  ON UPDATE CASCADE
  ON DELETE SET NULL (application_id);

CREATE INDEX IF NOT EXISTS idx_mock_interviews_application
  ON public.mock_interviews (application_id) WHERE application_id IS NOT NULL;
```

### `20260811090200_app_journey_preserve_applications.sql` (Migration C-1, the only structurally destructive step)

```sql
BEGIN;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS job_title_snapshot   text,
  ADD COLUMN IF NOT EXISTS company_name_snapshot text,
  ADD COLUMN IF NOT EXISTS source_url_snapshot  text,
  ADD COLUMN IF NOT EXISTS location_snapshot    text,
  ADD COLUMN IF NOT EXISTS deadline_snapshot    date,
  ADD COLUMN IF NOT EXISTS external_id_snapshot text;

-- Backfill BEFORE relaxing the FK, so every existing row is renderable
-- even if its posting later disappears.
UPDATE public.job_applications a
SET job_title_snapshot    = COALESCE(a.job_title_snapshot, p.title),
    company_name_snapshot = COALESCE(a.company_name_snapshot, p.company_name, p.department),
    source_url_snapshot   = COALESCE(a.source_url_snapshot, p.source_url),
    location_snapshot     = COALESCE(a.location_snapshot, p.location),
    deadline_snapshot     = COALESCE(a.deadline_snapshot, p.application_deadline),
    external_id_snapshot  = COALESCE(a.external_id_snapshot, p.external_id)
FROM public.job_postings p
WHERE p.id = a.job_id;

ALTER TABLE public.job_applications ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE public.job_applications
  DROP CONSTRAINT job_applications_job_id_fkey;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.job_postings (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- A detached application must still be identifiable.
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_identifiable_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_identifiable_check
    CHECK (job_id IS NOT NULL OR job_title_snapshot IS NOT NULL);

COMMIT;
```

Ordering matters: backfill runs *inside* the same transaction and *before* the FK swap, so there is no window in which a row could detach without a snapshot, and the new CHECK cannot fail (verified: all 9 rows currently resolve a `title`).

The existing UNIQUE `(job_id, applicant_id)` is intentionally left as-is. With `NULLS DISTINCT`, detached rows no longer collide, which is the desired behaviour.

### `20260811090300_app_journey_durable_saved_jobs.sql` (Migration C-2)

```sql
BEGIN;

ALTER TABLE public.saved_jobs
  ADD COLUMN IF NOT EXISTS job_title_snapshot    text,
  ADD COLUMN IF NOT EXISTS company_name_snapshot text,
  ADD COLUMN IF NOT EXISTS source_url_snapshot   text,
  ADD COLUMN IF NOT EXISTS external_id_snapshot  text,
  ADD COLUMN IF NOT EXISTS saved_state text NOT NULL DEFAULT 'available';

ALTER TABLE public.saved_jobs
  DROP CONSTRAINT IF EXISTS saved_jobs_saved_state_check;
ALTER TABLE public.saved_jobs
  ADD CONSTRAINT saved_jobs_saved_state_check
    CHECK (saved_state IN ('available','unavailable'));

ALTER TABLE public.saved_jobs ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE public.saved_jobs
  DROP CONSTRAINT IF EXISTS saved_jobs_user_id_fkey;
ALTER TABLE public.saved_jobs
  ADD CONSTRAINT saved_jobs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.saved_jobs
  DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey;
ALTER TABLE public.saved_jobs
  ADD CONSTRAINT saved_jobs_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.job_postings (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.saved_jobs
  DROP CONSTRAINT IF EXISTS saved_jobs_identifiable_check;
ALTER TABLE public.saved_jobs
  ADD CONSTRAINT saved_jobs_identifiable_check
    CHECK (job_id IS NOT NULL OR job_title_snapshot IS NOT NULL);

COMMIT;
```

`user_id → auth.users(id)` is confirmed compatible: both `uuid`, `saved_jobs.user_id` is NOT NULL, the table is empty (zero rows to validate), and every RLS policy already models ownership as `auth.uid() = user_id`. No contradictory ownership model exists.

`saved_state` is maintained by the application (set to `unavailable` when `job_id` reads back null or the posting's status is not `active`); it is **not** trigger-driven, for the same reasons given in section 5.

---

## 7. Backfill plan

| Target | Rows | Action |
| --- | --- | --- |
| `job_applications` snapshots | 9 | Single `UPDATE … FROM job_postings` inside Migration C-1, before the FK swap. All 9 resolve a title; `company_name`/`source_url` are null for these internal postings and will remain null — correct, they never had one. |
| `saved_jobs` snapshots | 0 | Nothing to backfill. |
| `resume_id`, `application_id`, outcome fields | — | Left null. No inference is attempted: guessing which of 1 résumé or 2 interviews "belongs" to an application would fabricate data. |

Post-backfill assertion, run in the same transaction before `COMMIT`:

```sql
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM public.job_applications
   WHERE job_id IS NOT NULL AND job_title_snapshot IS NULL;
  IF bad > 0 THEN RAISE EXCEPTION 'snapshot backfill incomplete: % rows', bad; END IF;
END $$;
```

---

## 8. Application-code changes required

Types are regenerated after apply (`src/integrations/supabase/types.ts` and the `artifacts/syncareer` copy), so `job_id` becomes `string | null` and the embed becomes nullable.

1. **`artifacts/syncareer/src/pages/ApplicationTracker.tsx`** — add snapshot columns to the select and resolve each display field as `app.job?.X ?? app.X_snapshot`. Add an explicit "Original posting no longer available" state when `job_id` is null. Already null-safe (`app.job?.title || 'Tracked application'`), so this is an upgrade, not a crash fix.
2. **`artifacts/syncareer/src/features/application-tracker/tracking.ts`** — `startTrackingApplication` must write the snapshot fields at insert time from the posting the user acted on. This is the single write seam, so one change covers all entry points. Add `attachResume(applicationId, resumeId)` and `recordOutcome(applicationId, outcome, status)` writing both columns in one update, and extend the error classifier so FK violation `23503` maps to a clear "That résumé/interview does not belong to this application" permission-category message.
3. **`artifacts/syncareer/src/pages/Dashboard.tsx`** — same snapshot fallback in the recent-applications card.
4. **`artifacts/syncareer/src/pages/Markets.tsx`** — write snapshots when saving a job; render a saved item as unavailable when `job_id` is null.
5. **`supabase/functions/mcp/index.ts`** — `list_my_saved_jobs` returns a left-embedded posting; fall back to snapshot fields so agent output is not blank for detached saves.
6. **`artifacts/syncareer/src/features/opportunities/opportunity.ts`** — `OpportunityJobFacts` already models every needed field as optional/nullable; add a small `factsFromApplication()` resolver so tracker and dashboard share one fallback rule instead of duplicating `??` chains.
7. **Tests to update:** `ApplicationTracker.test.tsx`, `Markets.test.tsx`, `tracking.test.ts` (mock rows gain the new columns).

No RLS change is required, and none is proposed.

---

## 9. Test plan

New SQL test file `supabase/tests/application_journey_integrity.sql`, run in a transaction that is rolled back, plus Vitest updates for the seam.

Database assertions (each is `ROLLBACK`-wrapped, using two throwaway auth users):

1. **Cross-user résumé rejected** — insert application for user A with `resume_id` of user B's résumé ⇒ expect `23503`.
2. **Cross-user interview rejected** — insert `mock_interviews` for user B with `application_id` of user A's application ⇒ expect `23503`.
3. **Valid same-user links accepted** — both inserts succeed when owners match.
4. **Deleting a résumé nulls `resume_id`** — application row survives, `resume_id IS NULL`, `applicant_id` unchanged.
5. **Deleting an application nulls `mock_interviews.application_id`** — interview row survives with `user_id` intact.
6. **Deleting a job posting preserves applications** — count before = count after; `job_id IS NULL`; `job_title_snapshot` still populated.
7. **Deleting a job posting preserves saved opportunities** — same shape for `saved_jobs`.
8. **Snapshot renderability** — `SELECT` returns non-null title for every detached row; the `*_identifiable_check` constraint makes an unrenderable row impossible to create.
9. **Standalone interview still allowed** — insert with `application_id IS NULL` succeeds.
10. **Outcome consistency** — `outcome_at` without `outcome` rejected; `outcome` without `outcome_at` rejected; unsupported outcome value rejected.

Data-integrity assertions, run before and after apply and diffed:

```sql
SELECT count(*) FROM public.job_applications;                       -- expect 9 → 9
SELECT count(*) FROM auth.users;                                    -- expect 89 → 89
SELECT count(*) FROM public.profiles;                               -- expect 89 → 89
SELECT count(*) FROM public.resumes;                                -- 1 → 1
SELECT count(*) FROM public.mock_interviews;                        -- 2 → 2
SELECT count(*) FROM public.saved_jobs;                             -- 0 → 0
SELECT status, count(*) FROM public.job_applications GROUP BY 1;    -- pending 8, withdrawn 1
SELECT policyname, cmd, qual, with_check FROM pg_policies
 WHERE schemaname='public' ORDER BY tablename, policyname;          -- byte-identical diff
```

The RLS snapshot diff must be **empty**; any difference aborts the apply and triggers rollback.

Frontend: `pnpm install --frozen-lockfile`, typecheck, `vitest run`, production build, plus `node scripts/schema/repository-smoke.mjs`.

---

## 10. Rollback / compensating migration

Every step is reversible; the only lossy direction is re-tightening `job_id` to NOT NULL after rows have detached.

Compensating migration `20260811090400_revert_app_journey.sql` (written but not committed to the ledger unless needed):

```sql
-- B and A reversals: pure drops, fully lossless.
ALTER TABLE public.mock_interviews DROP CONSTRAINT IF EXISTS mock_interviews_application_owner_fkey;
ALTER TABLE public.mock_interviews DROP COLUMN IF EXISTS application_id;
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_resume_owner_fkey;
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_outcome_check;
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_outcome_at_check;
-- Columns are retained by default; drop only on explicit instruction.

-- C reversal: restore cascade. Only safe while no row has detached.
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_identifiable_check;
ALTER TABLE public.job_applications DROP CONSTRAINT job_applications_job_id_fkey;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.job_postings (id) ON DELETE CASCADE;
-- Guarded: refuse to re-apply NOT NULL if any row detached.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.job_applications WHERE job_id IS NULL) THEN
    RAISE EXCEPTION 'cannot restore NOT NULL: detached applications exist; keep job_id nullable';
  END IF;
  EXECUTE 'ALTER TABLE public.job_applications ALTER COLUMN job_id SET NOT NULL';
END $$;
```

The C-2 (`saved_jobs`) reversal is unconditionally safe today because the table is empty.

Pre-apply safety net: capture `job_applications`, `saved_jobs`, `resumes` and `mock_interviews` to CSV under `/mnt/documents/` immediately before running, so a point-in-time restore of those four small tables is possible without touching anything else.

Composite-FK fallback (only if review rejects composite FKs): replace each with a `BEFORE INSERT OR UPDATE` trigger that raises `SQLSTATE 23514` with the messages `résumé does not belong to the application owner` / `interview does not belong to the application owner`, plus the same test list. This is the documented alternative, not the recommendation.

---

## 11. Expected effect on existing data

- **9 applications:** retained; gain populated `job_title_snapshot` (and `location_snapshot`/`deadline_snapshot` where the posting has them). `company_name_snapshot` and `source_url_snapshot` stay null because these are internal postings with no such values. Statuses unchanged (8 pending, 1 withdrawn). `job_id` values unchanged — nothing detaches during the migration.
- **89 Auth users and 89 profiles:** untouched. No migration references `auth.users` except to add an FK on an empty table.
- **1 résumé, 2 interviews:** untouched; `application_id` null.
- **0 saved jobs:** no data effect; structure hardened before first use.
- **24 job postings:** untouched.
- **RLS:** unchanged everywhere. The only behavioural nuance is that the legacy employer policies evaluate to false for a detached application, which is correct and non-widening.
- **Locking:** all four migrations take brief `ACCESS EXCLUSIVE` locks. Adding an FK to a 9-row and a 0-row table validates instantly; `DROP NOT NULL` is metadata-only. Expected total downtime: sub-second.

---

**Nothing above has been executed.** Say which of A, B, C-1, C-2 you approve (and whether you accept the composite-FK approach and the "no automatic status trigger" recommendation) and I will write the files and run them one at a time with the before/after verification queries.
