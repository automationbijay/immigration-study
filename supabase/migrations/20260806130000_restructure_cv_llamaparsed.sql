-- Drop the existing cv_llamaparsed table
DROP TABLE IF EXISTS public.cv_llamaparsed CASCADE;

-- Create the new cv_llamaparsed table with structured profile prefixes
CREATE TABLE public.cv_llamaparsed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id uuid NOT NULL UNIQUE REFERENCES public.cv_metadata(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- profile_basic
  profile_basic_dob date,
  profile_basic_name text,
  profile_basic_country text,
  profile_basic_marital_status text,
  profile_basic_phone_no text,
  profile_basic_email text,
  profile_basic_location text,

  -- profile_education
  profile_education_level text,
  profile_education_field_of_study text,
  profile_education_institution text,
  profile_education_country text,
  profile_education_start_date date,
  profile_education_end_date date,
  profile_education_university_name text,

  -- profile_experience
  profile_experience_company_name text,
  profile_experience_role text,
  profile_experience_country text,
  profile_experience_start_date date,
  profile_experience_end_date date
);

-- Enable RLS
ALTER TABLE public.cv_llamaparsed ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for viewing
CREATE POLICY "Users can view own cv_llamaparsed." ON public.cv_llamaparsed
  FOR SELECT USING (auth.uid() = user_id);

-- Add index on user_id for performance
CREATE INDEX IF NOT EXISTS cv_llamaparsed_user_id_idx ON public.cv_llamaparsed (user_id);
