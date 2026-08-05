-- Fast, lightweight fuzzy search over ANZSCO occupation titles.
-- No AI, no vector embeddings: pure PostgreSQL trigram matching.
--
-- The searchable table is public.anzsco:
--   id uuid PK | occupation_code varchar | description varchar (the job title) | category varchar

-- 1. Extensions --------------------------------------------------------------
-- Supabase keeps extensions in the `extensions` schema, which is already on the
-- database search_path ("$user", public, extensions).
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- 2. Indexes -----------------------------------------------------------------
-- A single GIN trigram index accelerates all three access paths used below:
--   ILIKE '%term%'  (substring)
--   term <% column  (word_similarity - best matching word inside the title)
--   term %  column  (similarity - whole string)
CREATE INDEX IF NOT EXISTS anzsco_description_trgm_idx
    ON public.anzsco
    USING gin (description extensions.gin_trgm_ops);

-- Applicants often know their 6-digit ANZSCO code. Without an index on this
-- column the code OR-branch would drag the whole query into a sequential scan.
CREATE INDEX IF NOT EXISTS anzsco_occupation_code_trgm_idx
    ON public.anzsco
    USING gin (occupation_code extensions.gin_trgm_ops);

-- 3. Search function (RPC) ---------------------------------------------------
DROP FUNCTION IF EXISTS public.search_job_titles(text, float, integer);

CREATE OR REPLACE FUNCTION public.search_job_titles(
    search_term     text,
    match_threshold float   DEFAULT 0.3,
    match_count     integer DEFAULT 20
)
RETURNS TABLE (
    id               uuid,
    job_name         text,
    occupation_code  text,
    category         text,
    similarity_score real
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    term      text    := btrim(coalesce(search_term, ''));
    threshold real    := least(greatest(coalesce(match_threshold, 0.3)::real, 0.01), 1.0);
    lim       integer := greatest(coalesce(match_count, 20), 1);
    hits      integer;
BEGIN
    -- One character matches almost everything; don't scan the table for it.
    IF length(term) < 2 THEN
        RETURN;
    END IF;

    -- Phase 1 - literal match.
    -- Nearly every keystroke of a real search ("man", "manag", "manager") is a
    -- plain substring of the answer, and the GIN trigram index answers that in
    -- well under a millisecond. Doing this first also keeps results clean: a
    -- user who typed something valid gets literal matches, not fuzzy noise.
    RETURN QUERY
    SELECT m.id, m.job_name, m.occupation_code, m.category, m.similarity_score
    FROM (
        SELECT a.id,
               a.description::text     AS job_name,
               a.occupation_code::text AS occupation_code,
               a.category::text        AS category,
               greatest(
                   word_similarity(term, a.description),
                   similarity(term, a.description)
               )::real                               AS similarity_score,
               (lower(a.description) = lower(term)
                   OR a.occupation_code = term)      AS is_exact,
               (a.description ILIKE term || '%')     AS is_prefix,
               -- ANZSCO ships one canonical title per code plus alternative
               -- names and specialisations. At equal relevance the canonical
               -- one is the better thing to put in front of an applicant.
               CASE a.category
                   WHEN 'Principal Title'   THEN 1
                   WHEN 'Alternative Title' THEN 2
                   WHEN 'Specialisation'    THEN 3
                   ELSE 4  -- 'Occupation in nec category'
               END                                   AS category_rank,
               length(a.description)                 AS name_len
        FROM public.anzsco a
        WHERE a.description ILIKE '%' || term || '%'   -- title contains the term
           OR a.occupation_code ILIKE term || '%'      -- or it's an ANZSCO code
    ) m
    ORDER BY m.is_exact         DESC,   -- exact title or exact ANZSCO code first
             m.is_prefix        DESC,   -- then titles starting with the term
             m.category_rank    ASC,    -- then canonical titles over variants
             m.similarity_score DESC,   -- then relevance
             m.name_len         ASC,    -- shorter, cleaner titles first
             m.job_name         ASC     -- stable tie-break
    LIMIT lim;

    GET DIAGNOSTICS hits = ROW_COUNT;
    IF hits > 0 THEN
        RETURN;
    END IF;

    -- Phase 2 - fuzzy fallback.
    -- Nothing matched literally, so the input is very likely misspelled
    -- ("softwear develper", "acountant"). Only now do we pay for trigram
    -- similarity scoring, which is the expensive path.
    --
    -- The % and <% operators read their cut-off from these GUCs rather than
    -- from an argument. Setting them transaction-locally (third arg = true)
    -- honours the caller's match_threshold while still allowing an index scan -
    -- a plain `similarity(a, b) >= threshold` predicate cannot use the index.
    PERFORM set_config('pg_trgm.similarity_threshold',      threshold::text, true);
    PERFORM set_config('pg_trgm.word_similarity_threshold', threshold::text, true);

    RETURN QUERY
    SELECT m.id, m.job_name, m.occupation_code, m.category, m.similarity_score
    FROM (
        SELECT a.id,
               a.description::text     AS job_name,
               a.occupation_code::text AS occupation_code,
               a.category::text        AS category,
               -- word_similarity scores the term against the best-matching word
               -- inside the title, so "manager" scores 1.0 against "Engineering
               -- Manager". Plain similarity() would score ~0.35 there and drop
               -- most real matches below the threshold.
               greatest(
                   word_similarity(term, a.description),
                   similarity(term, a.description)
               )::real                               AS similarity_score,
               CASE a.category
                   WHEN 'Principal Title'   THEN 1
                   WHEN 'Alternative Title' THEN 2
                   WHEN 'Specialisation'    THEN 3
                   ELSE 4
               END                                   AS category_rank,
               length(a.description)                 AS name_len
        FROM public.anzsco a
        WHERE term <% a.description    -- fuzzy word match (handles typos)
           OR term %  a.description    -- fuzzy whole-title match
    ) m
    ORDER BY m.similarity_score DESC,
             m.category_rank    ASC,
             m.name_len         ASC,
             m.job_name         ASC
    LIMIT lim;
END;
$$;

COMMENT ON FUNCTION public.search_job_titles(text, float, integer) IS
    'Trigram search over ANZSCO occupation titles: literal substring/code match '
    'first, fuzzy typo-tolerant match as fallback. Ordered best match first. '
    'match_threshold applies to the fuzzy fallback - lower it (0.2) to be more '
    'forgiving, raise it (0.5) to be stricter.';

-- The function is SECURITY INVOKER, so the existing public-read RLS policy on
-- public.anzsco still governs which rows come back.
GRANT EXECUTE ON FUNCTION public.search_job_titles(text, float, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_job_titles(text, float, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_job_titles(text, float, integer) TO service_role;
