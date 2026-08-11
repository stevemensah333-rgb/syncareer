# Lovable Cloud schema reconciliation and reproducibility runbook

**Assessment date:** 2026-08-09<br>
**Hosted backend:** Lovable Cloud, Supabase-compatible project reference `fsorkxlcasekndigezlx`<br>
**Production changes made by this assessment:** none

## 1. Decision and current status

**Restore reproducibility is blocked. Do not apply the current migration directory to production or call it a baseline.**

The repository contains useful schema deltas, but not a complete starting schema:

- `supabase/migrations/` has 23 current SQL files, beginning on 2026-05-10. The first file alters `public.job_postings` and updates `public.profiles`; those objects are not created by the current migration set.
- Git history proves that commit `d2bfd7e` deleted 72 then-current root migrations (3,125 SQL lines) on 2026-05-08. They remain recoverable as historical Git objects, but have not been restored because they have not been reconciled with the current live database.
- Even that deleted 72-file chain is not a fresh baseline: its first migration alters a pre-existing `public.profiles` table and calls a pre-existing `public.handle_updated_at()` function.
- The latest root generated type shape has 41 public tables, 3 views, 10 functions, and 1 enum. The current migration directory has no `CREATE` statement for 35 of those tables, all 3 views, 4 functions, or the enum.
- The two generated TypeScript copies differ. The application copy contains objects explicitly dropped by later tracked migrations and omits the tracked email infrastructure.
- One migration is stranded under `artifacts/syncareer/supabase/migrations/`, outside Lovable's root migration path. Neither generated type copy contains its `profiles.tour_completed` column, and current application comments say the column was absent from the live PostgREST schema.
- No current, complete Lovable schema-only export or applied-migration ledger was available in this workspace. A read-only request to the public PostgREST OpenAPI endpoint was attempted with the repository's publishable client configuration, but the sandbox TLS connection closed before a response; no row-data endpoint was requested.

The safe strategy is therefore a **verified point-in-time schema snapshot outside `supabase/migrations/`, plus only migrations created after that snapshot**, not a guessed migration repair. The snapshot can be adopted only after it comes from Lovable Cloud/support and restores successfully in an isolated Supabase-compatible environment.

## 2. Evidence and authority order

Use this order when sources disagree:

1. **A current Lovable-provided schema-only export**, or a schema-only artifact derived by Lovable support from the current Live environment, with an applied migration identity list.
2. **Current read-only Lovable Cloud metadata** from the Database/RLS/Jobs/Storage/Edge Functions views and `supabase/inspection/live_schema_manifest.sql`.
3. **A private full Lovable database export** for restore validation only. It contains production rows and must never be committed, pasted into chat, or used as ordinary schema documentation.
4. **Root Lovable-generated types** at `src/integrations/supabase/types.ts`, as shape evidence only. Types omit policies, grants, indexes, triggers, extensions, cron, queues, function bodies, non-exposed schemas, and possibly non-API routines.
5. **Current root migrations**, as ordered change intent only. They do not establish an initial state.
6. **Git-history migrations/types and `docs/archive` SQL**, as historical leads only. They are not evidence of current live state.

Generated TypeScript and archived SQL must never be converted into a baseline by inference.

## 3. Lovable Cloud capabilities and limitations

The following is based on Lovable's official documentation as retrieved on 2026-08-09.

### Supported inspection

- **Cloud -> Database** lists tables and views; table records can be browsed or exported as CSV. CSV is data export, not schema export.
- **Cloud -> Database -> RLS policies** is a read-only policy view for tables, storage, and realtime.
- **Cloud -> SQL editor** supports read-only catalog queries. Destructive SQL prompts for confirmation, but this assessment does not require destructive SQL.
- **Cloud -> Jobs** lists schedules, enabled state, and run history. It does not create/delete jobs from the view.
- **Cloud -> Edge functions** lists deployed functions and offers **View code**.
- **Cloud -> Database -> Backups** exposes roughly 14 daily backups. Restoring one rolls the managed database's schema and data back in place; it is destructive and is not a custom schema-import mechanism.

