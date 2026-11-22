-- Users who ran "Delete All My Data" (or whose rows were otherwise removed) have
-- no point_australia row; handle_new_user() only creates one at signup. The
-- sync triggers only UPDATEd that row, so their English / education /
-- experience points silently stopped being saved. Create the row when missing.
--
-- clear_user_data() now deletes point_australia LAST, after the tables whose
-- triggers would otherwise recreate it during the delete.

CREATE OR REPLACE FUNCTION public.ensure_points_row(uid uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  INSERT INTO public.point_australia (id, updated_at)
  SELECT uid, now()
   WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = uid)
  ON CONFLICT (id) DO NOTHING;
$$;
REVOKE EXECUTE ON FUNCTION public.ensure_points_row(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger functions: make sure the row exists on INSERT/UPDATE before recomputing.
-- (On DELETE nothing is created, so deleting data never resurrects the row.)
CREATE OR REPLACE FUNCTION public.sync_education_points_to_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.recompute_education_points(OLD.user_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.ensure_points_row(NEW.user_id);
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
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.ensure_points_row(NEW.user_id);
    PERFORM public.recompute_experience_years(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_english_points_to_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.recompute_english_points(OLD.user_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.ensure_points_row(NEW.user_id);
    PERFORM public.recompute_english_points(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Same tables as 20261122020000, with point_australia moved to the end.
CREATE OR REPLACE FUNCTION public.clear_user_data()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    uid uuid := auth.uid();
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM public.profile_basic WHERE id = uid;
    DELETE FROM public.profile_family WHERE profile_id = uid;
    DELETE FROM public.profile_experience WHERE user_id = uid;
    DELETE FROM public.profile_education WHERE user_id = uid;
    DELETE FROM public.profile_job_classification WHERE user_id = uid;

    DELETE FROM public.point_fsw67 WHERE user_id = uid;
    DELETE FROM public.points_canada_crs WHERE user_id = uid;

    DELETE FROM public.test_ielts WHERE user_id = uid;
    DELETE FROM public.test_toefl WHERE user_id = uid;
    DELETE FROM public.test_pte WHERE user_id = uid;
    DELETE FROM public.test_cambridge WHERE user_id = uid;
    DELETE FROM public.test_oet WHERE user_id = uid;

    DELETE FROM public.cv_metadata WHERE user_id = uid;
    DELETE FROM public.cv_llamaparsed WHERE user_id = uid;

    UPDATE public.feedback_submissions SET user_id = NULL WHERE user_id = uid;

    -- Last: the triggers on the tables above update this row while they run.
    DELETE FROM public.point_australia WHERE id = uid;
END;
$$;
