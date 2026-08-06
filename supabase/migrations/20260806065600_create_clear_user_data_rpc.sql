-- Create an RPC function to safely delete all user-related data (except auth.users)
CREATE OR REPLACE FUNCTION public.clear_user_data()
RETURNS void AS $$
DECLARE
    uid uuid := auth.uid();
BEGIN
    IF uid IS NULL THEN 
        RAISE EXCEPTION 'Not authenticated'; 
    END IF;

    -- Legacy tables (id)
    DELETE FROM public.profiles WHERE id = uid;
    DELETE FROM public.basic_details WHERE id = uid;
    
    -- Current Profile tables (id / profile_id / user_id)
    DELETE FROM public.profile_basic WHERE id = uid;
    DELETE FROM public.point_australia WHERE id = uid;
    DELETE FROM public.profile_family WHERE profile_id = uid;
    DELETE FROM public.profile_experience WHERE user_id = uid;
    DELETE FROM public.profile_education WHERE user_id = uid;
    
    -- Language tests (user_id)
    DELETE FROM public.language_proficiency WHERE user_id = uid;
    DELETE FROM public.test_ielts WHERE user_id = uid;
    DELETE FROM public.test_toefl WHERE user_id = uid;
    DELETE FROM public.test_pte WHERE user_id = uid;
    DELETE FROM public.test_cambridge WHERE user_id = uid;
    DELETE FROM public.test_oet WHERE user_id = uid;
    
    -- CV parsing and metadata (user_id)
    DELETE FROM public.cv_metadata WHERE user_id = uid;
    DELETE FROM public.cv_llamaparsed WHERE user_id = uid;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
