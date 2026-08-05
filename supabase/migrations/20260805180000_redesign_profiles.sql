-- Create profile_basic table
CREATE TABLE public.profile_basic (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone,
  dob date,
  name text DEFAULT '',
  country text DEFAULT '',
  marital_status text DEFAULT 'Single',
  phone_no text DEFAULT '',
  email text DEFAULT ''
);

-- Create point_australia table
CREATE TABLE public.point_australia (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone,
  age integer DEFAULT 0,
  english integer DEFAULT 0,
  "overseasExp" integer DEFAULT 0,
  "ausExp" integer DEFAULT 0,
  education integer DEFAULT 0,
  "specialistEdu" boolean DEFAULT false,
  "ausStudy" boolean DEFAULT false,
  "professionalYear" boolean DEFAULT false,
  ccl boolean DEFAULT false,
  "regionalStudy" boolean DEFAULT false,
  "partnerSkills" integer DEFAULT 0
);

-- Migrate data
-- Assuming basic_details has dob, name, country, marital_status, phone_no, email
INSERT INTO public.profile_basic (id, updated_at, dob, name, country, marital_status, phone_no, email)
SELECT id, updated_at, dob, name, country, marital_status, phone_no, email FROM public.basic_details;

-- Update the ones that exist in profiles but not basic_details or just merge them
INSERT INTO public.profile_basic (id, updated_at, country)
SELECT id, updated_at, country FROM public.profiles 
ON CONFLICT (id) DO UPDATE SET 
  country = EXCLUDED.country WHERE public.profile_basic.country = '';

-- Migrate point data
INSERT INTO public.point_australia (id, updated_at, age, english, "overseasExp", "ausExp", education, "specialistEdu", "ausStudy", "professionalYear", ccl, "regionalStudy", "partnerSkills")
SELECT id, updated_at, age, english, "overseasExp", "ausExp", education, "specialistEdu", "ausStudy", "professionalYear", ccl, "regionalStudy", "partnerSkills" FROM public.profiles;

-- Setup RLS for profile_basic
ALTER TABLE public.profile_basic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile basic." ON public.profile_basic
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile basic." ON public.profile_basic
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile basic." ON public.profile_basic
  FOR UPDATE USING (auth.uid() = id);

-- Setup RLS for point_australia
ALTER TABLE public.point_australia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point australia." ON public.point_australia
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own point australia." ON public.point_australia
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own point australia." ON public.point_australia
  FOR UPDATE USING (auth.uid() = id);

-- Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profile_basic (id, updated_at, email)
  VALUES (new.id, now(), new.email);

  INSERT INTO public.point_australia (id, updated_at)
  VALUES (new.id, now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old tables
DROP TABLE public.profiles CASCADE;
DROP TABLE public.basic_details CASCADE;
