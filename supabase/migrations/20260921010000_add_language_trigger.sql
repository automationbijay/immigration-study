-- 1. Add columns to store the classification and points on each test table
ALTER TABLE public.test_ielts ADD COLUMN IF NOT EXISTS classification VARCHAR(50);
ALTER TABLE public.test_ielts ADD COLUMN IF NOT EXISTS pr_points INT DEFAULT 0;

ALTER TABLE public.test_toefl ADD COLUMN IF NOT EXISTS classification VARCHAR(50);
ALTER TABLE public.test_toefl ADD COLUMN IF NOT EXISTS pr_points INT DEFAULT 0;

ALTER TABLE public.test_pte ADD COLUMN IF NOT EXISTS classification VARCHAR(50);
ALTER TABLE public.test_pte ADD COLUMN IF NOT EXISTS pr_points INT DEFAULT 0;

ALTER TABLE public.test_cambridge ADD COLUMN IF NOT EXISTS classification VARCHAR(50);
ALTER TABLE public.test_cambridge ADD COLUMN IF NOT EXISTS pr_points INT DEFAULT 0;

ALTER TABLE public.test_oet ADD COLUMN IF NOT EXISTS classification VARCHAR(50);
ALTER TABLE public.test_oet ADD COLUMN IF NOT EXISTS pr_points INT DEFAULT 0;

-- 2. Create the unified Trigger Function
CREATE OR REPLACE FUNCTION public.update_language_classification()
RETURNS trigger AS $$
DECLARE
    v_test_name VARCHAR(100);
    r RECORD;
    req_l NUMERIC;
    req_r NUMERIC;
    req_w NUMERIC;
    req_s NUMERIC;
    best_class VARCHAR(50) := 'Below Competent';
    max_pts INT := 0;
    pts INT;
BEGIN
    -- Determine the test name based on the table name that fired the trigger
    IF TG_TABLE_NAME = 'test_ielts' THEN v_test_name := 'IELTS';
    ELSIF TG_TABLE_NAME = 'test_toefl' THEN v_test_name := 'TOEFL iBT';
    ELSIF TG_TABLE_NAME = 'test_pte' THEN v_test_name := 'PTE Academic';
    ELSIF TG_TABLE_NAME = 'test_cambridge' THEN v_test_name := 'Cambridge (CAE)';
    ELSIF TG_TABLE_NAME = 'test_oet' THEN v_test_name := 'Occupational English Test (OET)';
    ELSE RETURN NEW;
    END IF;

    -- Evaluate rules from the classification table
    FOR r IN 
        SELECT * FROM public.aus_language_classification 
        WHERE test_name ILIKE v_test_name 
        AND listening_score != 'N/A'
    LOOP
        -- Safely cast the required scores
        BEGIN
            req_l := CAST(r.listening_score AS NUMERIC);
            req_r := CAST(r.reading_score AS NUMERIC);
            req_w := CAST(r.writing_score AS NUMERIC);
            req_s := CAST(r.speaking_score AS NUMERIC);
        EXCEPTION WHEN OTHERS THEN
            CONTINUE; -- Skip if cast fails
        END;

        -- Check if user meets the requirements
        IF NEW.listening >= req_l AND NEW.reading >= req_r AND NEW.writing >= req_w AND NEW.speaking >= req_s THEN
            
            -- Map points based on classification string
            IF r.classification = 'Superior English' THEN pts := 20;
            ELSIF r.classification = 'Proficient English' THEN pts := 10;
            ELSIF r.classification = 'Competent English' THEN pts := 0;
            ELSE pts := 0;
            END IF;
            
            -- Keep the highest points
            IF pts >= max_pts THEN
                max_pts := pts;
                best_class := r.classification;
            END IF;
        END IF;
    END LOOP;

    -- Set the calculated values directly onto the row being inserted/updated
    NEW.classification := best_class;
    NEW.pr_points := max_pts;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to all test tables
-- Drop them first to make this script idempotent
DROP TRIGGER IF EXISTS trigger_calculate_ielts ON public.test_ielts;
CREATE TRIGGER trigger_calculate_ielts
BEFORE INSERT OR UPDATE OF listening, reading, writing, speaking ON public.test_ielts
FOR EACH ROW EXECUTE FUNCTION public.update_language_classification();

DROP TRIGGER IF EXISTS trigger_calculate_toefl ON public.test_toefl;
CREATE TRIGGER trigger_calculate_toefl
BEFORE INSERT OR UPDATE OF listening, reading, writing, speaking ON public.test_toefl
FOR EACH ROW EXECUTE FUNCTION public.update_language_classification();

DROP TRIGGER IF EXISTS trigger_calculate_pte ON public.test_pte;
CREATE TRIGGER trigger_calculate_pte
BEFORE INSERT OR UPDATE OF listening, reading, writing, speaking ON public.test_pte
FOR EACH ROW EXECUTE FUNCTION public.update_language_classification();

DROP TRIGGER IF EXISTS trigger_calculate_cambridge ON public.test_cambridge;
CREATE TRIGGER trigger_calculate_cambridge
BEFORE INSERT OR UPDATE OF listening, reading, writing, speaking ON public.test_cambridge
FOR EACH ROW EXECUTE FUNCTION public.update_language_classification();

DROP TRIGGER IF EXISTS trigger_calculate_oet ON public.test_oet;
CREATE TRIGGER trigger_calculate_oet
BEFORE INSERT OR UPDATE OF listening, reading, writing, speaking ON public.test_oet
FOR EACH ROW EXECUTE FUNCTION public.update_language_classification();
