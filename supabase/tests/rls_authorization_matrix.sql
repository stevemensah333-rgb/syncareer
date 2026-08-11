-- RLS AUTHORIZATION MATRIX TEST (isolated restore only; read-only, rolls back)
--
-- This is the "database/RLS integration test" layer from docs/TEST_MATRIX.md.
-- It statically verifies the authorization invariants that the app relies on:
--   * profile privacy and role immutability (student / counsellor / admin)
--   * ownership of resumes/assessments/applications
--   * counsellor booking/session visibility and permitted state changes
--   * payment/subscription write restrictions
--   * storage video ownership
--
-- Like schema_rls_smoke.sql, this script is READ ONLY and wraps everything in a
-- transaction that ROLLS BACK. It never writes application rows and never reads
-- production data. Run it against an isolated verified-schema restore.
--
-- Each invariant is a DO block that RAISEs on failure so CI-grade tooling can
-- surface which authorization guarantee regressed.

BEGIN TRANSACTION READ ONLY;

-- ---------------------------------------------------------------------------
-- 1. profiles — privacy and role immutability
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_count integer;
BEGIN
  -- Authenticated users may SELECT only counsellor profile rows (privacy):
  -- the public-facing read is limited to counsellors.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND cmd = 'SELECT' AND roles @> ARRAY['authenticated']
    AND qual LIKE '%user_type%counsellor%';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'RLS: no authenticated SELECT policy scoping profiles to counsellors';
  END IF;

  -- Role immutability on UPDATE: user_type must equal the stored value.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND cmd = 'UPDATE' AND roles @> ARRAY['authenticated']
    AND qual LIKE '%auth.uid()%'
    AND with_check LIKE '%user_type%get_profile_user_type%';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'RLS: profiles UPDATE policy does not pin user_type (role escalation risk)';
  END IF;

  -- INSERT cannot self-assign a privileged role: only NULL or 'student'.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles'
    AND cmd = 'INSERT'
    AND with_check LIKE '%user_type%student%';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'RLS: profiles INSERT policy does not restrict user_type to student/NULL';
  END IF;

  -- referral_code must not be SELECT-granted to authenticated/anon (leak guard).
  SELECT count(*) INTO v_count
  FROM information_schema.column_privileges
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND column_name = 'referral_code'
    AND grantee IN ('authenticated', 'anon')
    AND privilege_type = 'SELECT';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS: profiles.referral_code is SELECT-granted to anon/authenticated; should be owner-only';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. saved_jobs — ownership
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_select integer; v_insert integer; v_delete integer;
BEGIN
  SELECT count(*) INTO v_select FROM pg_policies
    WHERE schemaname='public' AND tablename='saved_jobs' AND cmd='SELECT' AND qual LIKE '%auth.uid()%user_id%';
  SELECT count(*) INTO v_insert FROM pg_policies
    WHERE schemaname='public' AND tablename='saved_jobs' AND cmd='INSERT' AND with_check LIKE '%auth.uid()%user_id%';
  SELECT count(*) INTO v_delete FROM pg_policies
    WHERE schemaname='public' AND tablename='saved_jobs' AND cmd='DELETE' AND qual LIKE '%auth.uid()%user_id%';
  IF v_select=0 OR v_insert=0 OR v_delete=0 THEN
    RAISE EXCEPTION 'RLS: saved_jobs ownership policies missing (select=% insert=% delete=%)', v_select, v_insert, v_delete;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. payments — write restrictions (revenue)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_count integer;
