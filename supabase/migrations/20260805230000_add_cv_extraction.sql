-- Structured fields extracted from a parsed CV, and where that extraction got to.
--
-- parsed_data holds LlamaCloud's markdown (the raw text). extracted_profile
-- holds the structured fields the n8n workflow pulled out of that markdown,
-- kept separately so a re-run never destroys the source text.
ALTER TABLE public.cv_metadata
  ADD COLUMN IF NOT EXISTS extracted_profile jsonb,
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_error text,
  ADD COLUMN IF NOT EXISTS extracted_at timestamptz;

-- pending   : parsing not finished, or not yet dispatched
-- processing: handed to the n8n workflow, awaiting its write-back
-- extracted : n8n returned fields; stored in extracted_profile
-- applied   : empty profile fields have been filled from the extraction
-- failed    : dispatch or extraction errored; see extraction_error
ALTER TABLE public.cv_metadata
  DROP CONSTRAINT IF EXISTS cv_metadata_extraction_status_check;

ALTER TABLE public.cv_metadata
  ADD CONSTRAINT cv_metadata_extraction_status_check
  CHECK (extraction_status IN ('pending', 'processing', 'extracted', 'applied', 'failed'));

CREATE INDEX IF NOT EXISTS cv_metadata_extraction_status_idx
  ON public.cv_metadata (extraction_status);
