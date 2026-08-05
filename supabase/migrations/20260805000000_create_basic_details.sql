-- Create basic_details table
CREATE TABLE basic_details (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone,
  dob date,
  name text DEFAULT '',
  country text DEFAULT '',
  marital_status text DEFAULT 'Single',
  phone_no text DEFAULT '',
  email text DEFAULT ''
);

-- Set up Row Level Security (RLS)
ALTER TABLE basic_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own basic details." ON basic_details
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own basic details." ON basic_details
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own basic details." ON basic_details
  FOR UPDATE USING (auth.uid() = id);

-- Update the existing trigger to also create a basic_details row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  
  INSERT INTO public.basic_details (id, updated_at, email)
  VALUES (new.id, now(), new.email);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
