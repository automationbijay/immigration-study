-- 1. RLS Performance Issues
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own FSW points" ON public.point_fsw67;
DROP POLICY IF EXISTS "Users can insert own FSW points" ON public.point_fsw67;
DROP POLICY IF EXISTS "Users can update own FSW points" ON public.point_fsw67;
DROP POLICY IF EXISTS "Users can delete own FSW points" ON public.point_fsw67;

DROP POLICY IF EXISTS "Users can view own CRS points" ON public.points_canada_crs;
DROP POLICY IF EXISTS "Users can insert own CRS points" ON public.points_canada_crs;
DROP POLICY IF EXISTS "Users can update own CRS points" ON public.points_canada_crs;
DROP POLICY IF EXISTS "Users can delete own CRS points" ON public.points_canada_crs;

-- Create performant policies
CREATE POLICY "Users can view own FSW points"
    ON public.point_fsw67 FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own FSW points"
    ON public.point_fsw67 FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own FSW points"
    ON public.point_fsw67 FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own FSW points"
    ON public.point_fsw67 FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own CRS points"
    ON public.points_canada_crs FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own CRS points"
    ON public.points_canada_crs FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own CRS points"
    ON public.points_canada_crs FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own CRS points"
    ON public.points_canada_crs FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- 2. Unsafe Function Search Path
ALTER FUNCTION public.clear_user_data() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
-- update_updated_at_column might be an alias or missing, IF EXISTS isn't supported for ALTER FUNCTION SET search_path directly without plpgsql block or just run it and catch error.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
    END IF;
END $$;
ALTER FUNCTION public.update_language_classification() SET search_path = '';
ALTER FUNCTION public.sync_english_points_to_profile() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';


