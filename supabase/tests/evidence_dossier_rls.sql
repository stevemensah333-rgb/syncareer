-- Evidence dossier security tests for 20260903000000_evidence_dossier.sql.
--
-- Part 1 (read-only assertions) runs against any database where the migration
-- has been applied. Part 2 (behavioral) requires an isolated disposable
-- database with two test users; it is not part of the local Vitest suite.

-- ── Part 1: structural security assertions ───────────────────────────────
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE v_count integer;
BEGIN
  -- RLS enabled on every evidence relation.
  SELECT count(*) INTO v_count FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('evidence_items','evidence_sources','application_requirements',
                      'application_evidence_links','resume_evidence_links')
    AND c.relrowsecurity;
  IF v_count <> 5 THEN RAISE EXCEPTION 'expected RLS on 5 evidence tables, found %', v_count; END IF;

  -- Owner SELECT policies exist; no direct-write policies at all.
  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('evidence_items','evidence_sources','application_requirements',
                      'application_evidence_links','resume_evidence_links')
    AND cmd = 'SELECT' AND qual LIKE '%user_id%auth.uid()%';
  IF v_count <> 5 THEN RAISE EXCEPTION 'expected 5 owner SELECT policies, found %', v_count; END IF;

  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('evidence_items','evidence_sources','application_requirements',
                      'application_evidence_links','resume_evidence_links')
    AND cmd IN ('INSERT','UPDATE','DELETE');
  IF v_count > 0 THEN RAISE EXCEPTION 'evidence tables must not allow direct client writes'; END IF;

  -- All server operations are SECURITY DEFINER.
  SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'initialize_application_requirements','add_manual_application_requirement',
    'remove_application_requirement','create_application_cv','create_evidence_item',
    'update_evidence_item','confirm_evidence_item','archive_evidence_item',
    'add_evidence_source','remove_evidence_source','link_evidence_to_requirement',
    'unlink_evidence_from_requirement','link_evidence_to_resume_entry',
    'unlink_evidence_from_resume_entry'
  ) AND p.prosecdef;
  IF v_count <> 14 THEN RAISE EXCEPTION 'evidence SECURITY DEFINER operation count is %, expected 14', v_count; END IF;

  -- Anonymous role cannot execute any evidence operation or read any table.
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'evidence_%' OR p.proname IN (
        'initialize_application_requirements','add_manual_application_requirement',
        'remove_application_requirement','create_application_cv','link_evidence_to_requirement',
        'unlink_evidence_from_requirement','link_evidence_to_resume_entry',
        'unlink_evidence_from_resume_entry'))
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ) THEN RAISE EXCEPTION 'anon can execute an evidence function'; END IF;

  IF has_table_privilege('anon', 'public.evidence_items', 'SELECT')
    OR has_table_privilege('anon', 'public.evidence_sources', 'SELECT')
    OR has_table_privilege('anon', 'public.application_requirements', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read an evidence table';
  END IF;

  -- Authenticated role cannot write evidence tables directly.
  IF has_table_privilege('authenticated', 'public.evidence_items', 'INSERT, UPDATE, DELETE')
    OR has_table_privilege('authenticated', 'public.evidence_sources', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'authenticated can write an evidence table directly';
  END IF;

  -- Application-CV exclusivity trigger is installed.
  SELECT count(*) INTO v_count FROM pg_trigger
  WHERE tgrelid = 'public.job_applications'::regclass
    AND tgname = 'job_applications_application_cv_exclusive' AND NOT tgisinternal;
  IF v_count <> 1 THEN RAISE EXCEPTION 'application CV exclusivity trigger missing'; END IF;

  -- Composite owner-matched foreign keys exist on every link table:
  -- 3 on evidence_sources, 1 on application_requirements,
  -- 2 on application_evidence_links, 2 on resume_evidence_links.
  SELECT count(*) INTO v_count FROM pg_constraint
  WHERE conrelid IN ('public.evidence_sources'::regclass, 'public.application_requirements'::regclass,
                     'public.application_evidence_links'::regclass, 'public.resume_evidence_links'::regclass)
    AND contype = 'f'
    AND EXISTS (
      SELECT 1 FROM unnest(conkey) k
      JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k
      WHERE a.attname = 'user_id'
    );
  IF v_count <> 8 THEN RAISE EXCEPTION 'expected 8 composite owner-matched FKs, found %', v_count; END IF;
END $$;

ROLLBACK;

-- ── Part 2: behavioral checks (isolated disposable database only) ────────
-- Setup sketch for the disposable environment:
--   select id from auth.users limit 2;            -- user A, user B
--   insert a job_postings row with skills {SQL}, plus skills_taxonomy entries,
--     and one job_applications row per user (B's row proves cross-tenant rejection),
--     and one resumes row per user, and one completed mock_interviews row per user.
--
-- Then verify each statement below; expected result is noted. Every failure
-- mode must raise, never silently succeed.
--
-- 1.  SET ROLE authenticated; SET request.jwt.claims to user A.
--     SELECT initialize_application_requirements(<A app>)  → imports only explicit skills; second call imports 0 (idempotent).
-- 2.  SELECT initialize_application_requirements(<B app>)  → EXCEPTION 'Application is not available'.
-- 3.  SELECT create_evidence_item('work','Ledger rebuild','Built a reconciliation ledger for 3 societies.',NULL) → row, review_status='draft'.
-- 4.  SELECT confirm_evidence_item(<3>)                    → review_status='confirmed'.
-- 5.  Same item with no sources                            → derived status is needs_source (client-derived; no DB column to assert beyond review_status='confirmed').
-- 6.  add_evidence_source(<3>,'resume_entry','Experience — Ledger rebuild','Rebuilt the ledger…',NULL,NULL,<A resume>,NULL) → row stored.
-- 7.  add_evidence_source(<3>,'resume_entry',…,<B resume>,NULL) → EXCEPTION (composite FK + ownership check).
-- 8.  add_evidence_source(<3>,'interview_response',…,<A interview>) → row; type-shape CHECK rejects resume_entry shape with interview_id.
-- 9.  add_evidence_source(<3>,'url','Posting','Excerpt…',NULL,'notaurl')   → EXCEPTION 'A valid HTTP(S) URL is required'.
-- 10. update_evidence_item(<3>, p_title=>'Ledger rebuild v2') → review_status back to 'draft'.
-- 11. archive_evidence_item(<3>) then link_evidence_to_requirement(<req>,<3>) → EXCEPTION 'Archived evidence cannot be linked'.
-- 12. link_evidence_to_requirement(<A req>,<3>,'note') twice → second call updates note, still one row (pair unique).
-- 13. create_application_cv(<A app>,<A base resume>) twice → same resume id returned both times (idempotent).
-- 14. create_application_cv(<B app>,<A application CV id>) → EXCEPTION 'Source CV is not available' (scope + ownership).
-- 15. UPDATE job_applications SET resume_id=<A application CV> WHERE id=<B app> (service_role) → trigger EXCEPTION 'already linked to another application'.
-- 16. Base CV untouched after application-CV edits: UPDATE resumes SET experience=<new json> WHERE id=<application CV>; base row unchanged.
-- 17. DELETE the application-scoped CV (service_role) → job_applications.resume_id remains (no FK), resume_evidence_links for it cascade away.
-- 18. Mentor (career_counsellor) session: SELECT on evidence_items → 0 rows; EXECUTE on create_evidence_item → allowed by grant but every op is owner-scoped (no data).
-- 19. Rollback replay on a disposable restore of the pre-migration snapshot succeeds; post-rollback pg_policies has no evidence policies.