References:

- <https://docs.lovable.dev/features/database>
- <https://docs.lovable.dev/features/jobs>
- <https://docs.lovable.dev/features/edge-functions>

### Supported export

Lovable now documents **Cloud -> Overview -> Advanced settings -> Export project data -> Database -> Export**. The result is a database export containing **structure and data**. Lovable emails when it is ready and stores it under Cloud Storage.

Documented limits:

- one export per project per 24 hours;
- maximum 5 GB;
- storage bucket files are excluded and must be downloaded separately;
- Edge Function source and secrets are excluded;
- user passwords are not exported in a usable form;
- the export is unavailable after Cloud is removed;
- there is no one-click transfer from Lovable Cloud to an owned Supabase project.

References:

- <https://docs.lovable.dev/features/advanced-settings#export-lovable-cloud-data>
- <https://docs.lovable.dev/tips-tricks/external-deployment-hosting#host-backend-and-data-on-a-managed-provider-supabase-example>

**Portability conclusion:** Lovable provides a full database export and in-place daily backup restore, but its public documentation does not describe (a) a schema-only export switch, (b) importing a user-supplied dump back into Lovable Cloud, or (c) a one-click Cloud-to-Supabase move. A full export is useful for disaster/migration planning but cannot be committed as the reproducible schema record because it contains production data.

### Git synchronization and generation

Lovable Git sync includes code and migration files but not database rows. Official docs say reviewed schema changes create `supabase/migrations/` files and update generated types. Git sync is not itself a live database dump.

Repository history supplies stronger path-specific evidence for this project:

- root `src/integrations/supabase/types.ts` was changed repeatedly by `gpt-engineer-app[bot]` in the same commits as root migrations, most recently on 2026-07-12;
- `artifacts/syncareer/src/integrations/supabase/types.ts` was last changed by that bot on 2026-05-12;
- the build, Vite alias, and TypeScript `include` all point to `artifacts/syncareer/src`, so the active app consumes the stale artifact copy;
- the root copy is the observed Lovable generation target. This is repository evidence, not a documented path guarantee, and must be rechecked during the next safe Lovable regeneration.

References:

- <https://docs.lovable.dev/integrations/git-sync-overview>
- <https://docs.lovable.dev/features/cloud#tool-settings-and-defaults>
- <https://docs.lovable.dev/integrations/supabase#how-lovable-works-with-your-supabase-project>

### Safe Lovable test environment availability

Lovable's Test/Live Cloud environments are closed to newly enabled projects as of 2026-03-24; projects that already enabled them retain access. This repository does not prove whether Syncareer has an existing Test environment. Until the owner confirms the environment selector, a schema-change regeneration test is blocked.

Reference: <https://docs.lovable.dev/features/environments>

## 4. Repository schema inventory

### Current root migrations

