-- 1. Drop existing table and its policies (CASCADE will handle policies)
DROP TABLE IF EXISTS public.language_proficiency CASCADE;

-- 2. Create the new test tables
-- IELTS
CREATE TABLE public.test_ielts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listening numeric,
    reading numeric,
    writing numeric,
    speaking numeric,
    overall numeric,
    test_date date,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- TOEFL
CREATE TABLE public.test_toefl (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listening numeric,
    reading numeric,
    writing numeric,
    speaking numeric,
    overall numeric,
    test_date date,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- PTE
CREATE TABLE public.test_pte (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listening numeric,
    reading numeric,
    writing numeric,
    speaking numeric,
    overall numeric,
    test_date date,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Cambridge
CREATE TABLE public.test_cambridge (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listening numeric,
    reading numeric,
    writing numeric,
    speaking numeric,
    overall numeric,
    test_date date,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- OET
CREATE TABLE public.test_oet (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    listening numeric,
    reading numeric,
    writing numeric,
    speaking numeric,
    overall numeric,
    test_date date,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS and setup policies for all new tables
-- IELTS
ALTER TABLE public.test_ielts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ielts test." ON public.test_ielts FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own ielts test." ON public.test_ielts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own ielts test." ON public.test_ielts FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own ielts test." ON public.test_ielts FOR DELETE USING ((select auth.uid()) = user_id);

-- TOEFL
ALTER TABLE public.test_toefl ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own toefl test." ON public.test_toefl FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own toefl test." ON public.test_toefl FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own toefl test." ON public.test_toefl FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own toefl test." ON public.test_toefl FOR DELETE USING ((select auth.uid()) = user_id);

-- PTE
ALTER TABLE public.test_pte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pte test." ON public.test_pte FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own pte test." ON public.test_pte FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own pte test." ON public.test_pte FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own pte test." ON public.test_pte FOR DELETE USING ((select auth.uid()) = user_id);

-- Cambridge
ALTER TABLE public.test_cambridge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cambridge test." ON public.test_cambridge FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own cambridge test." ON public.test_cambridge FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own cambridge test." ON public.test_cambridge FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own cambridge test." ON public.test_cambridge FOR DELETE USING ((select auth.uid()) = user_id);

-- OET
ALTER TABLE public.test_oet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own oet test." ON public.test_oet FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own oet test." ON public.test_oet FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own oet test." ON public.test_oet FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own oet test." ON public.test_oet FOR DELETE USING ((select auth.uid()) = user_id);

-- 4. Update the handle_new_user trigger function to remove language_proficiency insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  
  INSERT INTO public.basic_details (id, updated_at, email)
  VALUES (new.id, now(), new.email);

  -- language_proficiency has been removed, so we don't insert any test records by default
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