BEGIN
  -- Clients may insert a payment ONLY as status='pending' for themselves.
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname='public' AND tablename='payments'
    AND cmd='INSERT' AND roles @> ARRAY['authenticated']
    AND with_check LIKE '%auth.uid()%user_id%'
    AND with_check LIKE '%pending%';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'RLS: payments INSERT policy does not require own user_id and status=pending';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. counsellor_sessions — visibility + permitted state changes
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_client_select integer; v_counsellor_select integer; v_client_update integer; v_trig integer;
BEGIN
  SELECT count(*) INTO v_client_select FROM pg_policies
    WHERE schemaname='public' AND tablename='counsellor_sessions' AND cmd='SELECT' AND qual LIKE '%auth.uid()%client_id%';
  SELECT count(*) INTO v_counsellor_select FROM pg_policies
    WHERE schemaname='public' AND tablename='counsellor_sessions' AND cmd='SELECT' AND qual LIKE '%is_counsellor_owner%';
  -- Clients may only update the row to status='cancelled'.
  SELECT count(*) INTO v_client_update FROM pg_policies
    WHERE schemaname='public' AND tablename='counsellor_sessions' AND cmd='UPDATE'
      AND qual LIKE '%auth.uid()%client_id%' AND with_check LIKE '%cancelled%';
  IF v_client_select=0 OR v_counsellor_select=0 OR v_client_update=0 THEN
    RAISE EXCEPTION 'RLS: counsellor_sessions visibility/state policies missing (c=% c2=% u=%)',
      v_client_select, v_counsellor_select, v_client_update;
  END IF;

  -- Trigger must exist to block payment_status/amount_paid changes by clients.
  SELECT count(*) INTO v_trig
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                   JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname='counsellor_sessions'
    AND t.tgfoid = 'public.enforce_counsellor_session_updates()'::regprocedure;
  IF v_trig = 0 THEN
    RAISE EXCEPTION 'RLS: counsellor_sessions enforcement trigger missing (payment escalation risk)';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. counsellor_bookings — ownership + immutable fields
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_update integer; v_trig integer;
BEGIN
  SELECT count(*) INTO v_update FROM pg_policies
    WHERE schemaname='public' AND tablename='counsellor_bookings' AND cmd='UPDATE'
      AND qual LIKE '%auth.uid()%user_id%';
  IF v_update = 0 THEN
    RAISE EXCEPTION 'RLS: counsellor_bookings UPDATE ownership policy missing';
  END IF;

  SELECT count(*) INTO v_trig
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                   JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname='counsellor_bookings'
    AND t.tgfoid = 'public.enforce_counsellor_booking_updates()'::regprocedure;
  IF v_trig = 0 THEN
    RAISE EXCEPTION 'RLS: counsellor_bookings immutability trigger missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. counsellor_details — INSERT requires a counsellor profile
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname='public' AND tablename='counsellor_details'
    AND cmd='INSERT' AND with_check LIKE '%get_profile_user_type%counsellor%';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'RLS: counsellor_details INSERT not restricted to counsellor profiles';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. storage.objects — video ownership, no public access
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_public integer; v_owner integer;
BEGIN
  -- No policy may allow anon/public reads of storage objects.
  SELECT count(*) INTO v_public
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND cmd='SELECT'
    AND roles && ARRAY['anon', 'public'];
  IF v_public > 0 THEN
    RAISE EXCEPTION 'RLS: storage.objects has a public SELECT policy';
  END IF;

  -- Videos must be owner-scoped by the first folder component (user id).
  SELECT count(*) INTO v_owner
  FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND cmd='SELECT'
    AND qual LIKE '%videos%' AND qual LIKE '%foldername%';
  IF v_owner = 0 THEN
    RAISE EXCEPTION 'RLS: storage.objects lacks an owner-scoped videos read policy';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. resumes / job_applications — owner-only CRUD
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  resume_select integer; resume_insert integer; resume_update integer; resume_delete integer;
  app_select integer; app_insert integer; app_update integer; app_delete integer;
BEGIN
  SELECT count(*) INTO resume_select FROM pg_policies
    WHERE schemaname='public' AND tablename='resumes' AND cmd IN ('SELECT', 'ALL')
      AND qual LIKE '%auth.uid()%user_id%';
  SELECT count(*) INTO resume_insert FROM pg_policies
    WHERE schemaname='public' AND tablename='resumes' AND cmd IN ('INSERT', 'ALL')
      AND with_check LIKE '%auth.uid()%user_id%';
  SELECT count(*) INTO resume_update FROM pg_policies
    WHERE schemaname='public' AND tablename='resumes' AND cmd IN ('UPDATE', 'ALL')
      AND qual LIKE '%auth.uid()%user_id%'
      AND with_check LIKE '%auth.uid()%user_id%';
  SELECT count(*) INTO resume_delete FROM pg_policies
    WHERE schemaname='public' AND tablename='resumes' AND cmd IN ('DELETE', 'ALL')
      AND qual LIKE '%auth.uid()%user_id%';

  IF resume_select=0 OR resume_insert=0 OR resume_update=0 OR resume_delete=0 THEN
    RAISE EXCEPTION 'RLS: resumes owner CRUD policies missing (s=% i=% u=% d=%)',
      resume_select, resume_insert, resume_update, resume_delete;
  END IF;

  SELECT count(*) INTO app_select FROM pg_policies
    WHERE schemaname='public' AND tablename='job_applications' AND cmd IN ('SELECT', 'ALL')
      AND qual LIKE '%auth.uid()%applicant_id%';
  SELECT count(*) INTO app_insert FROM pg_policies
    WHERE schemaname='public' AND tablename='job_applications' AND cmd IN ('INSERT', 'ALL')
      AND with_check LIKE '%auth.uid()%applicant_id%';
  SELECT count(*) INTO app_update FROM pg_policies
    WHERE schemaname='public' AND tablename='job_applications' AND cmd IN ('UPDATE', 'ALL')
      AND qual LIKE '%auth.uid()%applicant_id%'
      AND with_check LIKE '%auth.uid()%applicant_id%';
  SELECT count(*) INTO app_delete FROM pg_policies
    WHERE schemaname='public' AND tablename='job_applications' AND cmd IN ('DELETE', 'ALL')
      AND qual LIKE '%auth.uid()%applicant_id%';

  IF app_select=0 OR app_insert=0 OR app_update=0 OR app_delete=0 THEN
    RAISE EXCEPTION 'RLS: job_applications owner CRUD policies missing (s=% i=% u=% d=%)',
      app_select, app_insert, app_update, app_delete;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. SECURITY DEFINER functions must not be executable by anon/PUBLIC
--    (revenue + role helpers). Defensive re-assert alongside the smoke test.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef AND p.proname IN
        ('get_profile_user_type','has_role','is_counsellor_owner','user_has_counsellor_booking','get_my_referral_code')
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS: SECURITY DEFINER function(s) executable by anon';
  END IF;
END $$;

ROLLBACK;
