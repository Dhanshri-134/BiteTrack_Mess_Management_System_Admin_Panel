CREATE OR REPLACE FUNCTION public.rebuild_monthly_attendance_row(
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
  v_first_attendance_date date;
  v_days_present integer;
  v_active_start date;
  v_active_end date;
  v_attendance_map jsonb;
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

  WITH present_dates AS (
    SELECT DISTINCT src.att_date::date AS att_date
    FROM (
      SELECT att_date
      FROM public.attendance
      WHERE user_id = p_user_id
        AND mess_id = p_mess_id
        AND EXTRACT(YEAR FROM att_date) = p_year
        AND EXTRACT(MONTH FROM att_date) = p_month

      UNION ALL

      SELECT att_date
      FROM public."Owner_Marked_attendance"
      WHERE user_id = p_user_id
        AND mess_id = p_mess_id
        AND EXTRACT(YEAR FROM att_date) = p_year
        AND EXTRACT(MONTH FROM att_date) = p_month
    ) src
  )
  SELECT MIN(att_date), COUNT(*)
  INTO v_first_attendance_date, v_days_present
  FROM present_dates;

  IF COALESCE(v_days_present, 0) = 0 THEN
    RETURN;
  END IF;

  v_active_start := GREATEST(
    v_month_start,
    COALESCE(v_join_date, v_month_start),
    COALESCE(v_unfreeze_date, v_month_start)
  );

  v_active_end := v_month_end;
  IF LOWER(COALESCE(v_status, '')) = 'inactive'
     AND v_freeze_date IS NOT NULL
     AND v_freeze_date <= v_month_end THEN
    v_active_end := v_freeze_date - 1;
  END IF;

  WITH present_dates AS (
    SELECT DISTINCT src.att_date::date AS att_date
    FROM (
      SELECT att_date
      FROM public.attendance
      WHERE user_id = p_user_id
        AND mess_id = p_mess_id
        AND EXTRACT(YEAR FROM att_date) = p_year
        AND EXTRACT(MONTH FROM att_date) = p_month

      UNION ALL

      SELECT att_date
      FROM public."Owner_Marked_attendance"
      WHERE user_id = p_user_id
        AND mess_id = p_mess_id
        AND EXTRACT(YEAR FROM att_date) = p_year
        AND EXTRACT(MONTH FROM att_date) = p_month
    ) src
  ),
  expanded_days AS (
    SELECT gs::date AS att_date
    FROM generate_series(v_month_start, v_month_end, interval '1 day') AS gs
  ),
  mapped_days AS (
    SELECT
      ed.att_date,
      CASE
        WHEN ed.att_date > CURRENT_DATE THEN NULL
        WHEN ed.att_date < v_first_attendance_date THEN NULL
        WHEN ed.att_date < v_active_start OR ed.att_date > v_active_end THEN NULL
        WHEN EXISTS (
          SELECT 1
          FROM present_dates pd
          WHERE pd.att_date = ed.att_date
        ) THEN TRUE
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
  INTO v_attendance_map
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
    v_days_present,
    COALESCE(v_attendance_map, '{}'::jsonb),
    NOW(),
    NOW(),
    v_first_attendance_date,
    p_mess_id
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    days_present = EXCLUDED.days_present,
    attendance_map = EXCLUDED.attendance_map,
    updated_at = NOW(),
    first_attendance_date = EXCLUDED.first_attendance_date,
    mess_id = EXCLUDED.mess_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_monthly_attendance_from_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'attendance' THEN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      PERFORM public.rebuild_monthly_attendance_row(
        NEW.user_id,
        NEW.mess_id,
        EXTRACT(YEAR FROM NEW.att_date)::integer,
        EXTRACT(MONTH FROM NEW.att_date)::integer
      );
    END IF;

    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    PERFORM public.rebuild_monthly_attendance_row(
      OLD.user_id,
      OLD.mess_id,
      EXTRACT(YEAR FROM OLD.att_date)::integer,
      EXTRACT(MONTH FROM OLD.att_date)::integer
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.rebuild_monthly_attendance_row(
      NEW.user_id,
      NEW.mess_id,
      EXTRACT(YEAR FROM NEW.att_date)::integer,
      EXTRACT(MONTH FROM NEW.att_date)::integer
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_monthly_attendance_attendance ON public.attendance;
CREATE TRIGGER trg_sync_monthly_attendance_attendance
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.sync_monthly_attendance_from_source();

DROP TRIGGER IF EXISTS trg_sync_monthly_attendance_owner_marked ON public."Owner_Marked_attendance";
CREATE TRIGGER trg_sync_monthly_attendance_owner_marked
AFTER INSERT OR UPDATE OR DELETE ON public."Owner_Marked_attendance"
FOR EACH ROW
EXECUTE FUNCTION public.sync_monthly_attendance_from_source();

CREATE OR REPLACE VIEW public.monthly_attendance_billing AS
WITH expanded AS (
  SELECT
    m.id,
    m.user_id,
    m.mess_id,
    m.year,
    m.month,
    m.attendance_map,
    m.first_attendance_date,
    ms.allowed_leave_days AS leave_threshold,
    d.d::date AS att_date,
    m.attendance_map -> to_char(d.d, 'YYYY-MM-DD') AS raw_status
  FROM public.monthly_attendance m
  JOIN public.messes ms
    ON ms.id = m.mess_id
  JOIN LATERAL generate_series(
    make_date(m.year, m.month, 1)::timestamp with time zone,
    (
      date_trunc('month', make_date(m.year, m.month, 1)::timestamp with time zone)
      + interval '1 month - 1 day'
    )::date::timestamp with time zone,
    interval '1 day'
  ) AS d(d)
    ON TRUE
),
classified AS (
  SELECT
    expanded.id,
    expanded.user_id,
    expanded.mess_id,
    expanded.year,
    expanded.month,
    expanded.attendance_map,
    expanded.first_attendance_date,
    expanded.leave_threshold,
    expanded.att_date,
    expanded.raw_status,
    CASE
      WHEN expanded.att_date < expanded.first_attendance_date THEN NULL::boolean
      WHEN expanded.raw_status = 'null'::jsonb THEN NULL::boolean
      WHEN expanded.raw_status = 'true'::jsonb THEN TRUE
      ELSE FALSE
    END AS status
  FROM expanded
),
windowed AS (
  SELECT
    classified.id,
    classified.user_id,
    classified.mess_id,
    classified.year,
    classified.month,
    classified.attendance_map,
    classified.first_attendance_date,
    classified.leave_threshold,
    classified.att_date,
    classified.raw_status,
    classified.status
  FROM classified
  WHERE classified.status IS NOT NULL
),
streaks AS (
  SELECT
    windowed.id,
    windowed.user_id,
    windowed.mess_id,
    windowed.year,
    windowed.month,
    windowed.attendance_map,
    windowed.first_attendance_date,
    windowed.leave_threshold,
    windowed.att_date,
    windowed.raw_status,
    windowed.status,
    row_number() OVER (PARTITION BY windowed.id ORDER BY windowed.att_date)
    - row_number() OVER (PARTITION BY windowed.id, windowed.status ORDER BY windowed.att_date) AS grp
  FROM windowed
),
leave_days AS (
  SELECT
    s.id,
    SUM(s.cnt) AS leave_days
  FROM (
    SELECT
      streaks.id,
      streaks.grp,
      COUNT(*) AS cnt,
      MAX(streaks.leave_threshold) AS threshold
    FROM streaks
    WHERE streaks.status = FALSE
    GROUP BY streaks.id, streaks.grp
    HAVING COUNT(*) >= MAX(streaks.leave_threshold)
  ) s
  GROUP BY s.id
),
total_window_days AS (
  SELECT
    windowed.id,
    COUNT(*) AS total_days
  FROM windowed
  GROUP BY windowed.id
)
SELECT
  m.id,
  m.user_id,
  m.mess_id,
  m.year,
  m.month,
  SUM(
    CASE
      WHEN w.status = TRUE THEN 1
      ELSE 0
    END
  ) AS present_days,
  COALESCE(l.leave_days, 0::numeric) AS allowed_leave_days,
  GREATEST(t.total_days::numeric - COALESCE(l.leave_days, 0::numeric), 0::numeric) AS days_billed,
  m.attendance_map
FROM public.monthly_attendance m
JOIN windowed w
  ON w.id = m.id
JOIN total_window_days t
  ON t.id = m.id
LEFT JOIN leave_days l
  ON l.id = m.id
GROUP BY m.id, m.user_id, m.mess_id, m.year, m.month, t.total_days, l.leave_days, m.attendance_map;

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
