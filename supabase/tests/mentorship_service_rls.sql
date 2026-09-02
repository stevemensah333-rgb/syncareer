-- Run against an isolated database after applying 20260831120000_mentor_request_service.sql.
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname='public' AND tablename='mentorship_requests' AND cmd='SELECT'
    AND qual LIKE '%mentee_id%auth.uid()%mentor_id%';
  IF v_count=0 THEN RAISE EXCEPTION 'mentorship_requests participant SELECT policy missing'; END IF;

  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname='public' AND tablename='mentorship_requests' AND cmd IN ('INSERT','UPDATE','DELETE');
  IF v_count>0 THEN RAISE EXCEPTION 'mentorship_requests must not allow direct client writes'; END IF;

  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname='public' AND tablename='mentorship_email_outbox'
    AND roles @> ARRAY['service_role']::name[];
  IF v_count=0 THEN RAISE EXCEPTION 'mentorship email outbox service policy missing'; END IF;

  SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
    'create_mentorship_request','respond_to_mentorship_request','update_mentorship_request_status',
    'admin_mentor_verification','get_mentorship_request_context'
  ) AND p.prosecdef;
  IF v_count<>5 THEN RAISE EXCEPTION 'mentorship SECURITY DEFINER operation count is %, expected 5', v_count; END IF;

  SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE '%mentorship%' AND has_function_privilege('anon',p.oid,'EXECUTE');
  IF v_count>0 THEN RAISE EXCEPTION 'anonymous role can execute mentorship function(s)'; END IF;
END $$;

ROLLBACK;
