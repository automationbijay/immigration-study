CREATE OR REPLACE FUNCTION public.trigger_parse_cv_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text := current_setting('app.settings.edge_function_url', true);
BEGIN
  -- If not set, default to production URL (since we deployed to mvycqvmojoqtfyvjsigv)
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    -- Check if we are running locally (usually localhost/kong)
    -- But since we can't easily detect, we will just use the production URL 
    -- if we are sure this is the prod DB. Or we can just set it directly.
    edge_function_url := 'https://mvycqvmojoqtfyvjsigv.supabase.co/functions/v1/parse-cv';
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
