CREATE OR REPLACE FUNCTION public.sync_english_points_to_profile()
RETURNS trigger AS $$
DECLARE
    max_pts INT := 0;
BEGIN
    -- We need to check all 5 test tables for the user and get the max PR points
    -- We use NEW.user_id which is the user ID on the test row being updated
    SELECT COALESCE(MAX(pr_points), 0) INTO max_pts FROM (
        SELECT pr_points FROM public.test_ielts WHERE user_id = NEW.user_id
        UNION ALL
        SELECT pr_points FROM public.test_toefl WHERE user_id = NEW.user_id
        UNION ALL
        SELECT pr_points FROM public.test_pte WHERE user_id = NEW.user_id
        UNION ALL
        SELECT pr_points FROM public.test_cambridge WHERE user_id = NEW.user_id
        UNION ALL
        SELECT pr_points FROM public.test_oet WHERE user_id = NEW.user_id
    ) AS all_tests;

    -- Update the point_australia table for this user
    UPDATE public.point_australia 
    SET english = max_pts 
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach this to the test tables AFTER insert or update
DROP TRIGGER IF EXISTS trigger_sync_english_ielts ON public.test_ielts;
CREATE TRIGGER trigger_sync_english_ielts AFTER INSERT OR UPDATE ON public.test_ielts
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_toefl ON public.test_toefl;
CREATE TRIGGER trigger_sync_english_toefl AFTER INSERT OR UPDATE ON public.test_toefl
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_pte ON public.test_pte;
CREATE TRIGGER trigger_sync_english_pte AFTER INSERT OR UPDATE ON public.test_pte
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_cambridge ON public.test_cambridge;
CREATE TRIGGER trigger_sync_english_cambridge AFTER INSERT OR UPDATE ON public.test_cambridge
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();

DROP TRIGGER IF EXISTS trigger_sync_english_oet ON public.test_oet;
CREATE TRIGGER trigger_sync_english_oet AFTER INSERT OR UPDATE ON public.test_oet
FOR EACH ROW EXECUTE FUNCTION public.sync_english_points_to_profile();