| Migration | Tracked intent | Reproducibility/security observation |
| --- | --- | --- |
| `20260510123532_...` | Drop employer/legacy assessment tables; make `job_postings.employer_id` nullable; mutate role rows | Starts from many untracked objects and includes production data updates. Not baseline SQL. |
| `20260511174956_...` | Payment insert/update policies; revoke helper RPC execution | Assumes `payments`, `has_role`, `is_counsellor_owner`, `user_has_counsellor_booking`, `app_role`. |
| `20260511202331_...` | Tighten profile/payment/endorsement/review/availability/job policies | Policy deltas only; all target table definitions are missing from current migrations. |
| `20260512022434_...` | Create `get_profile_user_type`; protect `profiles.user_type` | Function body tracked; `profiles` definition is not. |
| `20260512091338_...` | Create `alumni_outcomes_cache`, index, RLS, update trigger | Depends on untracked `update_updated_at_column()`. |
| `20260512092242_...` | Create `saved_jobs`, indexes/RLS; add four job columns | No foreign keys on `user_id`/`job_id`; live constraints must be inspected rather than invented. |
| `20260512092853_...` | Enable `pg_cron`, `pg_net` | Extension availability/version remains live evidence. |
| `20260512094313_...` | Unschedule `daily-job-scrape` | Cron change only; not enough to recreate the job history/configuration. |
| `20260512101847_email_infra.sql` | Enable `pg_net`, `pg_cron`, `supabase_vault`, `pgmq`; create 4 email tables, 4 queues + DLQs, wrapper functions, indexes, RLS/grants | Explicitly says Vault and `process-email-queue` cron setup happened dynamically outside static SQL. Those objects are not reproducible from the file alone. |
| `20260512105821_...` | Add broad public-profile policy | Superseded by later policy changes. Historical delta, not final-policy record. |
| `20260512122158_...` | Extend portfolio projects; create settings/views analytics tables and policies | Portfolio objects are dropped on 2026-07-12. |
| `20260523061714_...` | Tighten profiles/portfolio/sessions/payments and queue wrapper execution/search paths | Security-relevant final-state delta; target baseline absent. |
| `20260701211138_...` | Counsellor hardening, trigger, temporary public portfolio view | References untracked `email_queue_wake`/`email_queue_dispatch`; view replaced immediately afterward. |
| `20260701211158_...` | Replace public portfolio view with SECURITY DEFINER RPC | RPC is dropped on 2026-07-12. |
| `20260702212226_...` | Tighten profiles/sessions; create enforcement function/trigger | Security-definer restrictions are preserved in later migrations. |
| `20260703012614_...` | Booking/session/referral hardening; create booking trigger and referral RPC; revoke definer defaults | Security-sensitive and dependent on untracked helper definitions. |
| `20260707223408_...` | Drop learning, stats, question-bank, and mapping objects/functions | Explains most application generated-type stale objects. |
| `20260708021525_...` | Further EXECUTE revokes | Grant delta only. |
| `20260712012513_...` | Revoke PUBLIC/anon from all public SECURITY DEFINER functions; explicitly regrant required calls | Final grants must be compared to live catalog output. |
| `20260712012949_...` | Drop portfolio tables and public RPC | Explains remaining application generated-type stale objects. |
| `20260801114144_...` | Replace public video read with owner-only authenticated read | Storage policy only; bucket definition and other policies are missing. |
| `20260801114214_...` | Drop another public video policy | Storage policy delta only. |
| `20260801114257_...` | Create counsellor update triggers under new names | Earlier migrations created the same function bindings under different names without these older names being dropped. Live inspection must check for duplicate triggers. |

### Migration outside the root

`artifacts/syncareer/supabase/migrations/20260508201500_add_profiles_tour_completed.sql` adds `profiles.tour_completed`. It is outside the documented root migration path and is not represented by either current generated type copy. The active app deliberately omits that column because a code comment records a live PostgREST `42703` for the missing column. Classification: **live missing (prior repository observation), repository-path drift, and unverified current state**. Do not move or apply it until live metadata confirms the desired state.

### Active application database references

Static inspection of `artifacts/syncareer/src` and tracked Edge Functions found direct relation calls for:

`alumni_outcomes_cache`, `assessment_responses`, `assessments`, `careers`, `counsellor_availability`, `counsellor_booking_view`, `counsellor_bookings`, `counsellor_credentials`, `counsellor_details`, `counsellor_messages`, `counsellor_profiles_public`, `counsellor_reviews`, `counsellor_sessions`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `job_applications`, `job_postings`, `market_intelligence_cache`, `mock_interviews`, `notification_preferences`, `notifications`, `profiles`, `qualifications`, `recommendation_outcomes`, `referrals`, `resumes`, `saved_jobs`, `student_details`, `subscriptions`, `suppressed_emails`, `university_insights`, `usage_logs`, `user_feedback`, `user_intelligence_profiles`, `user_roles`, `user_skill_map`, and `user_skills`.

