-- 20251225000019_add_jp_cache_fields.sql
-- Add missing fields from Joshua Project API to jp_language_cache table
-- 
-- NOTE: After applying this migration, regenerate TypeScript types by running:
-- npm run db:generate-types
BEGIN;


-- Add new columns
ALTER TABLE jp_language_cache
ADD COLUMN status TEXT,
ADD COLUMN country_code TEXT,
ADD COLUMN hub_country TEXT,
ADD COLUMN translation_need_questionable BOOLEAN,
ADD COLUMN percent_adherents DECIMAL(5, 2),
ADD COLUMN percent_evangelical DECIMAL(5, 2),
ADD COLUMN has_jesus_film BOOLEAN,
ADD COLUMN jf_url TEXT,
ADD COLUMN jp_scale INTEGER,
ADD COLUMN least_reached BOOLEAN,
ADD COLUMN religion_code TEXT,
ADD COLUMN primary_religion TEXT,
ADD COLUMN fcbh_url TEXT,
ADD COLUMN nbr_pgics INTEGER,
ADD COLUMN nbr_countries INTEGER;


-- Add indexes for commonly queried fields
CREATE INDEX idx_jp_cache_country_code ON jp_language_cache (country_code)
WHERE
  country_code IS NOT NULL;


CREATE INDEX idx_jp_cache_jp_scale ON jp_language_cache (jp_scale)
WHERE
  jp_scale IS NOT NULL;


CREATE INDEX idx_jp_cache_least_reached ON jp_language_cache (least_reached)
WHERE
  least_reached = TRUE;


COMMIT;
