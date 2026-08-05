-- Fix mutable search_path issue for handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  
  INSERT INTO public.basic_details (id, updated_at, email)
  VALUES (new.id, now(), new.email);

  -- Insert one blank test row for convenience
  INSERT INTO public.language_proficiency (user_id, updated_at)
  VALUES (new.id, now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update RLS policies for profiles to prevent auth_rls_initplan and missing WITH CHECK on UPDATE
DROP POLICY IF EXISTS "Users can view own profile." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

CREATE POLICY "Users can view own profile." ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- Update RLS policies for basic_details to prevent auth_rls_initplan and missing WITH CHECK on UPDATE
DROP POLICY IF EXISTS "Users can view own basic details." ON basic_details;
DROP POLICY IF EXISTS "Users can insert their own basic details." ON basic_details;
DROP POLICY IF EXISTS "Users can update own basic details." ON basic_details;

CREATE POLICY "Users can view own basic details." ON basic_details
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own basic details." ON basic_details
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own basic details." ON basic_details
  FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- Update RLS policies for language_proficiency to prevent auth_rls_initplan and missing WITH CHECK on UPDATE
DROP POLICY IF EXISTS "Users can view own language proficiency." ON language_proficiency;
DROP POLICY IF EXISTS "Users can insert their own language proficiency." ON language_proficiency;
DROP POLICY IF EXISTS "Users can update own language proficiency." ON language_proficiency;
DROP POLICY IF EXISTS "Users can delete own language proficiency." ON language_proficiency;

CREATE POLICY "Users can view own language proficiency." ON language_proficiency
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own language proficiency." ON language_proficiency
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own language proficiency." ON language_proficiency
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  
CREATE POLICY "Users can delete own language proficiency." ON language_proficiency
  FOR DELETE USING ((select auth.uid()) = user_id);
