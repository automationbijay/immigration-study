-- Adds two things needed by the new extract-cv (LlamaExtract) pipeline:
--
-- 1. education: raw qualification detail a CV actually contains that
--    point_australia.education (a points integer) can't hold — field of
--    study, institution, country, completed year. 1:1 per user, same shape
--    as profile_basic/point_australia. Not wired into handle_new_user() —
--    a row only appears once a CV is actually processed.
--
-- 2. cv_llamaparsed: one row per CV, a full audit record of everything
--    extract-cv found for that CV — independent of whether apply-cv-profile
--    actually applied each field (it only fills empty columns, so this table
--    is the "what did we find" record, not just "what we applied"). Columns
--    are prefixed with their source table's name (profile_basic_*,
--    point_australia_*, education_*); point_australia's camelCase columns
--    are normalized to snake_case here for consistency with the rest of the
--    schema. age/specialistEdu/partnerSkills are excluded — nothing in a CV
--    extraction produces them.

CREATE TABLE public.education (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamptz,
  level text,
  field_of_study text,
  institution text,
  country text,
  completed_year integer
);

ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own education." ON public.education
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own education." ON public.education
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own education." ON public.education
  FOR UPDATE USING (auth.uid() = id);

CREATE TABLE public.cv_llamaparsed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id uuid NOT NULL UNIQUE REFERENCES public.cv_metadata(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  profile_basic_name text,
  profile_basic_email text,
  profile_basic_phone_no text,
  profile_basic_country text,
  profile_basic_dob date,
  profile_basic_marital_status text,

  point_australia_education integer,
  point_australia_overseas_exp integer,
  point_australia_aus_exp integer,
  point_australia_english integer,
  point_australia_aus_study boolean,
  point_australia_regional_study boolean,
  point_australia_professional_year boolean,
  point_australia_ccl boolean,

  education_level text,
  education_field_of_study text,
  education_institution text,
  education_country text,
  education_completed_year integer,

  most_recent_job_title text,
  occupation_code text,
  occupation_job_name text,
  occupation_category text,
  assumptions jsonb
);

ALTER TABLE public.cv_llamaparsed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cv_llamaparsed." ON public.cv_llamaparsed
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX cv_llamaparsed_user_id_idx ON public.cv_llamaparsed (user_id);

-- Dispatches the new extract-cv function independently of (parallel to, not
-- chained after) the existing parse-cv trigger. Same nonfatal wrapper: a
-- dispatch failure here can never roll back the CV upload.
CREATE OR REPLACE FUNCTION public.trigger_extract_cv_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url     := 'https://mvycqvmojoqtfyvjsigv.supabase.co/functions/v1/extract-cv',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object(
        'type',   TG_OP,
        'table',  TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'extract-cv dispatch failed for cv_metadata %: % (%)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER extract_cv_webhook_trigger
  AFTER INSERT ON public.cv_metadata
  FOR EACH ROW EXECUTE FUNCTION public.trigger_extract_cv_webhook();
