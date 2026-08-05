-- Alter language_proficiency to support multiple tests
ALTER TABLE language_proficiency 
DROP CONSTRAINT language_proficiency_pkey;

ALTER TABLE language_proficiency 
RENAME COLUMN id TO user_id;

-- Add new uuid primary key
ALTER TABLE language_proficiency 
ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;

-- Recreate policies to ensure they reference user_id correctly
DROP POLICY IF EXISTS "Users can view own language proficiency." ON language_proficiency;
DROP POLICY IF EXISTS "Users can insert their own language proficiency." ON language_proficiency;
DROP POLICY IF EXISTS "Users can update own language proficiency." ON language_proficiency;

CREATE POLICY "Users can view own language proficiency." ON language_proficiency
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own language proficiency." ON language_proficiency
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own language proficiency." ON language_proficiency
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own language proficiency." ON language_proficiency
  FOR DELETE USING (auth.uid() = user_id);

-- Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  
  INSERT INTO public.basic_details (id, updated_at, email)
  VALUES (new.id, now(), new.email);

  -- Insert one blank test row for convenience
  INSERT INTO public.language_proficiency (user_id, updated_at)
  VALUES (new.id, now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
