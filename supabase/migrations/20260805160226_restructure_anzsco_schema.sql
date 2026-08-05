-- Drop old table if exists
DROP TABLE IF EXISTS public.anzsco_occupations;

-- Create parent table
CREATE TABLE IF NOT EXISTS public.anzsco (
    occupation_code VARCHAR(255) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create child table
CREATE TABLE IF NOT EXISTS public.anzsco_titles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    occupation_code VARCHAR(255) NOT NULL REFERENCES public.anzsco(occupation_code) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.anzsco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anzsco_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on anzsco" ON public.anzsco FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users on anzsco_titles" ON public.anzsco_titles FOR SELECT USING (true);

