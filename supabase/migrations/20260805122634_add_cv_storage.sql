-- Add cv_url to profile_basic
ALTER TABLE public.profile_basic ADD COLUMN IF NOT EXISTS cv_url text;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for cvs bucket
CREATE POLICY "Users can upload their own CV"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cvs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own CV"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cvs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CV"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cvs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CV"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cvs' AND (auth.uid())::text = (storage.foldername(name))[1]);