Direct RPC calls are `delete_email`, `enqueue_email`, `get_my_referral_code`, `move_to_dlq`, and `read_email_batch`. Direct storage bucket calls use `avatars` and `documents`; the migrations also contain `videos` policy deltas. The app casts `counsellor_booking_view` to `any`, while the missing credential/message relations generate real TypeScript errors. Edge Function invocation references remain inventoried in [`BACKEND_PLATFORM_INVENTORY.md`](./BACKEND_PLATFORM_INVENTORY.md).

### Missing initial DDL relative to the newer generated shape

The current root migration directory has no `CREATE TABLE` for these 35 root-type tables:

`assessment_responses`, `assessments`, `career_guidance_sessions`, `career_skills`, `careers`, `counsellor_availability`, `counsellor_bookings`, `counsellor_details`, `counsellor_reviews`, `counsellor_sessions`, `job_applications`, `job_posting_skills`, `job_postings`, `market_intelligence_cache`, `mock_interviews`, `notification_preferences`, `notifications`, `payments`, `profiles`, `qualifications`, `recommendation_outcomes`, `referrals`, `resumes`, `skill_endorsements`, `skill_evidence`, `skills_taxonomy`, `student_details`, `subscriptions`, `university_insights`, `usage_logs`, `user_feedback`, `user_intelligence_profiles`, `user_roles`, `user_skill_map`, `user_skills`.

It also lacks creation DDL for all root-type views (`counsellor_booking_view`, `counsellor_bookings_public`, `counsellor_profiles_public`), for `app_role`, and for four root-type functions (`email_queue_dispatch`, `has_role`, `is_counsellor_owner`, `user_has_counsellor_booking`). `email_queue_wake` and `update_updated_at_column` are referenced by active SQL but have no active creation DDL and are not expected to appear as client RPC types.

This is **repository missing**, not permission to recover or invent SQL.

### Historical Git schema material

- The parent of commit `d2bfd7e` contains 72 migrations and a 2,468-line generated type file with 51 tables, 5 views, 4 functions, and 1 enum.
- The 72 migrations contain 59 unique `CREATE TABLE` targets, 5 views, 11 functions, about 200 policy statements, and 4 extension statements. They also include dropped social/community and employer features and 14 files with data DML.
- Eight additional migration paths were removed by explicit Git reverts before that checkpoint. They are historical/dead candidates, not part of the checkpoint chain.
- Across all Git history there are 103 distinct root migration paths: 23 current and 80 current-missing.
- Recovering the 72 files verbatim would improve historical continuity but would still not create `profiles` or `handle_updated_at()` and could replay data mutations. It is not a safe baseline without the live export and applied migration ledger.

### Archived SQL dump

`docs/archive/DATABASE_SCHEMA.sql` is a 96-line, hand-run credential feature script, not a database dump. It defines only `counsellor_credentials`, related policies/indexes, and a prose-only storage recommendation. The active app calls this table, but neither generated type copy includes it. Treat it as **historical/unknown**, not executable authority.

### Functions, triggers, grants, policies, storage, queues, cron

Current tracked coverage is partial:

- **Functions:** 10 API functions in root types; active SQL creates 10 functions total across current and later-dropped/non-API objects, but key helper/dispatch definitions remain absent. Function body hashes and live grants are required.
- **Triggers:** current SQL has alumni timestamp and counsellor enforcement triggers. Foundational timestamp/auth/referral triggers are absent. The July/August enforcement trigger naming mismatch may create duplicates.
- **Grants:** tracked EXECUTE hardening is security-critical and must be preserved. Final live grants cannot be inferred from cumulative `GRANT`/`REVOKE` deltas.
- **RLS:** policies are mostly deltas on missing table definitions. A prior `.lovable/plan.md` records 35+ live public tables with RLS, but it is a stale platform note, not a current export.
- **Storage:** app code uses `avatars` and `documents`; current SQL changes only `videos` read policies. Bucket definitions and complete `storage.objects` policies are repository-missing.
- **Queues:** tracked SQL names `auth_emails`, `transactional_emails`, and their DLQs. Queue content must never be exported as schema evidence.
- **Cron/jobs:** repository notes mention `aggregate-external-jobs-daily` and `process-email-queue`; dynamic cron/Vault setup is not fully tracked. Cron command text must be hashed/redacted during inspection because legacy SQL may embed credentials.

