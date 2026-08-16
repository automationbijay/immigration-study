-- Index for fast lookups of a specific visa subclass (e.g., '189')
CREATE INDEX IF NOT EXISTS idx_anzsco_visa_federal_subclass 
ON public.anzsco_visa_federal (visa_subclass);

-- Index for filtering visas by occupation list (e.g., 'MLTSSL')
CREATE INDEX IF NOT EXISTS idx_anzsco_visa_federal_list_code 
ON public.anzsco_visa_federal (list_code);

-- Index for filtering by residency type (e.g., 'Permanent')
CREATE INDEX IF NOT EXISTS idx_anzsco_visa_federal_residency_type 
ON public.anzsco_visa_federal (residency_type);
