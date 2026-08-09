-- SCHEMA/RLS SMOKE TEST FOR AN ISOLATED RESTORE OR LOVABLE TEST ENVIRONMENT
--
-- This script is read-only and rolls back. Do not use it as a substitute for a
-- reviewed schema export. Run it only after restoring a verified Lovable schema
-- snapshot into an isolated Supabase-compatible database, or in a Lovable Test
-- environment when that legacy feature is already enabled for the project.

BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  missing_relations text;
  missing_columns text;
  tables_without_rls text;
  unsafe_definers text;
  missing_extensions text;
  missing_buckets text;
  missing_storage_policy_buckets text;
  missing_enforcement_triggers text;
BEGIN
  -- Relations consumed by the active application/edge functions plus relations
  -- represented by the newer root generated type copy. counsellor_credentials
  -- and counsellor_messages are intentional canaries: the app calls both even
  -- though neither generated type copy contains them.
  SELECT string_agg(relation_name, ', ' ORDER BY relation_name)
  INTO missing_relations
  FROM unnest(ARRAY[
    'alumni_outcomes_cache',
    'assessment_responses',
    'assessments',
    'career_guidance_sessions',
    'career_skills',
    'careers',
    'counsellor_availability',
    'counsellor_booking_view',
    'counsellor_bookings',
    'counsellor_bookings_public',
    'counsellor_credentials',
    'counsellor_details',
    'counsellor_messages',
    'counsellor_profiles_public',
    'counsellor_reviews',
    'counsellor_sessions',
    'email_send_log',
    'email_send_state',
    'email_unsubscribe_tokens',
    'job_applications',
    'job_posting_skills',
    'job_postings',
    'market_intelligence_cache',
    'mock_interviews',
    'notification_preferences',
    'notifications',
    'payments',
    'profiles',
    'qualifications',
    'recommendation_outcomes',
    'referrals',
    'resumes',
    'saved_jobs',
    'skill_endorsements',
    'skill_evidence',
    'skills_taxonomy',
    'student_details',
    'subscriptions',
    'suppressed_emails',
    'university_insights',
    'usage_logs',
    'user_feedback',
    'user_intelligence_profiles',
    'user_roles',
    'user_skill_map',
    'user_skills'
  ]) AS expected(relation_name)
  WHERE to_regclass(format('public.%I', relation_name)) IS NULL;

  IF missing_relations IS NOT NULL THEN
    RAISE EXCEPTION 'Missing app/generated-type public relations: %', missing_relations;
  END IF;

  SELECT string_agg(
    format('%I.%I', table_name, column_name),
    ', ' ORDER BY table_name, column_name
  )
  INTO missing_columns
  FROM (VALUES
    ('counsellor_details', 'meeting_platform')
  ) AS expected(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = expected.table_name
      AND c.column_name = expected.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Missing columns directly used by the active app: %', missing_columns;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO tables_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.classid = 'pg_class'::regclass
        AND d.objid = c.oid
        AND d.deptype = 'e'
    );

  IF tables_without_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Public tables without RLS enabled: %', tables_without_rls;
  END IF;

  -- PostgreSQL grants EXECUTE to PUBLIC by default. SECURITY DEFINER routines
  -- must have explicit restrictions; anon must not retain an EXECUTE grant.
  SELECT string_agg(
    format('%I.%I(%s) -> %s', n.nspname, p.proname,
      pg_get_function_identity_arguments(p.oid),
      CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END),
    ', ' ORDER BY p.proname
  )
  INTO unsafe_definers
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND acl.privilege_type = 'EXECUTE'
    AND (
      acl.grantee = 0
      OR pg_get_userbyid(acl.grantee) = 'anon'
    );

  IF unsafe_definers IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY DEFINER routines executable by PUBLIC/anon: %', unsafe_definers;
  END IF;

  SELECT string_agg(extension_name, ', ' ORDER BY extension_name)
  INTO missing_extensions
  FROM unnest(ARRAY['pg_cron', 'pg_net', 'pgmq', 'supabase_vault']) AS expected(extension_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_extension e WHERE e.extname = extension_name
  );

  IF missing_extensions IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tracked extension dependencies: %', missing_extensions;
  END IF;

  SELECT string_agg(bucket_name, ', ' ORDER BY bucket_name)
  INTO missing_buckets
  FROM unnest(ARRAY['avatars', 'documents']) AS expected(bucket_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets b WHERE b.id = bucket_name
  );

  IF missing_buckets IS NOT NULL THEN
    RAISE EXCEPTION 'Missing storage buckets used by the active app: %', missing_buckets;
  END IF;

  SELECT string_agg(bucket_name, ', ' ORDER BY bucket_name)
  INTO missing_storage_policy_buckets
  FROM unnest(ARRAY['avatars', 'documents']) AS expected(bucket_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'storage'
      AND p.tablename = 'objects'
      AND (
        COALESCE(p.qual, '') LIKE '%' || quote_literal(bucket_name) || '%'
        OR COALESCE(p.with_check, '') LIKE '%' || quote_literal(bucket_name) || '%'
      )
  );

  IF missing_storage_policy_buckets IS NOT NULL THEN
    RAISE EXCEPTION 'No storage.objects policy mentions app bucket(s): %', missing_storage_policy_buckets;
  END IF;

  SELECT string_agg(expected_trigger, ', ' ORDER BY expected_trigger)
  INTO missing_enforcement_triggers
  FROM unnest(ARRAY[
    'public.counsellor_sessions:enforce_counsellor_session_updates',
    'public.counsellor_bookings:enforce_counsellor_booking_updates'
  ]) AS expected(expected_trigger)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname || '.' || c.relname || ':' || p.proname = expected_trigger
  );

  IF missing_enforcement_triggers IS NOT NULL THEN
    RAISE EXCEPTION 'Missing counsellor update enforcement trigger(s): %', missing_enforcement_triggers;
  END IF;
END
$$;

-- Review output: more than one trigger per relation/function pair indicates the
-- July/August tracked trigger-name mismatch may have produced duplicate calls.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  p.proname AS function_name,
  count(*) AS trigger_count,
  array_agg(t.tgname ORDER BY t.tgname) AS trigger_names
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND p.proname IN (
    'enforce_counsellor_session_updates',
    'enforce_counsellor_booking_updates'
  )
GROUP BY n.nspname, c.relname, p.proname
ORDER BY n.nspname, c.relname, p.proname;

-- Review output: schedule/active state only; command text is intentionally not
-- returned because legacy commands may contain credentials.
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname, jobid;

ROLLBACK;