## 5. Generated type reconciliation

Current hashes before reconciliation:

| Copy | SHA-256 | Shape | Status |
| --- | --- | --- | --- |
| `src/integrations/supabase/types.ts` | `94867d411a51af956bf4292949ec5f65f3449f8968719e7e13efc1a8fb13067c` | 41 tables, 3 views, 10 functions, 1 enum | Newer Lovable bot output; best repository type evidence, not verified live evidence |
| `artifacts/syncareer/src/integrations/supabase/types.ts` | `05e87f70f495ec8002c36043378d6020922a4875adc3f55a7c06acc61e1d25bc` | 49 tables, 3 views, 5 functions, 1 enum | Active app copy; stale |

All common object definitions are byte-equivalent. Object membership differs:

- **Root only:** tables `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`; functions `delete_email`, `email_queue_dispatch`, `enqueue_email`, `get_my_referral_code`, `move_to_dlq`, `read_email_batch`.
- **Application only:** `cached_free_resources`, `learning_activities`, `learning_goals`, `learning_module_completions`, `learning_paths`, `learning_streaks`, `portfolio_projects`, `portfolio_reviews`, `skill_question_bank`, `unmapped_skills_log`, `user_course_progress`, `user_stats`; function `migrate_skills_to_relational`.
- The application-only objects all correspond to explicit July drop migrations, so they are **generated-type drift and historical/dead candidates**.
- Active application code calls `counsellor_credentials` and `counsellor_messages`, but both are missing from both type copies. Their live existence is **unknown**. If live, their DDL/types are repository-missing; if absent, the call sites are dead/broken candidates. Do not choose between those outcomes without live evidence.

The copies were intentionally left different in this assessment. Copying the root file now would reduce known repository drift, but it would claim a current schema match before Lovable regeneration/live comparison and would not satisfy the required safe schema-change test.

## 6. Difference classification

| Difference | Classification | Evidence / required resolution |
| --- | --- | --- |
| 35 root-type tables, 3 views, `app_role`, and 4 root-type functions have no creation DDL in active migrations | **Repository missing** | Current migration/type static comparison; obtain current schema export, do not reconstruct from types. |
| 72 checkpoint migrations deleted at `d2bfd7e` | **Repository missing historical chain / unknown current applicability** | Exact Git objects exist; compare hashes/objects with live migration ledger before restoring to working tree. |
| Eight migrations removed by earlier explicit reverts | **Historical/dead candidate** | Do not reintroduce unless the live applied ledger proves they remain relevant. |
| 12 application-only type tables + `migrate_skills_to_relational` | **Generated-type drift; historical/dead candidate** | Explicit July drop migrations and newer root generation omit them. |
| Four root-only email tables + queue RPCs/referral RPC | **Generated-type drift in active app copy** | Tracked migrations and newer root generation include them; current live verification still required. |
| `counsellor_credentials`, `counsellor_messages` app calls absent from both types | **Unknown** | Inspect live relations. Archived credential SQL is not authority; no messages DDL exists in current/history checkpoint evidence reviewed here. |
| App reads/writes `counsellor_details.meeting_platform`, absent from both types and current migrations | **Unknown / generated-type or application drift** | Confirm the live column; do not add it from the component's local interface. (`meeting_link` is present in both type copies.) |
| `profiles.tour_completed` nested migration and app fallback | **Live missing (prior observation), unknown current; repository-path drift** | Confirm current column metadata in Lovable. Do not apply nested SQL to production. |
| Full final indexes/constraints/triggers/grants/RLS/storage policy set | **Unknown / repository missing** | Current SQL is delta-only; capture catalog metadata and full schema export. |
| Possible duplicate counsellor enforcement triggers | **Unknown** | Compare live trigger inventory; do not drop either name without evidence. |
| Dynamic `process-email-queue` Vault/cron setup and aggregate cron | **Repository missing / unknown** | Inspect Jobs and redacted cron metadata; secrets remain platform configuration, never Git schema. |
| Objects actually missing from current live DB beyond the prior `tour_completed` observation | **Not classifiable yet** | No complete current Lovable metadata was available. |

