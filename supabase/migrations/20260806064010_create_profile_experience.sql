-- Create profile_experience table
CREATE TABLE IF NOT EXISTS public.profile_experience (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    role text NOT NULL,
    country text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view own profile_experience." ON public.profile_experience
    FOR SELECT TO authenticated 
    USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can insert own profile_experience." ON public.profile_experience
    FOR INSERT TO authenticated 
    WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update own profile_experience." ON public.profile_experience
    FOR UPDATE TO authenticated 
    USING ( (select auth.uid()) = user_id )
    WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete own profile_experience." ON public.profile_experience
    FOR DELETE TO authenticated 
    USING ( (select auth.uid()) = user_id );

-- Add index on user_id for performance
CREATE INDEX IF NOT EXISTS profile_experience_user_id_idx ON public.profile_experience (user_id);
