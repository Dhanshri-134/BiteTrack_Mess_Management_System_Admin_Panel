-- Student attendance schema introspection for Supabase/Postgres
-- Focus: student attendance only, excluding staff attendance.
--
-- Paste this into Supabase SQL Editor and run it as read-only metadata inspection.
-- It reports the live deployed schema for:
--   - attendance
--   - "Owner_Marked_attendance"
--   - monthly_attendance
--   - attendance_source_backup
--   - monthly_attendance_repair_backup
--   - monthly_attendance_billing (view)
--   - related attendance functions and triggers

DROP TABLE IF EXISTS pg_temp.target_relations;
CREATE TEMP TABLE target_relations (
  schema_name text,
  object_name text,
  object_kind text
);

INSERT INTO target_relations (schema_name, object_name, object_kind)
VALUES
  ('public', 'attendance', 'table'),
  ('public', 'Owner_Marked_attendance', 'table'),
  ('public', 'monthly_attendance', 'table'),
  ('public', 'attendance_source_backup', 'table'),
  ('public', 'monthly_attendance_repair_backup', 'table'),
  ('public', 'monthly_attendance_billing', 'view');

DROP TABLE IF EXISTS pg_temp.target_routines;
CREATE TEMP TABLE target_routines (
  schema_name text,
  routine_name text
);

INSERT INTO target_routines (schema_name, routine_name)
VALUES
  ('public', 'rebuild_monthly_attendance_row'),
  ('public', 'sync_monthly_attendance_from_source'),
  ('public', 'backup_attendance_source_row'),
  ('public', 'seed_monthly_attendance_row'),
  ('public', 'set_monthly_attendance_value'),
  ('public', 'sync_monthly_attendance_incremental');

DROP TABLE IF EXISTS pg_temp.target_triggers;
CREATE TEMP TABLE target_triggers (
  schema_name text,
  trigger_name text
);

INSERT INTO target_triggers (schema_name, trigger_name)
VALUES
  ('public', 'trg_sync_monthly_attendance_attendance'),
  ('public', 'trg_sync_monthly_attendance_owner_marked'),
  ('public', 'trg_backup_attendance_rows'),
  ('public', 'trg_backup_owner_marked_attendance_rows');

-- 1. Inventory: do the expected attendance objects exist?
SELECT
  tr.schema_name,
  tr.object_name,
  tr.object_kind,
  CASE
    WHEN tr.object_kind = 'view' AND c.oid IS NOT NULL THEN 'present'
    WHEN tr.object_kind = 'table' AND c.oid IS NOT NULL THEN 'present'
    ELSE 'missing'
  END AS status,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    ELSE c.relkind::text
  END AS actual_relkind
FROM target_relations tr
LEFT JOIN pg_namespace n
  ON n.nspname = tr.schema_name
LEFT JOIN pg_class c
  ON c.relname = tr.object_name
 AND c.relnamespace = n.oid
ORDER BY tr.object_kind, tr.object_name;

-- 2. Columns: live column layout for target tables/views.
SELECT
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
JOIN target_relations tr
  ON tr.schema_name = c.table_schema
 AND tr.object_name = c.table_name
ORDER BY c.table_name, c.ordinal_position;

-- 3. Table storage details and estimated row counts.
SELECT
  n.nspname AS schema_name,
  c.relname AS object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    ELSE c.relkind::text
  END AS object_type,
  pg_total_relation_size(c.oid) AS total_bytes,
  pg_relation_size(c.oid) AS table_bytes,
  pg_indexes_size(c.oid) AS index_bytes,
  c.reltuples::bigint AS estimated_rows
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
JOIN target_relations tr
  ON tr.schema_name = n.nspname
 AND tr.object_name = c.relname
ORDER BY object_type, object_name;

-- 4. Constraints: primary key, unique, foreign key, check.
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  pg_get_constraintdef(con.oid, true) AS constraint_definition
FROM information_schema.table_constraints tc
JOIN pg_namespace n
  ON n.nspname = tc.table_schema
JOIN pg_constraint con
  ON con.conname = tc.constraint_name
 AND con.connamespace = n.oid
JOIN target_relations tr
  ON tr.schema_name = tc.table_schema
 AND tr.object_name = tc.table_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 5. Constraint columns.
SELECT
  kcu.table_schema,
  kcu.table_name,
  kcu.constraint_name,
  kcu.column_name,
  kcu.ordinal_position
FROM information_schema.key_column_usage kcu
JOIN target_relations tr
  ON tr.schema_name = kcu.table_schema
 AND tr.object_name = kcu.table_name
ORDER BY kcu.table_name, kcu.constraint_name, kcu.ordinal_position;

-- 6. Indexes.
SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  indexname AS index_name,
  indexdef AS index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'attendance',
    'Owner_Marked_attendance',
    'monthly_attendance',
    'attendance_source_backup',
    'monthly_attendance_repair_backup'
  )
ORDER BY tablename, indexname;

-- 7. Triggers currently attached to target student-attendance tables.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE t.tgenabled::text
  END AS trigger_status,
  p.proname AS trigger_function,
  pg_get_triggerdef(t.oid, true) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c
  ON c.oid = t.tgrelid
JOIN pg_namespace n
  ON n.oid = c.relnamespace
JOIN pg_proc p
  ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND c.relname IN (
    'attendance',
    'Owner_Marked_attendance',
    'monthly_attendance',
    'attendance_source_backup',
    'monthly_attendance_repair_backup'
  )
ORDER BY c.relname, t.tgname;