## 7. Required Lovable owner/support action

### Owner action in the Lovable project

1. Open **Cloud -> Overview** and record whether a **Test / Live** selector already exists. Do not enable, remove, publish, or mutate either environment.
2. Select **Live** for inspection only. In **Cloud -> Database**, export/screenshot the table/view names and open **RLS policies** to export the table/storage/realtime policy list. Do not export table records.
3. In **Cloud -> SQL editor**, run each numbered query from `supabase/inspection/live_schema_manifest.sql` separately. Save only reviewed metadata results. The queries intentionally exclude application rows, auth users, queue messages, Vault values, secrets, and cron command text.
4. In **Cloud -> Jobs**, record job name, schedule, enabled state, and last run status. Do not copy job command/request headers.
5. In **Cloud -> Storage**, record bucket names and configuration only. Do not download user files for this schema task.
6. In **Cloud -> Overview -> Advanced settings -> Export project data**, request the database export. **Keep it private and outside Git** because it contains production data. Do not attach the raw export to an issue, PR, chat, or this repository.
7. Ask Lovable chat, with **Read database allowed** and **Modify database/Add data disabled or Ask each time**, to do this read-only action:

   > Inspect the current Live Lovable Cloud schema and regenerate the Supabase-compatible TypeScript database types from that schema without changing schema or data. Confirm the exact generated file path(s), commit the generated result through the existing Git sync, and report whether any schema object was omitted from generation. Do not apply a migration and do not modify production data.

   If Lovable cannot regenerate without a schema change, stop; do not use a no-op production migration.

### Support request (needed because the UI export includes data)

Send Lovable support this exact request:

> For Lovable Cloud project `fsorkxlcasekndigezlx`, provide a schema-only PostgreSQL/Supabase-compatible export of the current Live database, with no table rows, auth users, storage objects, queue messages, Vault contents, secret values, or cron credentials. Include schemas/tables/columns, types/enums, defaults, sequences, primary/unique/foreign/check constraints, indexes, views/materialized views, function/procedure definitions, non-internal triggers, grants/default privileges, RLS state and policies (including storage/realtime), extension names/versions, storage bucket configuration without files, redacted cron/job definitions, PGMQ queue names/configuration without messages, and the applied migration identity ledger. Also confirm the export format, supported restore target/process, and whether a user-supplied dump can be restored into Lovable Cloud. If schema-only export is unavailable, confirm that limitation explicitly.

**Do not send support secret values or ask for a service-role key.**

## 8. Safest baseline/snapshot strategy

After—and only after—the support artifact is available:

1. Save the reviewed schema-only artifact under `supabase/schema/`, not `supabase/migrations/`. Name it with the UTC capture time and a source note, for example `lovable_live_2026-08-09T000000Z.sql`.
2. Add a sibling manifest recording SHA-256, Lovable environment, Postgres version, export method, extension versions, and the last included applied migration identity. Do not include IDs/tokens/URLs beyond the already public project reference.
3. Compare the export with:
   - all 23 current root migrations;
   - the one nested artifact migration;
   - the 72-file pre-deletion checkpoint chain;
   - the two generated type copies;
   - app relation/RPC/bucket references;
   - the read-only live manifest.
