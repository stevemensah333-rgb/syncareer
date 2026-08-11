# Final proposal — connected application workspace (NOT APPLIED)

**Proposal date:** 2026-08-11

**Live evidence date:** 2026-08-11 UTC

**Hosted backend:** Lovable Cloud, PostgreSQL 17.6
**Production changes made:** none

This is an approval artifact, not an apply record. The SQL files exist so they
can be reviewed exactly. They have not been run locally or remotely. Running
them against Lovable Live requires a separate, explicit approval after the
preflight is repeated.

## Evidence and decision boundary

The owner-supplied live audit embedded in the previous revision of this
document is the highest-current evidence available in the repository. It is
dated 2026-08-11 and includes catalog constraints, row counts, policies,
PostgreSQL version, migration ledger, and the external-job index. Repository
call sites, current root migrations, generated types, and Edge Functions were
used only to reconcile that live evidence; generated types were not treated as
schema authority.

No separate live-audit file was found. If the embedded audit is superseded by a
newer owner export, stop and reconcile again before approval.

## Required questions resolved

1. **Exact status domain:** live `job_applications.status` accepts exactly
   `pending`, `reviewing`, `shortlisted`, `interview`, `offered`, `hired`,
   `rejected`, and `withdrawn`. Live rows are eight `pending`, one `withdrawn`.
   The proposal does not change this constraint or any status value.
2. **Outcome:** a new `outcome` column would duplicate the existing terminal
   statuses. Current UI outcome recording writes `status`; `offered`, `hired`,
   `rejected`, and `withdrawn` already represent terminal results. `ghosted`
   and `accepted` would introduce an unapproved second vocabulary. Therefore
   this proposal adds no `outcome`, `outcome_at`, or outcome trigger.
3. **Application → résumé ownership:** nullable `resume_id` is protected by
   `(resume_id, applicant_id) → resumes(id, user_id)`. The parent gets a unique
   constraint on `(id, user_id)`. `MATCH SIMPLE` allows a null link;
   `ON DELETE SET NULL (resume_id)` retains the applicant. No update cascade or
   trigger is used.
4. **Interview → application ownership:** nullable `application_id` is
   protected by `(application_id, user_id) → job_applications(id,
   applicant_id)`. The parent gets a unique constraint on `(id, applicant_id)`.
   Deleting an application clears only `application_id`; standalone interviews
   remain valid.
5. **Next action:** `next_action` and `next_action_due` are nullable. Null action
   means no explicit next step. Empty/whitespace-only actions are rejected. A
   due date requires a non-empty action; an action may have no due date. The
   application must clear both fields together when removing a dated action.
6. **Durable snapshots:** applications and saved jobs retain title, company,
   source label, source URL, location, deadline, and external ID snapshots.
   Existing UI uses `company_name` with `department` as its fallback, so the
   backfill uses the same rule. A detached record must retain a non-empty title.
7. **Current posting deletion:** live `job_applications.job_id` is NOT NULL and
   its FK uses `ON DELETE CASCADE`. No current app/Edge Function deletes
   postings, but manual or future pruning would delete user applications. The
   proposal changes the column to nullable and the FK to `ON DELETE SET NULL`.
8. **Empty `saved_jobs`:** live count is zero and the table has no FKs. The
   proposal adds `user_id → auth.users(id) ON DELETE CASCADE` and nullable
   `job_id → job_postings(id) ON DELETE SET NULL`, plus durable snapshots.
   Existing `(user_id, job_id)` uniqueness continues to block duplicate live
   saves; PostgreSQL's default null-distinct behavior permits multiple detached
   historical saves.
9. **Ledger drift:** live ledger max is `20260801114257`. Repository file
   `20260810120000_job_postings_external_id_unique.sql` is absent from the
   ledger, while a live unique partial external-ID index already exists under a
   different catalog name. This is ledger drift, not missing live behavior.
   This proposal neither runs that file nor marks it applied. Reconciliation is
   a separate approved operation. New files sort after it.
10. **Nested tour migration:**
    `artifacts/syncareer/supabase/migrations/20260508201500_add_profiles_tour_completed.sql`
    is unrelated, outside the root Lovable path, and excluded. It must not be
    moved, applied, or included in a broad migration command.

## Exact proposed migration files

Apply order, if separately approved:

1. `supabase/migrations/20260811110000_application_workspace.sql`
2. `supabase/migrations/20260811110100_application_interview_link.sql`
3. `supabase/migrations/20260811110200_saved_jobs_integrity.sql`

These files contain the exact SQL. They deliberately contain no triggers, new
tables, status history, outcome vocabulary, RLS changes, grants, production
data literals, or generated types.

The first file replaces one existing FK. Everything else is additive or relaxes
`job_id` nullability to preserve records. Constraint names rely on the exact
live catalog recorded by the audit; preflight must fail closed if it differs.

## Preflight and expected results

Run `supabase/inspection/application_journey_preflight.sql` read-only in the
Lovable SQL editor immediately before any apply. Save the reviewed output in a
private change record; do not commit user rows or identifiers.

Expected results:

| Check | Required result |
|---|---|
| PostgreSQL | 17.6, or another PG15+ version supporting column-list `SET NULL` |
| `job_applications` | 9 rows; 8 `pending`, 1 `withdrawn` |
| `saved_jobs` | 0 rows |
| `resumes` | 1 row |
| `mock_interviews` | 2 rows |
| `job_postings` | 24 rows |
| Missing application posting | 0 |
| Application posting without title | 0 |
| Saved job without auth user/posting | 0 / 0 |
| Application FK | `job_id → job_postings(id) ON DELETE CASCADE` |
| Saved-job FKs | none |
| Ledger max | `20260801114257` |
| Ledger contains `20260810120000` | no |
| Live external-ID unique partial index | exactly one effective definition |
| New columns/constraint names | absent |
| RLS | matches the owner audit; no policy diff |

