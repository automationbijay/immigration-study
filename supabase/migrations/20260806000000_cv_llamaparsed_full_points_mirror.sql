-- cv_llamaparsed was only mirroring 8 of point_australia's 15 data columns
-- (the ones CV extraction happened to feed). Make it a true 1:1 mirror of
-- every point_australia column, prefixed, for schema completeness —
-- regardless of whether extract-cv currently populates each one.
ALTER TABLE public.cv_llamaparsed
  ADD COLUMN IF NOT EXISTS point_australia_age integer,
  ADD COLUMN IF NOT EXISTS point_australia_specialist_edu boolean,
  ADD COLUMN IF NOT EXISTS point_australia_partner_skills integer,
  ADD COLUMN IF NOT EXISTS point_australia_education_anzsco jsonb,
  ADD COLUMN IF NOT EXISTS point_australia_experience_anzsco jsonb,
  ADD COLUMN IF NOT EXISTS point_australia_spouse_details text,
  ADD COLUMN IF NOT EXISTS point_australia_children_count integer;
