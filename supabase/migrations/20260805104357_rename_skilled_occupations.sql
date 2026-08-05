ALTER TABLE IF EXISTS public.skilled_occupations RENAME TO anzsco_occupations;

-- Rename indexes
ALTER INDEX IF EXISTS skilled_occupations_code_idx RENAME TO anzsco_occupations_code_idx;
ALTER INDEX IF EXISTS skilled_occupations_name_idx RENAME TO anzsco_occupations_name_idx;

-- Rename policy
ALTER POLICY "Allow public read access on skilled_occupations" ON public.anzsco_occupations RENAME TO "Allow public read access on anzsco_occupations";