Any mismatch stops the run. Do not alter the SQL to “make it pass” during an
apply window.

## Backfill

- All nine applications copy snapshot facts from their current postings before
  `job_id` becomes nullable. A transaction-local assertion rejects any linked
  application with a missing title snapshot.
- `saved_jobs` has an explicit `UPDATE … FROM job_postings` even though preflight
  must confirm zero rows. If it unexpectedly affects rows, stop before apply and
  reconcile those rows and their owners.
- `resume_id`, `application_id`, `next_action`, and `next_action_due` remain
  null. No relationship is guessed from the one résumé or two interviews.
- No statuses or existing application fields are rewritten.

After a future frontend change, snapshot values must be written when saving or
tracking a posting. The backfill only covers rows existing at migration time.

## Authorization and integrity verification

`supabase/tests/application_journey_integrity.sql` is for an isolated verified
restore only. It refuses to run unless the database setting
`syncareer.test_environment=true` is present, requires two synthetic auth users,
creates only synthetic rows, and rolls back.

It verifies:

- same-owner résumé and interview links succeed;
- cross-owner links fail with FK violations even under privileged writes;
- deleting a résumé clears only `resume_id`;
- deleting an application clears only interview `application_id`;
- deleting a synthetic posting preserves applications and saved jobs with title
  snapshots;
- due dates without actions fail;
- existing owner-scoped RLS policies still cover applications, résumés,
  interviews, and saved jobs.

Also run `supabase/tests/rls_authorization_matrix.sql` and require no regression.
The route guard is not an authorization control; RLS remains unchanged and the
composite constraints independently protect service-role/Edge Function writes.

## Rollback and data-loss implications

Exact compensating SQL is in
`supabase/rollback/application_journey_rollback.sql`. It is not a migration and
must never be run automatically.

- Link constraints and link columns can be removed without deleting parent
  applications/interviews.
- Restoring `job_applications.job_id NOT NULL ON DELETE CASCADE` is refused if
  any application has detached. Relinking is lossless; deleting detached rows
  would destroy user data and requires a separate decision.
- Restoring `saved_jobs.job_id NOT NULL` is refused if any saved job has
  detached for the same reason.
- Snapshot, next-action, and résumé-reference columns are retained by default.
  Dropping them would destroy historical or user-authored data.
- Dropping the two parent unique constraints is safe only after their composite
  FKs are removed; the rollback orders this correctly.

## Remote-application runbook — separate approval required

1. Obtain explicit approval naming all three migration files and a maintenance
   window. Approval of this proposal is not approval to apply it.
2. Confirm a current Lovable backup/export exists under the owner's retention
   policy. Do not download or commit production data during this task.
3. Run the read-only preflight in Lovable Cloud and compare every expected
   result above. Stop on drift.
4. Restore a current verified schema snapshot into an isolated compatible
   database with two synthetic users. Set
   `syncareer.test_environment=true` there only.
5. Apply the three files to that isolated database in order. Run the integrity,
   RLS authorization, and schema smoke tests; test the compensating SQL on a
   second disposable restore.
6. Review locks and statements. Ensure the nested `tour_completed` migration
   and out-of-ledger external-index migration are not in the selected apply set.
7. In Lovable Cloud's supported reviewed migration workflow, apply exactly one
   approved file at a time. Do not use `supabase link`, `db push`, migration
   repair, or a broad directory apply.
8. After each file, rerun row counts, constraints, orphan checks, and the RLS
   policy snapshot. Stop before the next file on any difference.
9. After all three, exercise same-owner and cross-owner behavior with disposable
   non-production users only. Do not test destructive posting deletion on Live.
10. Regenerate Supabase types through Lovable's supported generation/Git-sync
    workflow, review the diff, then update frontend write/read seams in a
    separate stage.
11. Record the applied ledger versions and archive redacted pre/post catalog
    evidence. Never mark `20260810120000` applied as part of this run.

## Generated types requiring supported regeneration

Do not hand-edit either file. After an approved apply, regenerate and reconcile:

- `src/integrations/supabase/types.ts` — current observed Lovable generation
  target;
- `artifacts/syncareer/src/integrations/supabase/types.ts` — active frontend
  import target and currently stale copy.

Expected generated changes:

- `job_applications`: nullable `job_id`; new `resume_id`, next-action, and
  snapshot fields; relationships for posting and composite résumé ownership;
- `mock_interviews`: nullable `application_id` and composite application
  relationship;
- `saved_jobs`: nullable `job_id`, snapshot fields, and user/posting
  relationships;
- `resumes`: composite relationship metadata may appear depending on generator
  output.

Regeneration must come from the verified post-migration live schema. Copying or
manually extending the existing generated types is not an acceptable substitute.

## Explicit exclusions

- No migration has been applied locally or remotely.
- No production row, secret, OAuth setting, storage object, Edge Function, RLS
  policy, grant, payment behavior, or analytics configuration is changed.
- No application-history table is proposed. A timeline requires an approved
  interface and retention model first.
- No outcome field or status-coupling trigger is proposed.
- No migration ledger repair is proposed.
