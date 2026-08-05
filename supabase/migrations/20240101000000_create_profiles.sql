-- Create profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone,
  age integer DEFAULT 0,
  country text DEFAULT '',
  english integer DEFAULT 0,
  "overseasExp" integer DEFAULT 0,
  "ausExp" integer DEFAULT 0,
  education integer DEFAULT 0,
  "specialistEdu" boolean DEFAULT false,
  "ausStudy" boolean DEFAULT false,
  "professionalYear" boolean DEFAULT false,
  ccl boolean DEFAULT false,
  "regionalStudy" boolean DEFAULT false,
  "partnerSkills" integer DEFAULT 0
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile." ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
