-- 20251225000050_create_mv_region_stats.sql
-- Create materialized view that combines regions (countries) with jp_countries_cache and aggregated language stats
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


CREATE MATERIALIZED VIEW mv_region_stats AS
WITH
  -- Base regions (countries only)
  region_base AS (
    SELECT
      r.id AS region_id,
      r.name AS region_name,
      iso3.external_id AS iso3,
      iso2.external_id AS iso2,
      fips.external_id AS rog3
    FROM
      regions r
      LEFT JOIN LATERAL (
        SELECT
          external_id
        FROM
          region_sources
        WHERE
          region_id = r.id
          AND external_id_type = 'iso3166-1-alpha3'
          AND is_external = TRUE
          AND deleted_at IS NULL
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC
        LIMIT
          1
      ) iso3 ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          external_id
        FROM
          region_sources
        WHERE
          region_id = r.id
          AND external_id_type = 'iso3166-1-alpha2'
          AND is_external = TRUE
          AND deleted_at IS NULL
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC
        LIMIT
          1
      ) iso2 ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          external_id
        FROM
          region_sources
        WHERE
          region_id = r.id
          AND external_id_type IN ('fips-10-4', 'fips', 'fips-10')
          AND is_external = TRUE
          AND deleted_at IS NULL
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC
        LIMIT
          1
      ) fips ON TRUE
    WHERE
      r.level = 'country'
      AND r.deleted_at IS NULL
  ),
  -- Match regions to JP countries cache
  jp_countries_data AS (
    SELECT
      rb.region_id,
      jc.population AS cache_population,
      jc.cnt_peoples AS cache_people_group_count,
      jc.cnt_primary_languages AS cache_language_count,
      jc.percent_christianity,
      jc.percent_islam,
      jc.percent_buddhism,
      jc.percent_hinduism,
      jc.percent_ethnic_religions,
      jc.percent_non_religious,
      jc.percent_other_small,
      jc.religion_primary,
      jc.rlg3_primary,
      jc.region_code,
      jc.region_name AS jp_region_name,
      jc.rog2 AS continent_code, -- rog2 is continent code in jp_countries_cache
      jc.window_1040 AS window_status,
      jc.jpscale_ctry,
      jc.jpscale_text,
      jc.jpscale_image_url,
      jc.security_level,
      jc.capital,
      jc.ctry AS jp_country_name
    FROM
      region_base rb
      LEFT JOIN jp_countries_cache jc ON (
        (
          rb.rog3 IS NOT NULL
          AND UPPER(jc.rog3) = UPPER(rb.rog3)
        )
        OR (
          rb.iso3 IS NOT NULL
          AND UPPER(jc.iso3) = UPPER(rb.iso3)
        )
        OR (
          rb.iso2 IS NOT NULL
          AND UPPER(jc.iso2) = UPPER(rb.iso2)
        )
      )
      AND jc.deleted_at IS NULL
  ),
  -- Count people groups from junction table
  people_groups_count AS (
    SELECT
      pgr.region_id,
      COUNT(DISTINCT pgr.people_group_id)::INTEGER AS people_group_count
    FROM
      people_groups_regions pgr
      JOIN regions r ON r.id = pgr.region_id
    WHERE
      r.level = 'country'
      AND r.deleted_at IS NULL
    GROUP BY
      pgr.region_id
  ),
  -- Count languages from junction table
  languages_count AS (
    SELECT
      ler.region_id,
      COUNT(DISTINCT ler.language_entity_id)::INTEGER AS language_count
    FROM
      language_entities_regions ler
      JOIN regions r ON r.id = ler.region_id
    WHERE
      r.level = 'country'
      AND r.deleted_at IS NULL
      AND ler.deleted_at IS NULL
    GROUP BY
      ler.region_id
  ),
  -- Aggregate language Bible status stats from language_entities_regions
  -- Note: This will be calculated after mv_language_stats exists, but we reference it via JOIN
  -- If mv_language_stats doesn't exist yet, these will be NULL/0
  language_bible_stats AS (
    SELECT
      ler.region_id,
      COUNT(*) FILTER (
        WHERE
          mls.bible_status IS NULL
          OR mls.bible_status = 0
      )::INTEGER AS languages_no_scripture,
      COUNT(*) FILTER (
        WHERE
          mls.bible_status >= 1
          AND mls.bible_status < 4
      )::INTEGER AS languages_portions,
      COUNT(*) FILTER (
        WHERE
          mls.bible_status >= 4
          AND mls.bible_status < 5
      )::INTEGER AS languages_new_testament,
      COUNT(*) FILTER (
        WHERE
          mls.bible_status = 5
      )::INTEGER AS languages_full_bible
    FROM
      language_entities_regions ler
      JOIN regions r ON r.id = ler.region_id
      LEFT JOIN mv_language_stats mls ON mls.language_entity_id = ler.language_entity_id
    WHERE
      r.level = 'country'
      AND r.deleted_at IS NULL
      AND ler.deleted_at IS NULL
    GROUP BY
      ler.region_id
  )
