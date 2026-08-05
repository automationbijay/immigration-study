-- Structured fields extracted from a parsed CV, and where that extraction got to.
--
-- parsed_data holds LlamaParse's markdown (the raw text). extracted_profile
-- holds the structured fields an LLM pulled out of that markdown, kept
-- separately so a re-extraction never destroys the source text.
ALTER TABLE public.cv_metadata
  ADD COLUMN IF NOT EXISTS extracted_profile jsonb,
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_error text,
  ADD COLUMN IF NOT EXISTS extracted_at timestamptz;

-- pending  : parsing not finished, or extraction not started
-- extracted: fields pulled out and written to extracted_profile
-- applied  : empty profile fields have been filled from the extraction
-- failed   : extraction attempted and errored; see extraction_error
ALTER TABLE public.cv_metadata
  DROP CONSTRAINT IF EXISTS cv_metadata_extraction_status_check;

ALTER TABLE public.cv_metadata
  ADD CONSTRAINT cv_metadata_extraction_status_check
  CHECK (extraction_status IN ('pending', 'extracted', 'applied', 'failed'));

CREATE INDEX IF NOT EXISTS cv_metadata_extraction_status_idx
  ON public.cv_metadata (extraction_status);
