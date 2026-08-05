CREATE TABLE IF NOT EXISTS public.skilled_occupations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    anzsco_code text NOT NULL UNIQUE,
    name text NOT NULL,
    list_type text,
    assessing_authority text,
    skill_level integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS policies
ALTER TABLE public.skilled_occupations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on skilled_occupations"
    ON public.skilled_occupations
    FOR SELECT
    USING (true);

-- Indexes for frequent searches
CREATE INDEX IF NOT EXISTS skilled_occupations_code_idx ON public.skilled_occupations(anzsco_code);
CREATE INDEX IF NOT EXISTS skilled_occupations_name_idx ON public.skilled_occupations(name);

GRANT ALL ON public.skilled_occupations TO anon;
GRANT ALL ON public.skilled_occupations TO authenticated;
GRANT ALL ON public.skilled_occupations TO service_role;
