-- Migration: Create ANZSCO tables for 2013 and 2022 versions
-- Source: Australian Bureau of Statistics (ABS)

CREATE TABLE IF NOT EXISTS scra_abs_anzsco_code_2013 (
    anzsco_code INTEGER PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS scra_abs_anzsco_code_2022 (
    anzsco_code INTEGER PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Add comments to tables for documentation within the database
COMMENT ON TABLE scra_abs_anzsco_code_2013 IS 'Scraped ANZSCO codes (2013 edition) from ABS';

COMMENT ON TABLE scra_abs_anzsco_code_2022 IS 'Scraped ANZSCO codes (2022 edition) from ABS';
