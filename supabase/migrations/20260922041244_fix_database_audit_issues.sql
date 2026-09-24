-- 1. Fix missing RLS policies
CREATE POLICY "Enable read access for all users" ON "public"."anzsco_mltssl" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."anzsco_rol" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."anzsco_stsol" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."aus_language_classification" AS PERMISSIVE FOR SELECT TO public USING (true);

-- 2. Optimize RLS Performance
DROP POLICY IF EXISTS "Users can insert own FSW points" ON "public"."point_fsw67";
DROP POLICY IF EXISTS "Users can update own FSW points" ON "public"."point_fsw67";
DROP POLICY IF EXISTS "Users can delete own FSW points" ON "public"."point_fsw67";
DROP POLICY IF EXISTS "Users can view own CRS points" ON "public"."points_canada_crs";
DROP POLICY IF EXISTS "Users can insert own CRS points" ON "public"."points_canada_crs";

CREATE POLICY "Users can insert own FSW points" ON "public"."point_fsw67" FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own FSW points" ON "public"."point_fsw67" FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own FSW points" ON "public"."point_fsw67" FOR DELETE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can view own CRS points" ON "public"."points_canada_crs" FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own CRS points" ON "public"."points_canada_crs" FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- 3. Secure Function Search Paths
ALTER FUNCTION public.clear_user_data() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
        EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = ''''';
    END IF;
END $$;
ALTER FUNCTION public.update_language_classification() SET search_path = '';
ALTER FUNCTION public.sync_english_points_to_profile() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 4. Move pg_net extension to extensions schema
-- (Disabled: pg_net does not support SET SCHEMA)
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION pg_net SET SCHEMA extensions;
