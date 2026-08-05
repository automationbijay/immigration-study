-- Dispatching parse-cv must never be able to fail a CV upload.
--
-- trigger_parse_cv_webhook() runs AFTER INSERT on cv_metadata, and its
-- net.http_post call sat bare in the insert's transaction. Any error out of
-- pg_net -- extension unhealthy, queue unavailable, permissions -- therefore
-- rolled the INSERT back, and upload-cv surfaced that to the user as a 500,
-- even though their file had already been written to storage.
--
-- Parsing is a follow-up step. The upload is the thing the user asked for, so a
-- dispatch failure is now caught, logged as a warning, and the row still lands.
-- Anything that fails to dispatch can be re-driven later against the stored row.
CREATE OR REPLACE FUNCTION public.trigger_parse_cv_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url text := coalesce(
    nullif(current_setting('app.settings.edge_function_url', true), ''),
    'https://mvycqvmojoqtfyvjsigv.supabase.co/functions/v1/parse-cv'
  );
BEGIN
  BEGIN
    PERFORM net.http_post(
      url     := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object(
        'type',   TG_OP,
        'table',  TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'parse-cv dispatch failed for cv_metadata %: % (%)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;
