-- Update education table to allow multiple rows per user and add new columns

-- 1. Rename existing 'id' to 'user_id'
ALTER TABLE public.education RENAME COLUMN id TO user_id;

-- 2. Drop the old primary key constraint
ALTER TABLE public.education DROP CONSTRAINT education_pkey;

-- 3. Add a new 'id' column as the primary key
ALTER TABLE public.education ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- 4. Add new columns requested by the user
ALTER TABLE public.education ADD COLUMN start_date date;
ALTER TABLE public.education ADD COLUMN end_date date;
ALTER TABLE public.education ADD COLUMN started_year integer;
ALTER TABLE public.education ADD COLUMN university_name text;
ALTER TABLE public.education ADD COLUMN created_at timestamptz DEFAULT now();

-- Add a comment to document the expected values for the level column
COMMENT ON COLUMN public.education.level IS 'Expected values: high school, diploma, bachelor, masters, doctorate, unrecognized, etc.';

-- 5. Update RLS policies to use 'user_id' instead of 'id' and follow Supabase best practices
DROP POLICY IF EXISTS "Users can view own education." ON public.education;
DROP POLICY IF EXISTS "Users can insert own education." ON public.education;
DROP POLICY IF EXISTS "Users can update own education." ON public.education;

CREATE POLICY "Users can view own education." ON public.education
  FOR SELECT TO authenticated 
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can insert own education." ON public.education
  FOR INSERT TO authenticated 
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update own education." ON public.education
  FOR UPDATE TO authenticated 
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete own education." ON public.education
  FOR DELETE TO authenticated 
  USING ( (select auth.uid()) = user_id );

-- 6. Add index on user_id for performance
CREATE INDEX IF NOT EXISTS education_user_id_idx ON public.education (user_id);
