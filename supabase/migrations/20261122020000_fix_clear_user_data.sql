-- "Delete All My Data" (delete-user-data -> clear_user_data) left three tables
-- behind: point_fsw67 (saved Canada FSW estimates), points_canada_crs and
-- profile_job_classification (chosen occupation). The Privacy policy promises
-- profile, saved estimates and CV are removed, so delete those too.
--
-- Feedback the user sent is kept (it may report a real mistake) but is
-- detached from their account.
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

    -- Profile tables
    DELETE FROM public.profile_basic WHERE id = uid;
    DELETE FROM public.point_australia WHERE id = uid;
    DELETE FROM public.profile_family WHERE profile_id = uid;
    DELETE FROM public.profile_experience WHERE user_id = uid;
    DELETE FROM public.profile_education WHERE user_id = uid;
    DELETE FROM public.profile_job_classification WHERE user_id = uid;

    -- Saved estimates
    DELETE FROM public.point_fsw67 WHERE user_id = uid;
    DELETE FROM public.points_canada_crs WHERE user_id = uid;

    -- Language tests
    DELETE FROM public.test_ielts WHERE user_id = uid;
    DELETE FROM public.test_toefl WHERE user_id = uid;
    DELETE FROM public.test_pte WHERE user_id = uid;
    DELETE FROM public.test_cambridge WHERE user_id = uid;
    DELETE FROM public.test_oet WHERE user_id = uid;

    -- CV parsing and metadata
    DELETE FROM public.cv_metadata WHERE user_id = uid;
    DELETE FROM public.cv_llamaparsed WHERE user_id = uid;

    -- Keep feedback, drop the link to the account.
    UPDATE public.feedback_submissions SET user_id = NULL WHERE user_id = uid;
END;
$$;
