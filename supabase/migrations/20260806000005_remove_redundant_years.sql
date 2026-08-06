-- Remove redundant started_year and completed_year from profile_education table
ALTER TABLE public.profile_education DROP COLUMN IF EXISTS started_year;
ALTER TABLE public.profile_education DROP COLUMN IF EXISTS completed_year;

-- Remove education_completed_year from cv_llamaparsed if it exists
ALTER TABLE public.cv_llamaparsed DROP COLUMN IF EXISTS education_completed_year;
