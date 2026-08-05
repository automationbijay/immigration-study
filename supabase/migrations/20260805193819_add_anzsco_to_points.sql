ALTER TABLE public.point_australia 
ADD COLUMN IF NOT EXISTS "educationAnzsco" jsonb,
ADD COLUMN IF NOT EXISTS "experienceAnzsco" jsonb;