4. Classify every mismatch using this report's five categories. Do not restore historical SQL merely because its object name appears live.
5. Restore the schema-only snapshot in a disposable, network-isolated, Supabase-compatible local/test stack. Do not connect that stack to production services, OAuth, email, payments, AI, webhooks, or real storage.
6. Apply only migrations whose IDs are proven to be later than the snapshot ledger marker. Never replay the snapshot back into production and never mark migrations repaired.
7. Run `supabase/tests/schema_rls_smoke.sql`, then exercise anon/authenticated ownership cases with synthetic users/data in that isolated stack.
8. Obtain Lovable-generated types, synchronize the two copies using the repository command below, and run typecheck/tests/build.
9. Record exact restore commands and versions after the export format is known. Do not guess whether Lovable supplies plain SQL, a custom PostgreSQL archive, or platform-specific restore instructions.

If Lovable cannot provide complete function/policy/grant/trigger definitions without production rows, retain the metadata manifest as the best available record and mark **restore reproducibility blocked**. Do not fill the gap from generated types or Git history.

## 9. Type regeneration and synchronization workflow

Root types are the **generation target**; the artifact copy is the **application-consumed mirror**.

1. Make an approved schema change only through Lovable's reviewed migration flow in an existing Lovable Test environment or another separately approved non-production environment. If no safe environment exists, this end-to-end test remains blocked.
2. Confirm Lovable created the expected root `supabase/migrations/<timestamp>_*.sql` and regenerated `src/integrations/supabase/types.ts` in the same Git-sync change.
3. Review the SQL and root type diff against the safe environment. Do not edit either generated type file by hand.
4. Synchronize by exact copy:

   ```bash
   pnpm schema:types:sync --confirm-lovable-regenerated
   ```

   The confirmation flag exists to prevent this command being mistaken for a generator.
5. Verify exact equality and run application checks:

   ```bash
   pnpm schema:types:check
   pnpm typecheck
   pnpm test
   pnpm build
   ```

6. Commit the Lovable migration, Lovable-generated root types, mirrored application types, and application changes together.
7. Keep both copies until one safe schema-change cycle proves Lovable's generation path, Git synchronization, copy command, typecheck, tests, and build. Deleting or replacing either copy is a separate decision.

## 10. Automated checks added

- `pnpm schema:repo:smoke` statically checks that every table created by current root migrations enables RLS and that tracked SECURITY DEFINER functions have a fixed `search_path` plus an EXECUTE revoke. It also reports the incomplete-baseline and nested-migration warnings.
- `pnpm schema:types:check` compares the generated copies byte-for-byte and prints object-level drift. It intentionally fails while current drift remains.
- `pnpm schema:types:sync --confirm-lovable-regenerated` performs only a byte-for-byte copy from the observed Lovable root generation target to the active app path.
- `supabase/tests/schema_rls_smoke.sql` checks relation presence, RLS coverage, definer exposure, extension dependencies, app storage buckets/policies, enforcement triggers, possible duplicate trigger bindings, and redacted cron metadata in an isolated restore/Test database.
- `supabase/inspection/live_schema_manifest.sql` is the no-row/no-secret live metadata collection script.

## 11. Explicit prohibitions

For project reference `fsorkxlcasekndigezlx`:

- do not run `supabase link`, `db pull`, `db dump`, `db push`, `migration repair`, remote type generation, or remote function deployment through a developer's personal Supabase account;
- do not apply the current migrations or any recovered historical migration chain to production;
- do not commit or share the raw Lovable full database export;
- do not infer missing SQL from TypeScript types, application calls, archived SQL, or historical migrations;
- do not weaken RLS, grants, SECURITY DEFINER restrictions, storage policies, triggers, or payment/email/queue protections to make a restore pass;
- do not create a replacement Supabase project as part of this task.

## 12. Verification performed on 2026-08-09