-- 8. Expected trigger names: are they present?
SELECT
  tt.schema_name,
  tt.trigger_name,
  CASE WHEN t.oid IS NULL THEN 'missing' ELSE 'present' END AS status,
  c.relname AS attached_table,
  p.proname AS trigger_function
FROM target_triggers tt
LEFT JOIN pg_namespace n
  ON n.nspname = tt.schema_name
LEFT JOIN pg_trigger t
  ON t.tgname = tt.trigger_name
 AND NOT t.tgisinternal
LEFT JOIN pg_class c
  ON c.oid = t.tgrelid
 AND c.relnamespace = n.oid
LEFT JOIN pg_proc p
  ON p.oid = t.tgfoid
ORDER BY tt.trigger_name;

-- 9. Routines: function signatures and live definitions.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS return_type,
  l.lanname AS language_name,
  CASE p.provolatile
    WHEN 'i' THEN 'immutable'
    WHEN 's' THEN 'stable'
    WHEN 'v' THEN 'volatile'
    ELSE p.provolatile::text
  END AS volatility,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
JOIN pg_language l
  ON l.oid = p.prolang
JOIN target_routines tr
  ON tr.schema_name = n.nspname
 AND tr.routine_name = p.proname
ORDER BY p.proname, identity_arguments;

-- 10. Expected routines: are they present?
SELECT
  tr.schema_name,
  tr.routine_name,
  CASE WHEN p.oid IS NULL THEN 'missing' ELSE 'present' END AS status,
  COALESCE(pg_get_function_identity_arguments(p.oid), '') AS identity_arguments,
  COALESCE(pg_get_function_result(p.oid), '') AS return_type
FROM target_routines tr
LEFT JOIN pg_namespace n
  ON n.nspname = tr.schema_name
LEFT JOIN pg_proc p
  ON p.proname = tr.routine_name
 AND p.pronamespace = n.oid
ORDER BY tr.routine_name, identity_arguments;

-- 11. View definitions.
SELECT
  schemaname AS schema_name,
  viewname AS view_name,
  definition AS view_definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('monthly_attendance_billing')
ORDER BY viewname;

-- 12. RLS status for target tables.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'attendance',
    'Owner_Marked_attendance',
    'monthly_attendance',
    'attendance_source_backup',
    'monthly_attendance_repair_backup'
  )
ORDER BY c.relname;

-- 13. RLS policies for target tables.
SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'attendance',
    'Owner_Marked_attendance',
    'monthly_attendance',
    'attendance_source_backup',
    'monthly_attendance_repair_backup'
  )
ORDER BY tablename, policyname;

-- 14. Dependencies from the billing view to attendance objects.
SELECT DISTINCT
  dependent_ns.nspname AS dependent_schema,
  dependent_cls.relname AS dependent_object,
  CASE dependent_cls.relkind
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    ELSE dependent_cls.relkind::text
  END AS dependent_type,
  source_ns.nspname AS source_schema,
  source_cls.relname AS source_object,
  CASE source_cls.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized view'
    ELSE source_cls.relkind::text
  END AS source_type
FROM pg_depend d
JOIN pg_rewrite rw
  ON rw.oid = d.objid
JOIN pg_class dependent_cls
  ON dependent_cls.oid = rw.ev_class
JOIN pg_namespace dependent_ns
  ON dependent_ns.oid = dependent_cls.relnamespace
JOIN pg_class source_cls
  ON source_cls.oid = d.refobjid
JOIN pg_namespace source_ns
  ON source_ns.oid = source_cls.relnamespace
WHERE dependent_ns.nspname = 'public'
  AND dependent_cls.relname = 'monthly_attendance_billing'
ORDER BY dependent_object, source_object;

-- 15. Optional data sanity checks for monthly attendance content.
-- 15a. Non-boolean/non-null values inside attendance_map should normally be zero rows.
SELECT
  ma.id,
  ma.user_id,
  ma.mess_id,
  ma.year,
  ma.month,
  entry.key AS date_key,
  entry.value AS raw_value,
  jsonb_typeof(entry.value) AS value_type
FROM public.monthly_attendance ma
CROSS JOIN LATERAL jsonb_each(ma.attendance_map) AS entry(key, value)
WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'boolean'
  AND entry.value <> 'null'::jsonb
ORDER BY ma.mess_id, ma.user_id, ma.year, ma.month, entry.key;

-- 15b. Duplicate source attendance rows by user/date/mess.
SELECT
  source_name,
  user_id,
  mess_id,
  att_date,
  COUNT(*) AS duplicate_count
FROM (
  SELECT 'attendance'::text AS source_name, user_id, mess_id, att_date
  FROM public.attendance
  UNION ALL
  SELECT 'Owner_Marked_attendance'::text AS source_name, user_id, mess_id, att_date
  FROM public."Owner_Marked_attendance"
) src
GROUP BY source_name, user_id, mess_id, att_date
HAVING COUNT(*) > 1
ORDER BY source_name, mess_id, user_id, att_date;

-- 15c. Monthly rollup rows that do not match recomputed present-day counts from attendance_map.
SELECT
  ma.id,
  ma.user_id,
  ma.mess_id,
  ma.year,
  ma.month,
  ma.days_present AS stored_days_present,
  COALESCE(calc.present_days, 0) AS computed_present_days
FROM public.monthly_attendance ma
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS present_days
  FROM jsonb_each(ma.attendance_map) AS entry(key, value)
  WHERE entry.value = 'true'::jsonb
) calc ON TRUE
WHERE ma.days_present IS DISTINCT FROM COALESCE(calc.present_days, 0)
ORDER BY ma.mess_id, ma.user_id, ma.year, ma.month;
