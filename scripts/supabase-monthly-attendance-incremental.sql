CREATE OR REPLACE FUNCTION public.seed_monthly_attendance_row(
  p_user_id integer,
  p_mess_id integer,
  p_year integer,
  p_month integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start date := make_date(p_year, p_month, 1);
  v_month_end date := (date_trunc('month', make_date(p_year, p_month, 1)::timestamp) + interval '1 month - 1 day')::date;
  v_join_date date;
  v_status text;
  v_freeze_date date;
  v_unfreeze_date date;
  v_active_start date;
  v_active_end date;
  v_seed_map jsonb;
BEGIN
  SELECT
    u.date_of_joining,
    COALESCE(u.status, 'Active'),
    u.freeze_date,
    u.unfreeze_date
  INTO
    v_join_date,
    v_status,
    v_freeze_date,
    v_unfreeze_date
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.mess_id = p_mess_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_active_start := GREATEST(
    v_month_start,
    COALESCE(v_join_date, v_month_start),
    COALESCE(v_unfreeze_date, v_month_start)
  );

  v_active_end := v_month_end;
  IF LOWER(COALESCE(v_status, '')) IN ('inactive', 'frozen')
     AND v_freeze_date IS NOT NULL
     AND v_freeze_date <= v_month_end THEN
    v_active_end := v_freeze_date - 1;
  END IF;

  WITH expanded_days AS (
    SELECT gs::date AS att_date
    FROM generate_series(v_month_start, v_month_end, interval '1 day') AS gs
  ),
  mapped_days AS (
    SELECT
      ed.att_date,
      CASE
        WHEN ed.att_date > CURRENT_DATE THEN NULL
        WHEN v_active_start IS NULL OR v_active_end IS NULL THEN NULL
        WHEN ed.att_date < v_active_start OR ed.att_date > v_active_end THEN NULL
        ELSE FALSE
      END AS att_status
    FROM expanded_days ed
  )
  SELECT jsonb_object_agg(
    to_char(md.att_date, 'YYYY-MM-DD'),
    CASE
      WHEN md.att_status IS TRUE THEN 'true'::jsonb
      WHEN md.att_status IS FALSE THEN 'false'::jsonb
      ELSE 'null'::jsonb
    END
    ORDER BY md.att_date
  )
  INTO v_seed_map
  FROM mapped_days md;

  INSERT INTO public.monthly_attendance (
    user_id,
    year,
    month,
    days_present,
    attendance_map,
    created_at,
    updated_at,
    first_attendance_date,
    mess_id
  )
  VALUES (
    p_user_id,
    p_year,
    p_month,
    0,
    COALESCE(v_seed_map, '{}'::jsonb),
    NOW(),
    NOW(),
    NULL,
    p_mess_id
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    attendance_map = EXCLUDED.attendance_map || COALESCE(public.monthly_attendance.attendance_map, '{}'::jsonb),
    mess_id = EXCLUDED.mess_id,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_monthly_attendance_value(
  p_user_id integer,
  p_mess_id integer,
  p_att_date date,
  p_present boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM p_att_date)::integer;
  v_month integer := EXTRACT(MONTH FROM p_att_date)::integer;
  v_date_key text := to_char(p_att_date, 'YYYY-MM-DD');
  v_month_start date := make_date(v_year, v_month, 1);
  v_month_end date := (date_trunc('month', make_date(v_year, v_month, 1)::timestamp) + interval '1 month - 1 day')::date;
  v_join_date date;
  v_status text;
  v_freeze_date date;
  v_unfreeze_date date;
  v_active_start date;
  v_active_end date;
  v_value jsonb := 'null'::jsonb;
BEGIN
  PERFORM public.seed_monthly_attendance_row(p_user_id, p_mess_id, v_year, v_month);

  SELECT
    u.date_of_joining,
    COALESCE(u.status, 'Active'),
    u.freeze_date,
    u.unfreeze_date
  INTO
    v_join_date,
    v_status,
    v_freeze_date,
    v_unfreeze_date
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.mess_id = p_mess_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_active_start := GREATEST(
    v_month_start,
    COALESCE(v_join_date, v_month_start),
    COALESCE(v_unfreeze_date, v_month_start)
  );

  v_active_end := v_month_end;
  IF LOWER(COALESCE(v_status, '')) IN ('inactive', 'frozen')
     AND v_freeze_date IS NOT NULL
     AND v_freeze_date <= v_month_end THEN
    v_active_end := v_freeze_date - 1;
  END IF;

  IF v_active_start IS NOT NULL
     AND v_active_end IS NOT NULL
     AND p_att_date <= CURRENT_DATE
     AND p_att_date >= v_active_start
     AND p_att_date <= v_active_end THEN
    v_value := CASE WHEN p_present THEN 'true'::jsonb ELSE 'false'::jsonb END;
  END IF;

  WITH updated_map AS (
    SELECT jsonb_set(
      COALESCE(attendance_map, '{}'::jsonb),
      ARRAY[v_date_key],
      v_value,
      true
    ) AS attendance_map
    FROM public.monthly_attendance
    WHERE user_id = p_user_id
      AND mess_id = p_mess_id
      AND year = v_year
      AND month = v_month
    FOR UPDATE
  ),
  stats AS (
    SELECT
      COUNT(*) FILTER (WHERE entry.value = 'true'::jsonb) AS days_present,
      MIN(entry.key::date) FILTER (
        WHERE entry.value = 'true'::jsonb
          AND entry.key ~ '^\d{4}-\d{2}-\d{2}$'
      ) AS first_attendance_date
    FROM updated_map um
    CROSS JOIN LATERAL jsonb_each(um.attendance_map) AS entry(key, value)
  )
  UPDATE public.monthly_attendance ma
  SET
    attendance_map = um.attendance_map,
    days_present = COALESCE(stats.days_present, 0),
    first_attendance_date = stats.first_attendance_date,
    updated_at = NOW()
  FROM updated_map um, stats
  WHERE ma.user_id = p_user_id
    AND ma.mess_id = p_mess_id
    AND ma.year = v_year
    AND ma.month = v_month;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_monthly_attendance_incremental()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_present boolean;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT 1
        FROM public.attendance a
        WHERE a.user_id = OLD.user_id
          AND a.mess_id = OLD.mess_id
          AND a.att_date = OLD.att_date

        UNION ALL

        SELECT 1
        FROM public."Owner_Marked_attendance" oma
        WHERE oma.user_id = OLD.user_id
          AND oma.mess_id = OLD.mess_id
          AND oma.att_date = OLD.att_date
      ) src
    )
    INTO v_old_present;

    PERFORM public.set_monthly_attendance_value(
      OLD.user_id,
      OLD.mess_id,
      OLD.att_date::date,
      v_old_present
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.set_monthly_attendance_value(
      NEW.user_id,
      NEW.mess_id,
      NEW.att_date::date,
      TRUE
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_monthly_attendance_attendance ON public.attendance;
CREATE TRIGGER trg_sync_monthly_attendance_attendance
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.sync_monthly_attendance_incremental();

DROP TRIGGER IF EXISTS trg_sync_monthly_attendance_owner_marked ON public."Owner_Marked_attendance";
CREATE TRIGGER trg_sync_monthly_attendance_owner_marked
AFTER INSERT OR UPDATE OR DELETE ON public."Owner_Marked_attendance"
FOR EACH ROW
EXECUTE FUNCTION public.sync_monthly_attendance_incremental();

DO $$
DECLARE
  user_rec record;
  source_rec record;
  current_month date;
  end_month date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  FOR user_rec IN
    SELECT
      u.id,
      u.mess_id,
      date_trunc('month', COALESCE(u.date_of_joining, CURRENT_DATE))::date AS start_month
    FROM public.users u
    WHERE u.mess_id IS NOT NULL
  LOOP
    current_month := user_rec.start_month;

    WHILE current_month <= end_month LOOP
      PERFORM public.seed_monthly_attendance_row(
        user_rec.id,
        user_rec.mess_id,
        EXTRACT(YEAR FROM current_month)::integer,
        EXTRACT(MONTH FROM current_month)::integer
      );

      current_month := (current_month + interval '1 month')::date;
    END LOOP;
  END LOOP;

  FOR source_rec IN
    SELECT DISTINCT
      src.user_id,
      src.mess_id,
      src.att_date::date AS att_date
    FROM (
      SELECT user_id, mess_id, att_date
      FROM public.attendance

      UNION ALL

      SELECT user_id, mess_id, att_date
      FROM public."Owner_Marked_attendance"
    ) src
    WHERE src.user_id IS NOT NULL
      AND src.mess_id IS NOT NULL
      AND src.att_date IS NOT NULL
    ORDER BY src.mess_id, src.user_id, src.att_date
  LOOP
    PERFORM public.set_monthly_attendance_value(
      source_rec.user_id,
      source_rec.mess_id,
      source_rec.att_date,
      TRUE
    );
  END LOOP;
END;
$$;