| Check | Result |
| --- | --- |
| Frozen `pnpm` install | Passed; lockfile unchanged. |
| `pnpm schema:repo:smoke` | Passed its RLS/SECURITY DEFINER assertions; emitted the expected incomplete-baseline and nested-migration warnings. |
| `pnpm schema:types:check` | Failed as designed because the two generated copies have the documented drift. |
| Unguarded `pnpm schema:types:sync` | Refused to write and left the application type hash unchanged. The confirmed copy mode was not run because no fresh Lovable regeneration exists. |
| Application tests | Passed: 11 files, 99 tests (post-repair). |
| Production Vite build | Passed. Existing dynamic/static import chunk warnings remain. |
| TypeScript typecheck | Passed with 0 diagnostics (post-repair) under the strict compiler settings. The historical 205-diagnostic baseline in `docs/archive/TYPECHECK_TRACKING.md` is resolved; the known schema/type seams (`counsellor_credentials`, `counsellor_messages`, `get_my_referral_code`, `meeting_platform`) are handled in the application type copy at `artifacts/syncareer/src/integrations/supabase/types.ts`, which is why the two copies remain intentionally out of sync until a fresh Lovable regeneration cycle. |
| Live metadata SQL | Not run: this Arena session has no Lovable project-session SQL editor access. |
| Isolated schema restore + SQL smoke | Blocked: no complete Lovable schema-only export was available, and no SQL was invented. |
| Lovable safe schema-change regeneration cycle | Blocked until the owner confirms an existing Test environment or another approved non-production Lovable workflow. |

No production migration, row write, schema write, function deployment, migration repair, remote type generation, or personal-account Supabase link was performed.

## 13. Follow-up migrations reported by the opportunity→application workflow work (NOT applied)

The opportunity-to-application workflow implemented on 2026-08-10 runs entirely within the
current schema (`job_postings`, `saved_jobs`, `job_applications` incl. `notes`/`resume_url`,
`resumes`). During that work the following schema limitations were identified. They are
**reported, not applied**, per the prohibitions above; each would need the usual migration +
rollback plan + verification before any remote change.

1. **Listing verification/freshness evidence.** `job_postings` has no verification columns,
   so the UI never claims a listing is verified or current and shows provenance
   (source, source URL, posted/updated timestamps) plus an explicit
   "not independently verified" note instead. To support a real freshness signal the
   aggregator would eventually need:

   ```sql
   ALTER TABLE public.job_postings
     ADD COLUMN last_seen_at timestamptz NULL,
     ADD COLUMN verification_source text NULL;
   -- populated by the aggregate-external-jobs Edge Function; NULL = no evidence (honest default)
   ```

2. **Per-application targeted CV.** The tracker surfaces the user's *primary* CV
   (`resumes.user_id + is_primary` convention) because `job_applications` cannot reference a
   specific resume row (`resume_url` is a free-text URL). The UI must not claim that this is
   an association. A bare `resume_id REFERENCES resumes(id)` is not an approved migration:
   it would not itself enforce that the resume owner equals `job_applications.applicant_id`.
   Any future design must first reconcile the live schema, then enforce that cross-table
   ownership invariant in the database, include rollback and isolated RLS tests, and receive
   separate approval. See [`CV_BUILDER_PERSISTENCE.md`](./CV_BUILDER_PERSISTENCE.md) §7–8.

3. **Status vocabulary constraint (optional hardening).** `job_applications.status` is
   unconstrained text; the app tolerates unknown values and groups the known ones
   (pending/reviewing/shortlisted/interview/offered + terminal hired/rejected/withdrawn).
   A CHECK constraint would formalise this but must first reconcile any legacy/unknown
   stored values, so it remains a live-data decision:

   ```sql
   ALTER TABLE public.job_applications
     ADD CONSTRAINT job_applications_status_known CHECK (
       status IN ('pending','reviewing','shortlisted','interview','offered','hired','rejected','withdrawn')
     );
   -- Requires: audit stored statuses first (SELECT DISTINCT status, count(*) FROM job_applications GROUP BY 1)
   ```
