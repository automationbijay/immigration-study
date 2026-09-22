-- Create the profile_job_classification table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profile_job_classification (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    anzsco_code varchar(20),
    anzsco_title text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- IMPORTANT: Add an index on user_id to prevent sequential scans during DELETE and SELECT operations.
-- Without this index, `delete().eq('user_id', user.id)` will scan the entire table, consuming Disk I/O.
CREATE INDEX IF NOT EXISTS profile_job_classification_user_id_idx ON public.profile_job_classification(user_id);

-- Enable RLS and add policies for the table
ALTER TABLE public.profile_job_classification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job classification"
    ON public.profile_job_classification
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job classification"
    ON public.profile_job_classification
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job classification"
    ON public.profile_job_classification
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
