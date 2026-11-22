-- Keep point_australia in step with the profile tables.
--
-- Before this migration only the English score was derived from profile data
-- (test_* -> point_australia.english). Education and work experience entered on
-- the Profile page, or imported from a CV, never reached point_australia, so the
-- points estimate ignored them. Deleting a language test also left the old
-- English points behind, because the sync trigger did not fire on DELETE.
--
-- After this migration:
--   * profile_education  -> point_australia.education       (points)
--   * profile_experience -> point_australia."overseasExp"   (years, last 10)
--                           point_australia."ausExp"        (years, last 10)
--   * test_*             -> point_australia.english         (points, now also on DELETE)
-- A value becomes NULL ("not answered") when the user has no rows left.
-- The calculator can still set these columns directly; the latest edit wins.

-- 1. New users start with "not answered", not with answers of 0 ------------------
-- Existing rows keep their values: a stored 0 cannot be told apart from a real
-- "0 points" answer, so nothing is rewritten here.
ALTER TABLE public.point_australia
  ALTER COLUMN age DROP DEFAULT,
  ALTER COLUMN english DROP DEFAULT,
  ALTER COLUMN education DROP DEFAULT,
  ALTER COLUMN "overseasExp" DROP DEFAULT,
  ALTER COLUMN "ausExp" DROP DEFAULT,
  ALTER COLUMN "partnerSkills" DROP DEFAULT;

-- 2. Recompute helpers (one per derived value) ------------------------------------

CREATE OR REPLACE FUNCTION public.recompute_education_points(uid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  pts integer;
BEGIN
  -- Highest completed qualification. Accepts both the Profile form's values
  -- (Doctorate, Masters, Bachelor, Diploma, High School, Unrecognized) and the
  -- CV importer's (doctorate, masters, bachelor, diploma_or_trade, none).
  -- A qualification with a future end date is still in progress: 0 points.
  SELECT MAX(
           CASE
             WHEN e.end_date IS NOT NULL AND e.end_date > current_date THEN 0
             WHEN lower(e.level) = 'doctorate' THEN 20
             WHEN lower(e.level) IN ('masters', 'bachelor') THEN 15
             WHEN lower(e.level) IN ('diploma', 'diploma_or_trade') THEN 10
             ELSE 0
           END)
    INTO pts
    FROM public.profile_education e
   WHERE e.user_id = uid
     AND coalesce(e.level, '') <> '';

  UPDATE public.point_australia SET education = pts, updated_at = now() WHERE id = uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_experience_years(uid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  has_rows boolean;
  aus_days integer;
  overseas_days integer;
  window_start date := (current_date - interval '10 years')::date;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profile_experience WHERE user_id = uid) INTO has_rows;

  IF NOT has_rows THEN
    UPDATE public.point_australia SET "overseasExp" = NULL, "ausExp" = NULL, updated_at = now() WHERE id = uid;
    RETURN;
  END IF;

  -- Count distinct calendar days inside the last 10 years, so overlapping jobs
  -- are not double-counted. Ongoing jobs (no end date) run to today.
  WITH spans AS (
    SELECT lower(trim(x.country)) IN ('australia', 'au') AS in_australia,
           greatest(x.start_date, window_start) AS s,
           least(coalesce(x.end_date, current_date), current_date) AS e
      FROM public.profile_experience x
     WHERE x.user_id = uid
  ),
  days AS (
    SELECT DISTINCT sp.in_australia, d::date AS day
      FROM spans sp, generate_series(sp.s, sp.e - 1, interval '1 day') AS d
     WHERE sp.e > sp.s
  )
  SELECT count(*) FILTER (WHERE in_australia),
         count(*) FILTER (WHERE NOT in_australia)
    INTO aus_days, overseas_days
    FROM days;

  UPDATE public.point_australia
     -- +1 counts the end day inclusively, so exactly N calendar years (which
     -- spans N*365 + leap days) is N years rather than N-1.
     SET "ausExp" = CASE WHEN aus_days = 0 THEN 0 ELSE floor((aus_days + 1) / 365.2425)::integer END,
         "overseasExp" = CASE WHEN overseas_days = 0 THEN 0 ELSE floor((overseas_days + 1) / 365.2425)::integer END,
         updated_at = now()
   WHERE id = uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_english_points(uid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  pts integer;
BEGIN
  SELECT MAX(pr_points) INTO pts FROM (
    SELECT pr_points FROM public.test_ielts WHERE user_id = uid
    UNION ALL SELECT pr_points FROM public.test_toefl WHERE user_id = uid
    UNION ALL SELECT pr_points FROM public.test_pte WHERE user_id = uid
    UNION ALL SELECT pr_points FROM public.test_cambridge WHERE user_id = uid
    UNION ALL SELECT pr_points FROM public.test_oet WHERE user_id = uid
  ) AS all_tests;

  UPDATE public.point_australia SET english = pts, updated_at = now() WHERE id = uid;
END;
$$;

-- These take an arbitrary user id, so only the triggers below may call them.
REVOKE EXECUTE ON FUNCTION public.recompute_education_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_experience_years(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_english_points(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Trigger functions --------------------------------------------------------------
-- UPDATE only (never INSERT) on point_australia, so clear_user_data() deleting
-- profile rows after point_australia cannot resurrect an empty points row.

CREATE OR REPLACE FUNCTION public.sync_education_points_to_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.recompute_education_points(OLD.user_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    PERFORM public.recompute_education_points(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_experience_years_to_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.recompute_experience_years(OLD.user_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    PERFORM public.recompute_experience_years(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Replaces the INSERT/UPDATE-only version from 20260921020000.
CREATE OR REPLACE FUNCTION public.sync_english_points_to_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.recompute_english_points(OLD.user_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    PERFORM public.recompute_english_points(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Triggers -------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_sync_education_points ON public.profile_education;
CREATE TRIGGER trigger_sync_education_points
AFTER INSERT OR UPDATE OR DELETE ON public.profile_education
FOR EACH ROW EXECUTE FUNCTION public.sync_education_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_experience_years ON public.profile_experience;
CREATE TRIGGER trigger_sync_experience_years
AFTER INSERT OR UPDATE OR DELETE ON public.profile_experience
FOR EACH ROW EXECUTE FUNCTION public.sync_experience_years_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_ielts ON public.test_ielts;
CREATE TRIGGER trigger_sync_english_ielts AFTER INSERT OR UPDATE OR DELETE ON public.test_ielts
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_toefl ON public.test_toefl;
CREATE TRIGGER trigger_sync_english_toefl AFTER INSERT OR UPDATE OR DELETE ON public.test_toefl
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_pte ON public.test_pte;
CREATE TRIGGER trigger_sync_english_pte AFTER INSERT OR UPDATE OR DELETE ON public.test_pte
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_cambridge ON public.test_cambridge;
CREATE TRIGGER trigger_sync_english_cambridge AFTER INSERT OR UPDATE OR DELETE ON public.test_cambridge
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_oet ON public.test_oet;
CREATE TRIGGER trigger_sync_english_oet AFTER INSERT OR UPDATE OR DELETE ON public.test_oet
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

-- 5. Backfill users who already have education or experience entries --------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.profile_education LOOP
    PERFORM public.recompute_education_points(r.user_id);
  END LOOP;
  FOR r IN SELECT DISTINCT user_id FROM public.profile_experience LOOP
    PERFORM public.recompute_experience_years(r.user_id);
  END LOOP;
END $$;
