-- Rename education table to profile_education

ALTER TABLE IF EXISTS public.education RENAME TO profile_education;

-- Update RLS policy names for clarity (optional, but good practice)
ALTER POLICY "Users can view own education." ON public.profile_education RENAME TO "Users can view own profile_education.";
ALTER POLICY "Users can insert own education." ON public.profile_education RENAME TO "Users can insert own profile_education.";
ALTER POLICY "Users can update own education." ON public.profile_education RENAME TO "Users can update own profile_education.";
ALTER POLICY "Users can delete own education." ON public.profile_education RENAME TO "Users can delete own profile_education.";
