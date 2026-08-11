# CV Builder completion, persistence, and application context

**Verified from repository:** 2026-08-11  
**Remote Lovable/Supabase changes:** none

This document records the current CV Builder contract and the evidence boundary. The active frontend is `artifacts/syncareer`.

## 1. Initial state and defaults

The editor starts from `features/cv-builder/types.ts#initialCVData`:

- all personal and education fields are empty strings;
- achievements, experience, projects, activities, and skills are empty arrays;
- references contains the template copy `Available upon request`.

Inputs use visual examples through the HTML `placeholder` attribute. Those examples are not inserted into React state. Added section rows receive a generated UI id and empty fields. The persisted row also has `title`, `template: basic`, and `is_primary` metadata. None of the reference default, visual placeholders, ids, empty rows/arrays, section labels, or database metadata contributes to completion.

## 2. Completion is not quality

`features/cv-builder/scoring.ts` owns both deterministic calculations, but returns them separately.

### Completion (0–100%)

Completion answers only: **how much meaningful CV information has been added?**

| Section | Maximum | Exact contributions |
| --- | ---: | --- |
| Personal details | 20 | first name 5; last name 5; email 5; phone 5 |
| Education | 20 | institution 7; degree 7; graduation date 6 |
| Experience | 20 | best entry: employer 5; role 5; dates 4; one meaningful contribution 6 |
| Skills | 20 | 5 points for each meaningful skill, up to four |
| Projects or achievements | 20 | best score of: project/activity name 7, organisation or role 5, date 3, contribution 5; or achievement title 8, organisation 6, date 6 |

A string is meaningful only when it is not blank and does not match an explicit placeholder instruction such as `lorem ipsum`, `placeholder`, `TBD`, `enter your …`, or `your … here`. Empty entry objects and generated ids are ignored. The five section rows and their earned/max values are rendered next to the completion percentage.

An untouched editor therefore computes and displays **0%**.

### Quality (0–100)

Quality considers only deterministic patterns in content that exists:

- writing quality (30);
- skills coverage (20);
- structure (20);
- evidence (30).

It is not completion and is not an ATS prediction. The UI explicitly says that it does not guarantee that an applicant tracking system will accept a CV. No LLM output participates in either score.

Home/dashboard and readiness consumers map the stored row through `resumeRowToCVData` and use the same completion function; they no longer use the old `fullName`/array-presence heuristic.

## 3. Validation and authentication

Before a write:

1. the save hook coalesces repeated clicks into the same in-flight promise;
2. `supabase.auth.getSession()` must return a session and user id without an auth error;
3. the persistence function rejects an empty ownership id;
4. first name, last name, and a syntactically valid personal email are required;
5. validation failures return field-level messages and perform no `resumes` query.

The browser uses only the configured publishable key. It never uses or requests a service-role key. Route protection is UX only; database RLS remains the authorization boundary.

## 4. Verified table contract and create/update paths

The app-generated Supabase types verify these `public.resumes` columns:

`id`, `user_id`, `title`, `template`, `personal_info`, `education`, `experience`, `projects`, `achievements`, `skills`, `references_section`, `is_primary`, `created_at`, and `updated_at`.

The repository has no authoritative migration that creates this Lovable-managed table. Live constraints and policies therefore still require Lovable/live metadata evidence before any schema change.

Load and lookup are scoped by both:

```text
user_id = authenticated session user id
is_primary = true
```

and select the latest row by `updated_at` with `limit(1)`. This makes legacy duplicate rows readable without pretending that uniqueness is verified.

Save prefers the stable id returned by load or the previous confirmed save:

- **update:** `UPDATE resumes ... WHERE id = saved_id AND user_id = session_user RETURNING id`;
- if that id became stale, re-read the latest owned primary row and update it;
- **create:** only when no owned primary row exists, `INSERT ... user_id = session_user, is_primary = true RETURNING id`.

Success is emitted only when PostgREST returns the persisted row id. There is no optimistic success and no unverified `upsert(..., { onConflict: 'user_id,is_primary' })`.

### Activities compatibility

The generated table type has no `activities` column. To avoid dropping user-entered activities on reload without a remote migration, the editor stores them under the versioned `_syncareer` key inside the existing `personal_info` JSON document. Existing readers ignore this unknown namespaced key; the editor validates and restores it. All stored JSON arrays are parsed defensively rather than cast directly.

## 5. RLS and ownership implications

The client always supplies and filters by the authenticated user id, but that is defence in depth, not authorization. The expected live policies must enforce:

- SELECT/UPDATE/DELETE: `auth.uid() = user_id`;
- INSERT/WITH CHECK: `auth.uid() = user_id`;
- UPDATE/WITH CHECK: ownership remains `auth.uid() = user_id`.

`supabase/tests/rls_authorization_matrix.sql` statically checks those expectations when run against an isolated, verified schema restore. It has not been run against the hosted Lovable project in this work.

## 6. Errors, draft safety, and UI state

Errors are transformed into `auth-expired`, `permission`, `network`, or `server` categories. Users receive actionable copy, never raw SQL, row details, tokens, ids, or CV content. Development diagnostics contain only operation, table, category, and non-secret PostgREST/auth code.

The editor shows four explicit states:

- **Saving** — request in flight;
- **Saved** — a row id was returned and no newer edit exists;
- **Unsaved** — no persisted row or editor content differs from the last confirmed snapshot;
- **Failed** — persistence failed and the current React draft was retained.

A failed save never clears the form. A browser navigation warning is installed while a meaningful draft is unsaved or failed. If loading the cloud copy fails, editing is paused until retry so an unseen existing CV cannot be overwritten by an apparently blank editor.

The CV save itself is never optimistic. Home and Applications currently load CV data directly and refetch when their routes mount, so there is no CV query-cache entry to invalidate. Secondary skill sync and intelligence refresh happen only after the primary save succeeds and cannot reverse that confirmed result.

## 7. Opportunity/application journey

Opportunity and application surfaces pass role, organisation, and listed skills as navigation context. An application deep link also passes its owned tracker row id so the student can return to that workspace.

The generated `job_applications` contract has `resume_url` (free text) but no `resume_id` foreign key. The app therefore **does not write or claim a saved-CV/application association**. It says that saving updates the primary CV and asks the student to confirm which version was submitted.

## 8. Schema changes not applied

No migration was created or applied. Two live-data guarantees cannot be established from this repository alone:

1. whether the hosted database has more than one primary resume per user or a partial unique index;
2. whether hosted RLS exactly matches the expected ownership matrix.

Before proposing a uniqueness migration, an approved operator must capture the live table definition, indexes, policies, and duplicate audit. If that evidence verifies no duplicates and no equivalent index, the candidate is:

```sql
CREATE UNIQUE INDEX resumes_one_primary_per_user
  ON public.resumes (user_id)
  WHERE is_primary IS TRUE;
```

Rollback:

```sql
DROP INDEX IF EXISTS public.resumes_one_primary_per_user;
```

Verification in an isolated restored schema:

1. assert `SELECT user_id, count(*) ... WHERE is_primary IS TRUE GROUP BY user_id HAVING count(*) > 1` returns no rows;
2. create two authenticated primary rows for the same test user and assert the second fails with `23505`;
3. assert different users can each create one primary row;
4. run the RLS authorization matrix;
5. run authenticated create, update, repeated-click, and reload tests;
6. only then request separate approval for a hosted migration.

A per-application CV relationship needs a separate schema design that enforces `resumes.user_id = job_applications.applicant_id`; adding a bare `resume_id` foreign key would not enforce that ownership match. No such migration is proposed or applied here.
