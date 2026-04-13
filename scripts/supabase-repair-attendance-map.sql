-- One-time repair script for existing monthly_attendance rows.
-- Run this after scripts/supabase-monthly-attendance-fix.sql so the
-- rebuild_monthly_attendance_row function and delete-safe trigger logic exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'rebuild_monthly_attendance_row'
      AND pg_function_is_visible(oid)
  ) THEN
    RAISE EXCEPTION
      'Missing function public.rebuild_monthly_attendance_row(...). Run scripts/supabase-monthly-attendance-fix.sql first.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.monthly_attendance_repair_backup (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  backed_up_at timestamptz NOT NULL DEFAULT NOW(),
  monthly_attendance_id integer,
  user_id integer,
  mess_id integer,
  year integer,
  month integer,
  snapshot jsonb NOT NULL
);

INSERT INTO public.monthly_attendance_repair_backup (
  monthly_attendance_id,
  user_id,
  mess_id,
  year,
  month,
  snapshot
)
SELECT
  ma.id,
  ma.user_id,
  ma.mess_id,
  ma.year,
  ma.month,
  to_jsonb(ma)
FROM public.monthly_attendance ma;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT
      src.user_id,
      src.mess_id,
      src.year,
      src.month
    FROM (
      SELECT
        ma.user_id,
        ma.mess_id,
        ma.year,
        ma.month
      FROM public.monthly_attendance ma

      UNION

      SELECT
        a.user_id,
        a.mess_id,
        EXTRACT(YEAR FROM a.att_date)::integer AS year,
        EXTRACT(MONTH FROM a.att_date)::integer AS month
      FROM public.attendance a

      UNION

      SELECT
        oma.user_id,
        oma.mess_id,
        EXTRACT(YEAR FROM oma.att_date)::integer AS year,
        EXTRACT(MONTH FROM oma.att_date)::integer AS month
      FROM public."Owner_Marked_attendance" oma
    ) src
    WHERE src.user_id IS NOT NULL
      AND src.mess_id IS NOT NULL
      AND src.year IS NOT NULL
      AND src.month IS NOT NULL
    ORDER BY src.mess_id, src.user_id, src.year, src.month
  LOOP
    PERFORM public.rebuild_monthly_attendance_row(
      rec.user_id,
      rec.mess_id,
      rec.year,
      rec.month
    );
  END LOOP;
END;
$$;

-- Validation query: after the repair this should return 0 rows.
SELECT
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