SELECT
  rb.region_id,
  rb.region_name,
  rb.iso3,
  rb.iso2,
  rb.rog3,
  -- Demographics - use GREATEST of cache vs junction table counts
  GREATEST(COALESCE(jc.cache_population, 0), 0)::BIGINT AS population,
  GREATEST(
    COALESCE(jc.cache_people_group_count, 0),
    COALESCE(pgc.people_group_count, 0)
  )::INTEGER AS people_group_count,
  GREATEST(
    COALESCE(jc.cache_language_count, 0),
    COALESCE(lc.language_count, 0)
  )::INTEGER AS language_count,
  -- Language Bible status stats
  COALESCE(lbs.languages_no_scripture, 0)::INTEGER AS languages_no_scripture,
  COALESCE(lbs.languages_portions, 0)::INTEGER AS languages_portions,
  COALESCE(lbs.languages_new_testament, 0)::INTEGER AS languages_new_testament,
  COALESCE(lbs.languages_full_bible, 0)::INTEGER AS languages_full_bible,
  -- Religious composition
  jc.percent_christianity,
  jc.percent_islam,
  jc.percent_buddhism,
  jc.percent_hinduism,
  jc.percent_ethnic_religions,
  jc.percent_non_religious,
  jc.percent_other_small,
  jc.religion_primary,
  jc.rlg3_primary,
  -- Geographic fields
  jc.region_code,
  jc.jp_region_name,
  jc.continent_code,
  jc.window_status,
  jc.capital,
  jc.jp_country_name,
  -- JP Scale
  jc.jpscale_ctry,
  jc.jpscale_text,
  jc.jpscale_image_url,
  -- Other
  jc.security_level,
  -- Metadata
  NOW() AS computed_at
FROM
  region_base rb
  LEFT JOIN jp_countries_data jc ON jc.region_id = rb.region_id
  LEFT JOIN people_groups_count pgc ON pgc.region_id = rb.region_id
  LEFT JOIN languages_count lc ON lc.region_id = rb.region_id
  LEFT JOIN language_bible_stats lbs ON lbs.region_id = rb.region_id;


-- Create unique index on region_id (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX idx_mv_region_stats_region_id ON mv_region_stats (region_id);


-- Create indexes on commonly filtered fields
CREATE INDEX idx_mv_region_stats_iso3 ON mv_region_stats (iso3)
WHERE
  iso3 IS NOT NULL;


CREATE INDEX idx_mv_region_stats_iso2 ON mv_region_stats (iso2)
WHERE
  iso2 IS NOT NULL;


CREATE INDEX idx_mv_region_stats_rog3 ON mv_region_stats (rog3)
WHERE
  rog3 IS NOT NULL;


-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_mv_region_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_region_stats;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh mv_region_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


comment ON materialized view mv_region_stats IS 'Combined region (country) statistics from regions, jp_countries_cache, and aggregated language stats from mv_language_stats. Includes demographics, religious composition, language Bible status breakdowns, and JP fields.';


comment ON function refresh_mv_region_stats () IS 'Refreshes mv_region_stats materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- Reset statement timeout
RESET statement_timeout;


COMMIT;
