-- 20251225000051_create_mv_people_group_stats.sql
-- Create materialized view that combines people_groups with jp_people_groups_cache and primary language Bible status
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


CREATE MATERIALIZED VIEW mv_people_group_stats AS
WITH
  -- Base people groups
  people_group_base AS (
    SELECT
      pg.id AS people_group_id,
      pg.people_id3,
      pg.name
    FROM
      people_groups pg
    WHERE
      pg.deleted_at IS NULL
  ),
  -- Aggregate cache data by people_id3 (multiple instances per people group)
  cache_aggregated AS (
    SELECT
      people_id3,
      -- Aggregate population (sum across instances)
      COALESCE(SUM(population), 0)::BIGINT AS population,
      -- Take first non-null value for fields that should be consistent
      MAX(number_languages_spoken)::INTEGER AS language_count,
      MAX(primary_language_name) AS primary_language_name,
      MAX(rol3) AS primary_language_rol3,
      MAX(image_url) AS image_url,
      MAX(jpscale)::INTEGER AS jpscale,
      MAX(least_reached) AS least_reached,
      MAX(frontier) AS frontier,
      MAX(primary_religion) AS primary_religion,
      MAX(rlg3) AS rlg3,
      MAX(pc_evangelical) AS percent_evangelical,
      MAX(pc_christian_pc) AS percent_christian_pc,
      MAX(pc_christian_pd) AS percent_christian_pd,
      MAX(bible_status)::INTEGER AS bible_status,
      MAX(bible_year) AS bible_year,
      MAX(nt_year) AS nt_year,
      MAX(portions_year) AS portions_year,
      MAX(has_audio_recordings) AS has_audio_recordings,
      MAX(has_jesus_film) AS has_jesus_film,
      MAX(jf) AS jf,
      MAX(grn) AS grn,
      MAX(peop_name_in_country) AS peop_name_in_country,
      MAX(peop_name_across_countries) AS peop_name_across_countries,
      MAX(affinity_bloc) AS affinity_bloc,
      MAX(people_cluster) AS people_cluster
    FROM
      jp_people_groups_cache
    WHERE
      people_id3 IS NOT NULL
    GROUP BY
      people_id3
  ),
  -- Count countries from junction table
  countries_count AS (
    SELECT
      pgr.people_group_id,
      COUNT(DISTINCT pgr.region_id)::INTEGER AS country_count
    FROM
      people_groups_regions pgr
    GROUP BY
      pgr.people_group_id
  ),
  -- Get primary language Bible status from mv_language_stats
  -- Use language_entities_people_groups_regions to find primary language for each people group
  primary_language_bible_status AS (
    SELECT DISTINCT
      ON (pgr.people_group_id) pgr.people_group_id,
      mls.bible_status AS primary_language_bible_status,
      mls.has_whole_bible AS primary_language_has_whole_bible,
      mls.has_new_testament AS primary_language_has_new_testament,
      mls.has_portions AS primary_language_has_portions
    FROM
      people_groups_regions pgr
      JOIN language_entities_people_groups_regions lepgr ON lepgr.people_group_region_id = pgr.id
      LEFT JOIN mv_language_stats mls ON mls.language_entity_id = lepgr.language_entity_id
    WHERE
      lepgr.is_primary = TRUE
      AND pgr.deleted_at IS NULL
    ORDER BY
      pgr.people_group_id,
      lepgr.is_primary DESC NULLS LAST
  )
SELECT
  pgb.people_group_id,
  pgb.people_id3,
  pgb.name,
  -- Demographics
  COALESCE(ca.population, 0)::BIGINT AS population,
  COALESCE(ca.language_count, 0)::INTEGER AS language_count,
  COALESCE(cc.country_count, 0)::INTEGER AS country_count,
  -- Primary language info
  ca.primary_language_rol3,
  ca.primary_language_name,
  plbs.primary_language_bible_status,
  plbs.primary_language_has_whole_bible,
  plbs.primary_language_has_new_testament,
  plbs.primary_language_has_portions,
  -- Media
  ca.image_url,
  -- Status fields
  ca.jpscale,
  CASE
    WHEN ca.least_reached = 'Y' THEN TRUE
    ELSE FALSE
  END AS least_reached,
  CASE
    WHEN ca.frontier = 'Y' THEN TRUE
    ELSE FALSE
  END AS frontier,
  ca.primary_religion,
  ca.rlg3,
  ca.percent_evangelical,
  ca.percent_christian_pc,
  ca.percent_christian_pd,
  -- Bible/Translation
  ca.bible_status,
  ca.bible_year,
  ca.nt_year,
  ca.portions_year,
  CASE
    WHEN ca.has_audio_recordings = 'Y' THEN TRUE
    ELSE FALSE
  END AS has_audio_recordings,
  CASE
    WHEN ca.has_jesus_film = 'Y' THEN TRUE
    ELSE FALSE
  END AS has_jesus_film,
  CASE
    WHEN ca.jf = 'Y' THEN TRUE
    ELSE FALSE
  END AS jf,
  CASE
    WHEN ca.grn = 'Y' THEN TRUE
    ELSE FALSE
  END AS grn,
  -- Names
  ca.peop_name_in_country,
  ca.peop_name_across_countries,
  -- Classification
  ca.affinity_bloc,
  ca.people_cluster,
  -- Metadata
  NOW() AS computed_at
FROM
  people_group_base pgb
  LEFT JOIN cache_aggregated ca ON ca.people_id3 = pgb.people_id3
  LEFT JOIN countries_count cc ON cc.people_group_id = pgb.people_group_id
  LEFT JOIN primary_language_bible_status plbs ON plbs.people_group_id = pgb.people_group_id;


-- Create unique index on people_group_id (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX idx_mv_people_group_stats_people_group_id ON mv_people_group_stats (people_group_id);


-- Create indexes on commonly filtered fields
CREATE INDEX idx_mv_people_group_stats_people_id3 ON mv_people_group_stats (people_id3)
WHERE
  people_id3 IS NOT NULL;


CREATE INDEX idx_mv_people_group_stats_primary_language_rol3 ON mv_people_group_stats (primary_language_rol3)
WHERE
  primary_language_rol3 IS NOT NULL;


CREATE INDEX idx_mv_people_group_stats_least_reached ON mv_people_group_stats (least_reached)
WHERE
  least_reached = TRUE;


CREATE INDEX idx_mv_people_group_stats_frontier ON mv_people_group_stats (frontier)
WHERE
  frontier = TRUE;


-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_mv_people_group_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_people_group_stats;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh mv_people_group_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


comment ON materialized view mv_people_group_stats IS 'Combined people group statistics from people_groups, aggregated jp_people_groups_cache (by people_id3), and primary language Bible status from mv_language_stats. Includes demographics, status fields, Bible translation info, and media availability.';


comment ON function refresh_mv_people_group_stats () IS 'Refreshes mv_people_group_stats materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- Reset statement timeout
RESET statement_timeout;


COMMIT;
