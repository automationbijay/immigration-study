-- Create language_proficiency table
CREATE TABLE language_proficiency (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone,
  language_test text DEFAULT 'IELTS',
  test_score_listening numeric,
  test_score_reading numeric,
  test_score_writing numeric,
  test_score_speaking numeric,
  test_score_overall numeric,
  score_published_date date
);

-- Set up Row Level Security (RLS)
ALTER TABLE language_proficiency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own language proficiency." ON language_proficiency
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own language proficiency." ON language_proficiency
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own language proficiency." ON language_proficiency
  FOR UPDATE USING (auth.uid() = id);

-- Update the existing trigger to also create a language_proficiency row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  
  INSERT INTO public.basic_details (id, updated_at, email)
  VALUES (new.id, now(), new.email);

  INSERT INTO public.language_proficiency (id, updated_at)
  VALUES (new.id, now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
