CREATE TABLE IF NOT EXISTS public.profile_family (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relation text,
  age integer,
  highest_education text,
  language_test_type text,
  language_overall_score numeric,
  gender text,
  citizenship_or_pr text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.profile_family ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family members." ON public.profile_family
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own family members." ON public.profile_family
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own family members." ON public.profile_family
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own family members." ON public.profile_family
  FOR DELETE USING (auth.uid() = profile_id);
