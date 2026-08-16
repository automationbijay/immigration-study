CREATE TABLE IF NOT EXISTS public.anzsco_visa_federal (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    list_code text NOT NULL,
    list_name text NOT NULL,
    visa_subclass text NOT NULL,
    visa_name text NOT NULL,
    residency_type text NOT NULL,
    residency_description text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(list_code, visa_subclass)
);

-- Enable RLS
ALTER TABLE public.anzsco_visa_federal ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access on anzsco_visa_federal" 
ON public.anzsco_visa_federal
FOR SELECT 
TO public
USING (true);

-- Insert Data
INSERT INTO public.anzsco_visa_federal (
    list_code, list_name, visa_subclass, visa_name, residency_type, residency_description
) VALUES 
('MLTSSL', 'Medium and Long-term Strategic Skills List', '189', 'Skilled Independent', 'Permanent', 'Grants the holder the right to live, work, and study in Australia indefinitely with a direct pathway to citizenship.'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '190', 'Skilled Nominated', 'Permanent', 'Grants the holder the right to live, work, and study in Australia indefinitely with a direct pathway to citizenship.'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '186', 'Employer Nomination Scheme', 'Permanent', 'Grants the holder the right to live, work, and study in Australia indefinitely with a direct pathway to citizenship.'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '491', 'Skilled Work Regional', 'Provisional', 'A limited-term visa explicitly structured as a direct pathway to Permanent Residency, contingent upon fulfilling specific conditions (such as living and working in a regional area for 3 years).'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '494', 'Skilled Employer Sponsored Regional', 'Provisional', 'A limited-term visa explicitly structured as a direct pathway to Permanent Residency, contingent upon fulfilling specific conditions (such as living and working in a regional area for 3 years).'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '482', 'Temporary Skill Shortage (Medium-term stream)', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '485', 'Temporary Graduate', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.'),
('MLTSSL', 'Medium and Long-term Strategic Skills List', '407', 'Training', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.'),
('STSOL', 'Short-term Skilled Occupation List', '190', 'Skilled Nominated', 'Permanent', 'Grants the holder the right to live, work, and study in Australia indefinitely with a direct pathway to citizenship.'),
('STSOL', 'Short-term Skilled Occupation List', '491', 'Skilled Work Regional (State sponsored only)', 'Provisional', 'A limited-term visa explicitly structured as a direct pathway to Permanent Residency, contingent upon fulfilling specific conditions (such as living and working in a regional area for 3 years).'),
('STSOL', 'Short-term Skilled Occupation List', '482', 'Temporary Skill Shortage (Short-term stream)', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.'),
('STSOL', 'Short-term Skilled Occupation List', '407', 'Training', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.'),
('ROL', 'Regional Occupation List', '491', 'Skilled Work Regional (State sponsored only)', 'Provisional', 'A limited-term visa explicitly structured as a direct pathway to Permanent Residency, contingent upon fulfilling specific conditions (such as living and working in a regional area for 3 years).'),
('ROL', 'Regional Occupation List', '494', 'Skilled Employer Sponsored Regional', 'Provisional', 'A limited-term visa explicitly structured as a direct pathway to Permanent Residency, contingent upon fulfilling specific conditions (such as living and working in a regional area for 3 years).'),
('ROL', 'Regional Occupation List', '482', 'Temporary Skill Shortage (Regional agreements)', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.'),
('ROL', 'Regional Occupation List', '407', 'Training', 'Temporary', 'A fixed-term visa issued for a specific purpose (e.g., short-term work or study) without a guaranteed or built-in direct pathway to Permanent Residency.')
ON CONFLICT (list_code, visa_subclass) DO NOTHING;
