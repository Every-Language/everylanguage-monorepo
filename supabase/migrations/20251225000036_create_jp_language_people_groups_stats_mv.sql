-- 20251225000036_create_jp_language_people_groups_stats_mv.sql
-- Create materialized view for aggregating people groups statistics by language (ROL3)
BEGIN;


-- Create materialized view that aggregates people groups data by ROL3
CREATE MATERIALIZED VIEW IF NOT EXISTS jp_language_people_groups_stats AS
SELECT
  rol3,
  -- Population aggregates
  COALESCE(SUM(population), 0)::BIGINT AS total_population,
  COALESCE(
    SUM(
      CASE
        WHEN least_reached = 'Y' THEN population
        ELSE 0
      END
    ),
    0
  )::BIGINT AS least_reached_population,
  COALESCE(
    SUM(
      CASE
        WHEN frontier = 'Y' THEN population
        ELSE 0
      END
    ),
    0
  )::BIGINT AS frontier_population,
  -- Counts
  COUNT(*)::INTEGER AS people_group_count,
  COUNT(DISTINCT iso3)::INTEGER AS country_count
FROM
  jp_people_groups_cache
WHERE
  rol3 IS NOT NULL
  AND population IS NOT NULL
GROUP BY
  rol3;


-- Create index on ROL3 for fast lookups
CREATE INDEX if NOT EXISTS idx_jp_language_pg_stats_rol3 ON jp_language_people_groups_stats (rol3);


-- Create unique index on ROL3 to ensure one row per language
CREATE UNIQUE INDEX if NOT EXISTS idx_jp_language_pg_stats_rol3_unique ON jp_language_people_groups_stats (rol3);


-- Add comment
comment ON materialized view jp_language_people_groups_stats IS 'Aggregated statistics from people groups cache, grouped by language (ROL3). Includes total population, least reached population, frontier population, and counts. Refresh after people groups sync completes.';


COMMIT;
