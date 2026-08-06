-- Fast, lightweight fuzzy search over Universities.
-- No AI, no vector embeddings: pure PostgreSQL trigram matching.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- Create GIN index on universities name for trigram operations
CREATE INDEX IF NOT EXISTS universities_name_trgm_idx
    ON public.universities
    USING gin (name extensions.gin_trgm_ops);

-- Drop function if exists
DROP FUNCTION IF EXISTS public.search_universities(text, float, integer);

CREATE OR REPLACE FUNCTION public.search_universities(
    search_term     text,
    match_threshold float   DEFAULT 0.3,
    match_count     integer DEFAULT 20
)
RETURNS TABLE (
    id               bigint,
    name             text,
    country          text,
    state_province   text,
    alpha_two_code   varchar(2),
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
    IF length(term) < 2 THEN
        RETURN;
    END IF;

    -- Phase 1 - literal match.
    RETURN QUERY
    SELECT m.id, m.name, m.country, m.state_province, m.alpha_two_code, m.similarity_score
    FROM (
        SELECT u.id,
               u.name,
               u.country,
               u.state_province,
               u.alpha_two_code,
               greatest(
                   word_similarity(term, u.name),
                   similarity(term, u.name)
               )::real                               AS similarity_score,
               (lower(u.name) = lower(term))         AS is_exact,
               (u.name ILIKE term || '%')            AS is_prefix,
               length(u.name)                        AS name_len
        FROM public.universities u
        WHERE u.name ILIKE '%' || term || '%'
    ) m
    ORDER BY m.is_exact         DESC,
             m.is_prefix        DESC,
             m.similarity_score DESC,
             m.name_len         ASC,
             m.name             ASC
    LIMIT lim;

    GET DIAGNOSTICS hits = ROW_COUNT;
    IF hits > 0 THEN
        RETURN;
    END IF;

    -- Phase 2 - fuzzy fallback.
    PERFORM set_config('pg_trgm.similarity_threshold',      threshold::text, true);
    PERFORM set_config('pg_trgm.word_similarity_threshold', threshold::text, true);

    RETURN QUERY
    SELECT m.id, m.name, m.country, m.state_province, m.alpha_two_code, m.similarity_score
    FROM (
        SELECT u.id,
               u.name,
               u.country,
               u.state_province,
               u.alpha_two_code,
               greatest(
                   word_similarity(term, u.name),
                   similarity(term, u.name)
               )::real                               AS similarity_score,
               length(u.name)                        AS name_len
        FROM public.universities u
        WHERE term <% u.name    -- fuzzy word match
           OR term %  u.name    -- fuzzy whole-title match
    ) m
    ORDER BY m.similarity_score DESC,
             m.name_len         ASC,
             m.name             ASC
    LIMIT lim;
END;
$$;

COMMENT ON FUNCTION public.search_universities(text, float, integer) IS
    'Trigram search over Universities: literal substring match first, fuzzy typo-tolerant match as fallback.';

GRANT EXECUTE ON FUNCTION public.search_universities(text, float, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_universities(text, float, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_universities(text, float, integer) TO service_role;
