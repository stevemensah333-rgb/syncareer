-- LOVABLE CLOUD LIVE SCHEMA INSPECTION (READ ONLY)
--
-- Run each numbered SELECT separately in Lovable Cloud -> SQL editor against the
-- intended environment. These queries read PostgreSQL catalogs/configuration
-- only. They do not select application rows, auth users, storage objects, queue
-- messages, Vault values, secrets, or cron command text.
--
-- Export each result as CSV/JSON, review it for unexpected literals, and place
-- only reviewed metadata in the reconciliation evidence. Do not commit a raw
-- full-database export: Lovable's Advanced settings export includes row data.

-- 1. Relations and RLS state (public tables/views and storage.objects only).
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    WHEN 'f' THEN 'foreign table'
    ELSE c.relkind::text
  END AS relation_kind,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (
    n.nspname = 'public'
    OR (n.nspname = 'storage' AND c.relname = 'objects')
  )
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY n.nspname, c.relname;

-- 2. Columns. Defaults are schema metadata; review unexpected literal defaults.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  a.attnum AS ordinal_position,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  a.attnotnull AS not_null,
  a.attidentity AS identity_kind,
  a.attgenerated AS generated_kind,
  pg_get_expr(d.adbin, d.adrelid) AS column_default
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum;

-- 2A. Application enums, domains, and standalone composite types.
SELECT
  n.nspname AS schema_name,
  t.typname AS type_name,
  CASE t.typtype
    WHEN 'e' THEN 'enum'
    WHEN 'd' THEN 'domain'
    WHEN 'c' THEN 'composite'
    ELSE t.typtype::text
  END AS type_kind,
  pg_catalog.format_type(t.typbasetype, t.typtypmod) AS domain_base_type,
  t.typnotnull AS domain_not_null,
  pg_get_expr(t.typdefaultbin, 0) AS domain_default,
  e.enumsortorder,
  e.enumlabel
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
LEFT JOIN pg_enum e ON e.enumtypid = t.oid
LEFT JOIN pg_class composite_class ON composite_class.oid = t.typrelid
WHERE n.nspname = 'public'
  AND (
    t.typtype IN ('e', 'd')
    OR (t.typtype = 'c' AND composite_class.relkind = 'c')
  )
ORDER BY t.typname, e.enumsortorder;

-- 2B. Sequences (configuration only, not current/last values).
SELECT
  schemaname AS schema_name,
  sequencename AS sequence_name,
  data_type,
  start_value,
  min_value,
  max_value,
  increment_by,
  cycle,
  cache_size
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- 3. Primary, unique, foreign-key, check, and exclusion constraints.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname, con.conname;

-- 4. Index definitions.
SELECT
  schemaname AS schema_name,
  tablename AS relation_name,
  indexname AS index_name,
  indexdef AS definition
FROM pg_indexes
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, indexname;

-- 5. View definitions.
SELECT
  n.nspname AS schema_name,
  c.relname AS view_name,
  c.relkind AS view_kind,
  pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('v', 'm')
ORDER BY n.nspname, c.relname;

-- 6. Function signatures and body hashes. Bodies are intentionally omitted so
-- a mistakenly hard-coded secret cannot be copied into Git. A schema-only dump
-- from Lovable/support is still required for restorable function definitions.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS result_type,
  l.lanname AS language,
  p.provolatile AS volatility,
  p.prosecdef AS security_definer,
  md5(pg_get_functiondef(p.oid)) AS definition_md5
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

-- 7. Non-internal triggers, including their full schema definitions.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid, true) AS definition,
  t.tgenabled AS enabled_state
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname IN ('public', 'storage', 'auth')
ORDER BY n.nspname, c.relname, t.tgname;

-- 8. Table and column grants for application roles.
SELECT
  'table' AS grant_scope,
  table_schema AS schema_name,
  table_name AS object_name,
  NULL::text AS column_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema IN ('public', 'storage')
UNION ALL
SELECT
  'column' AS grant_scope,
  table_schema AS schema_name,
  table_name AS object_name,
  column_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.column_privileges
WHERE table_schema IN ('public', 'storage')
ORDER BY schema_name, object_name, grant_scope, column_name, grantee, privilege_type;

-- 9. Function EXECUTE grants.
SELECT
  routine_schema AS schema_name,
  routine_name AS function_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
ORDER BY routine_name, grantee;

-- 9A. Default privileges that affect future relations/routines.
SELECT
  COALESCE(n.nspname, '*') AS schema_name,
  pg_get_userbyid(d.defaclrole) AS owner,
  d.defaclobjtype AS object_type,
  CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
WHERE n.nspname IS NULL OR n.nspname IN ('public', 'storage')
ORDER BY schema_name, owner, object_type, grantee, privilege_type;

-- 10. Table and storage RLS policies.
SELECT
  schemaname AS schema_name,
  tablename AS relation_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname IN ('public', 'storage', 'realtime')
ORDER BY schemaname, tablename, policyname;

-- 11. Installed extensions and versions.
SELECT
  e.extname AS extension_name,
  e.extversion AS extension_version,
  n.nspname AS installed_schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;

-- 12. Storage bucket configuration only (no files/objects).
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- 13. Cron metadata. Deliberately hash, rather than return, command text because
-- legacy jobs sometimes embed bearer tokens or URLs with secret query values.
-- If pg_cron is absent, skip this query and record that fact from query 11.
SELECT
  jobid,
  jobname,
  schedule,
  active,
  md5(command) AS command_md5,
  length(command) AS command_length
FROM cron.job
ORDER BY jobname, jobid;

-- 14. PGMQ relation inventory from the catalog only. This does not read queue
-- messages. If pgmq is absent, this returns no rows.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  c.relkind AS relation_kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'pgmq'
ORDER BY c.relname;

-- 15. Applied migration ledger metadata. Statements are omitted and hashed.
-- If the managed installation does not expose this relation, record the error
-- and ask Lovable support for the applied migration identity list.
SELECT
  version,
  name,
  md5(COALESCE(array_to_string(statements, E'\n'), '')) AS statements_md5
FROM supabase_migrations.schema_migrations
ORDER BY version;
