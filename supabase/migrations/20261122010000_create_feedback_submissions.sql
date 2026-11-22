-- Submissions from the "Report a mistake" and "Collaborate with us" forms on the
-- homepage and Contact page.
--
-- Anyone (signed in or not) may INSERT. Nobody may SELECT, UPDATE or DELETE
-- through the API: submissions are read in the Supabase dashboard (or with the
-- service role), so one visitor can never see another visitor's message.

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('mistake', 'collaborate')),
  category text CHECK (char_length(category) <= 80),
  name text CHECK (char_length(name) <= 120),
  email text CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  organisation text CHECK (char_length(organisation) <= 160),
  page_url text CHECK (char_length(page_url) <= 500),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  -- A collaboration request is useless without a way to reply.
  CONSTRAINT collaborate_needs_contact CHECK (kind <> 'collaborate' OR (name IS NOT NULL AND email IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS feedback_submissions_created_at_idx ON public.feedback_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_submissions_status_idx ON public.feedback_submissions (status);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_submissions;
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    -- Signed-in users can only attach their own id; visitors attach none.
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
  );

REVOKE ALL ON public.feedback_submissions FROM anon, authenticated;
GRANT INSERT ON public.feedback_submissions TO anon, authenticated;

COMMENT ON TABLE public.feedback_submissions IS
  'Mistake reports and collaboration/contact requests from the public site. Insert-only for clients; review in the dashboard.';
