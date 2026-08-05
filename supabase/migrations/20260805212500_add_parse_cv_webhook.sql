-- Add parsed_data and is_parsed columns to cv_metadata
ALTER TABLE public.cv_metadata ADD COLUMN IF NOT EXISTS parsed_data JSONB;
ALTER TABLE public.cv_metadata ADD COLUMN IF NOT EXISTS is_parsed BOOLEAN DEFAULT false;

-- Create Database Webhook (Trigger) for CV Parsing
-- Note: Requires pg_net extension to be enabled if using net.http_post
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create a function to trigger the webhook
CREATE OR REPLACE FUNCTION public.trigger_parse_cv_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text := current_setting('app.settings.edge_function_url', true);
BEGIN
  -- If not set, use local URL or deployed URL
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    edge_function_url := 'http://kong:8000/functions/v1/parse-cv';
  END IF;

  PERFORM net.http_post(
      url := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA,
          'record', row_to_json(NEW)
      )
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on cv_metadata
DROP TRIGGER IF EXISTS parse_cv_webhook_trigger ON public.cv_metadata;
CREATE TRIGGER parse_cv_webhook_trigger
AFTER INSERT ON public.cv_metadata
FOR EACH ROW EXECUTE PROCEDURE public.trigger_parse_cv_webhook();
