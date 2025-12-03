-- 20251225000063_optimize_mv_language_stats.sql
-- Optimize mv_language_stats materialized view refresh performance
-- 
-- Changes:
-- 1. Add composite index on language_entity_sources for LATERAL join optimization
-- 2. Add functional indexes for case-insensitive joins
-- 3. Refactor grn_data CTE to eliminate inefficient OR-based joins
-- 4. Optimize language_base CTE (keep LATERAL but add DISTINCT ON for safety)
-- 5. Recreate materialized view with optimized CTEs
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


-- ============================================================
-- Step 1: Add Performance Indexes
-- ============================================================
-- Composite index optimized for LATERAL join queries in language_base CTE
CREATE INDEX if NOT EXISTS idx_language_entity_sources_lookup ON language_entity_sources (
  language_entity_id,
  external_id_type,
  is_external,
  deleted_at
)
WHERE
  is_external = TRUE
  AND deleted_at IS NULL;


-- Functional indexes for case-insensitive joins
CREATE INDEX if NOT EXISTS idx_grn_cache_iso639_lower ON grn_language_cache (LOWER(iso639_3))
WHERE
  iso639_3 IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_jp_cache_iso639_lower ON jp_language_cache (LOWER(iso639_3))
WHERE
  iso639_3 IS NOT NULL;


-- Index for ROLV code lookups in grn_language_cache
CREATE INDEX if NOT EXISTS idx_grn_cache_grn_language_id_text ON grn_language_cache ((grn_language_id::TEXT))
WHERE
  grn_language_id IS NOT NULL;


-- ============================================================
-- Step 2: Drop dependent objects (they will be recreated after MV)
-- ============================================================
-- Note: Dropping mv_language_stats with CASCADE will also drop:
-- - mv_region_stats (materialized view)
-- - mv_people_group_stats (materialized view)  
-- - All views that depend on these materialized views
-- These will need to be recreated by running their respective migrations:
-- - 20251225000050_create_mv_region_stats.sql
-- - 20251225000051_create_mv_people_group_stats.sql
-- - 20251225000052_create_relationship_views.sql
-- - 20251225000054_update_global_translation_statistics.sql
-- - etc.
-- Drop views that directly depend on mv_language_stats
-- These use CREATE OR REPLACE so they can be safely recreated
DROP VIEW if EXISTS vw_languages_in_region cascade;


DROP VIEW if EXISTS vw_languages_by_people_group cascade;


DROP VIEW if EXISTS global_translation_statistics cascade;


-- ============================================================
-- Step 3: Drop and recreate materialized view with optimizations
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_language_stats cascade;


CREATE MATERIALIZED VIEW mv_language_stats AS
WITH
  -- Optimized language_base CTE with DISTINCT ON for safety
  language_base AS (
    SELECT DISTINCT
      ON (le.id) le.id AS language_entity_id,
      le.name AS language_name,
      iso.external_id AS iso639_3,
      rolv.external_id AS rolv_code
    FROM
      language_entities le
      LEFT JOIN LATERAL (
        SELECT
          external_id
        FROM
          language_entity_sources
        WHERE
          language_entity_id = le.id
          AND external_id_type = 'iso-639-3'
          AND is_external = TRUE
          AND deleted_at IS NULL
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC
        LIMIT
          1
      ) iso ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          external_id
        FROM
          language_entity_sources
        WHERE
          language_entity_id = le.id
          AND external_id_type = 'rolv_code'
          AND is_external = TRUE
          AND deleted_at IS NULL
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC
        LIMIT
          1
      ) rolv ON TRUE
    WHERE
      le.deleted_at IS NULL
  ),
  -- JP language cache data
  jp_data AS (
    SELECT
      lb.language_entity_id,
      jp.bible_status,
      jp.bible_year,
      jp.nt_year,
      jp.portions_year,
      jp.has_audio_recordings AS jp_has_audio,
      jp.has_jesus_film,
      jp.hub_country,
      jp.jp_scale,
      jp.percent_adherents,
      jp.percent_evangelical,
      jp.primary_religion,
      jp.religion_code,
      jp.least_reached,
      jp.status,
      jp.country_code,
      jp.translation_need_questionable,
      jp.fcbh_url,
      jp.jf_url,
      jp.grn_url,
      jp.nbr_pgics,
      jp.nbr_countries
    FROM
      language_base lb
      LEFT JOIN jp_language_cache jp ON LOWER(jp.iso639_3) = LOWER(lb.iso639_3)
  ),
  -- Optimized GRN language cache data - split OR join into separate CTEs
  grn_data_iso639 AS (
    SELECT
      lb.language_entity_id,
      BOOL_OR(grn.has_recordings) AS grn_has_recordings
    FROM
      language_base lb
      INNER JOIN grn_language_cache grn ON LOWER(grn.iso639_3) = LOWER(lb.iso639_3)
    WHERE
      lb.iso639_3 IS NOT NULL
    GROUP BY
      lb.language_entity_id
  ),
  grn_data_rolv AS (
    SELECT
      lb.language_entity_id,
      BOOL_OR(grn.has_recordings) AS grn_has_recordings
    FROM
      language_base lb
      INNER JOIN grn_language_cache grn ON grn.grn_language_id::TEXT = lb.rolv_code
    WHERE
      lb.rolv_code IS NOT NULL
      AND lb.iso639_3 IS NULL -- Avoid duplicates when both exist
    GROUP BY
      lb.language_entity_id
  ),
  grn_data AS (
    SELECT
      language_entity_id,
      grn_has_recordings
    FROM
      grn_data_iso639
    UNION
    SELECT
      language_entity_id,
      grn_has_recordings
    FROM
      grn_data_rolv
  ),
  -- Aggregated people groups stats by ROL3
  people_groups_stats AS (
    SELECT
      LOWER(rol3) AS rol3,
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
      COUNT(*)::INTEGER AS people_group_count,
      COUNT(DISTINCT iso3)::INTEGER AS country_count
    FROM
      jp_people_groups_cache
    WHERE
      rol3 IS NOT NULL
      AND population IS NOT NULL
    GROUP BY
      LOWER(rol3)
  ),
  -- Bible translation overrides
  override_data AS (
    SELECT
      language_entity_id,
      MAX(
        CASE
          WHEN is_audio
          AND coverage = 'full_bible' THEN 1
          ELSE 0
        END
      ) AS has_full_audio_override,
      MAX(
        CASE
          WHEN is_audio
          AND coverage IN ('portions', 'ot', 'nt', 'full_bible') THEN 1
          ELSE 0
        END
      ) AS has_audio_portions_override,
      MAX(
        CASE
          WHEN is_text
          AND coverage IN ('portions', 'ot', 'nt', 'full_bible') THEN 1
          ELSE 0
        END
      ) AS has_text_portions_override
    FROM
      bible_translation_overrides
    WHERE
      deleted_at IS NULL
    GROUP BY
      language_entity_id
  ),
  -- Internal audio project progress
  internal_audio AS (
    SELECT
      COALESCE(
        av.language_entity_id,
        p.target_language_entity_id
      ) AS language_entity_id,
      BOOL_OR(avps.book_fraction = 1) AS has_complete_audio_version,
      BOOL_OR(avps.chapter_fraction > 0) AS has_audio_progress
    FROM
      audio_versions av
      JOIN projects p ON p.id = av.project_id
      AND p.deleted_at IS NULL
      JOIN audio_version_progress_summary avps ON avps.audio_version_id = av.id
    WHERE
      av.deleted_at IS NULL
    GROUP BY
      COALESCE(
        av.language_entity_id,
        p.target_language_entity_id
      )
  ),
  -- Internal text project progress
  internal_text AS (
    SELECT
      COALESCE(
        tv.language_entity_id,
        p.target_language_entity_id
      ) AS language_entity_id,
      BOOL_OR(tvps.book_fraction = 1) AS has_complete_text_version,
      BOOL_OR(tvps.chapter_fraction > 0) AS has_text_progress
    FROM
      text_versions tv
      JOIN projects p ON p.id = tv.project_id
      AND p.deleted_at IS NULL
      JOIN text_version_progress_summary tvps ON tvps.text_version_id = tv.id
    WHERE
      tv.deleted_at IS NULL
    GROUP BY
      COALESCE(
        tv.language_entity_id,
        p.target_language_entity_id
      )
  ),
  -- Combined internal projects
  internal_projects AS (
    SELECT
      COALESCE(ia.language_entity_id, it.language_entity_id) AS language_entity_id,
      COALESCE(ia.has_complete_audio_version, FALSE) AS has_complete_audio_version,
      COALESCE(ia.has_audio_progress, FALSE) AS has_audio_progress,
      COALESCE(it.has_complete_text_version, FALSE) AS has_complete_text_version,
      COALESCE(it.has_text_progress, FALSE) AS has_text_progress
    FROM
      internal_audio ia
      FULL OUTER JOIN internal_text it ON it.language_entity_id = ia.language_entity_id
  )
SELECT
  lb.language_entity_id,
  lb.language_name,
  lb.iso639_3,
  lb.rolv_code,
  -- Bible status fields (from unified_bible_translation_stats logic)
  jp.bible_status,
  COALESCE(
    (jp.bible_status = 5),
    internal.has_complete_audio_version,
    (override_data.has_full_audio_override = 1),
    FALSE
  ) AS has_full_audio_bible,
  COALESCE(
    (jp.bible_status >= 4),
    internal.has_complete_text_version,
    (
      override_data.has_text_portions_override = 1
      AND jp.bible_status IS NULL
    ),
    FALSE
  ) AS has_new_testament,
  COALESCE(
    (
      jp.bible_status IS NOT NULL
      AND jp.bible_status > 0
    ),
    internal.has_text_progress,
    (override_data.has_text_portions_override = 1),
    FALSE
  ) AS has_portions,
  COALESCE(
    (jp.bible_status = 5),
    internal.has_complete_text_version,
    FALSE
  ) AS has_whole_bible,
  -- Audio fields
  COALESCE(
    jp.jp_has_audio,
    grn_data.grn_has_recordings,
    internal.has_audio_progress,
    (override_data.has_audio_portions_override = 1),
    FALSE
  ) AS has_audio_recordings,
  COALESCE(
    jp.jp_has_audio,
    grn_data.grn_has_recordings,
    internal.has_audio_progress,
    (override_data.has_audio_portions_override = 1),
    FALSE
  ) AS has_audio_portions,
  -- Jesus Film
  COALESCE(jp.has_jesus_film, FALSE) AS has_jesus_film,
  -- People groups aggregated stats
  COALESCE(pg_stats.total_population, 0)::BIGINT AS population,
  COALESCE(pg_stats.least_reached_population, 0)::BIGINT AS least_reached_population,
  COALESCE(pg_stats.frontier_population, 0)::BIGINT AS frontier_population,
  COALESCE(pg_stats.people_group_count, 0)::INTEGER AS people_group_count,
  COALESCE(pg_stats.country_count, 0)::INTEGER AS country_count,
  -- JP language cache fields
  jp.hub_country,
  jp.jp_scale,
  jp.percent_adherents AS percent_christian,
  jp.percent_evangelical,
  jp.primary_religion,
  jp.religion_code,
  jp.least_reached,
  jp.status,
  jp.country_code,
  jp.translation_need_questionable,
  jp.bible_year,
  jp.nt_year,
  jp.portions_year,
  jp.fcbh_url,
  jp.jf_url,
  jp.grn_url,
  jp.nbr_pgics,
  jp.nbr_countries,
  -- Metadata
  NOW() AS computed_at
FROM
  language_base lb
  LEFT JOIN jp_data jp ON jp.language_entity_id = lb.language_entity_id
  LEFT JOIN grn_data ON grn_data.language_entity_id = lb.language_entity_id
  LEFT JOIN people_groups_stats pg_stats ON LOWER(pg_stats.rol3) = LOWER(lb.iso639_3)
  LEFT JOIN override_data ON override_data.language_entity_id = lb.language_entity_id
  LEFT JOIN internal_projects internal ON internal.language_entity_id = lb.language_entity_id;


-- ============================================================
-- Step 4: Recreate indexes on materialized view
-- ============================================================
-- Create unique index on language_entity_id (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX idx_mv_language_stats_language_entity_id ON mv_language_stats (language_entity_id);


-- Create indexes on commonly filtered fields
CREATE INDEX idx_mv_language_stats_iso639_3 ON mv_language_stats (iso639_3)
WHERE
  iso639_3 IS NOT NULL;


CREATE INDEX idx_mv_language_stats_rolv_code ON mv_language_stats (rolv_code)
WHERE
  rolv_code IS NOT NULL;


CREATE INDEX idx_mv_language_stats_bible_status ON mv_language_stats (bible_status)
WHERE
  bible_status IS NOT NULL;


CREATE INDEX idx_mv_language_stats_has_whole_bible ON mv_language_stats (has_whole_bible)
WHERE
  has_whole_bible = TRUE;


CREATE INDEX idx_mv_language_stats_has_new_testament ON mv_language_stats (has_new_testament)
WHERE
  has_new_testament = TRUE;


CREATE INDEX idx_mv_language_stats_has_audio_recordings ON mv_language_stats (has_audio_recordings)
WHERE
  has_audio_recordings = TRUE;


-- ============================================================
-- Step 5: Recreate views that directly depend on mv_language_stats
-- ============================================================
-- Recreate vw_languages_in_region view
CREATE OR REPLACE VIEW vw_languages_in_region AS
SELECT
  ler.region_id,
  ler.language_entity_id,
  le.name AS language_name,
  mls.iso639_3,
  mls.rolv_code,
  mls.population,
  mls.people_group_count,
  mls.country_count,
  mls.bible_status,
  mls.has_whole_bible,
  mls.has_new_testament,
  mls.has_portions,
  mls.has_audio_recordings,
  mls.has_jesus_film,
  mls.jp_scale,
  mls.percent_christian,
  mls.percent_evangelical,
  mls.primary_religion,
  mls.least_reached_population,
  mls.frontier_population,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source
FROM
  language_entities_regions ler
  JOIN language_entities le ON ler.language_entity_id = le.id
  JOIN regions r ON ler.region_id = r.id
  LEFT JOIN mv_language_stats mls ON mls.language_entity_id = ler.language_entity_id
WHERE
  r.level = 'country'
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_languages_in_region IS 'Languages spoken in a country, including stats from mv_language_stats. Filter by region_id.';


-- Recreate vw_languages_by_people_group view
CREATE OR REPLACE VIEW vw_languages_by_people_group AS
SELECT
  lepg.people_group_region_id,
  pgr.people_group_id,
  lepg.language_entity_id,
  le.name AS language_name,
  mls.iso639_3,
  mls.rolv_code,
  mls.population AS language_population,
  mls.people_group_count AS language_people_group_count,
  mls.country_count AS language_country_count,
  mls.bible_status,
  mls.has_whole_bible,
  mls.has_new_testament,
  mls.has_portions,
  mls.has_audio_recordings,
  mls.has_jesus_film,
  mls.jp_scale,
  mls.percent_christian,
  mls.percent_evangelical,
  mls.primary_religion,
  mls.least_reached_population,
  mls.frontier_population,
  lepg.is_primary
FROM
  language_entities_people_groups_regions lepg
  JOIN people_groups_regions pgr ON lepg.people_group_region_id = pgr.id
  JOIN language_entities le ON lepg.language_entity_id = le.id
  LEFT JOIN mv_language_stats mls ON mls.language_entity_id = lepg.language_entity_id
WHERE
  pgr.deleted_at IS NULL
  AND le.deleted_at IS NULL;


comment ON view vw_languages_by_people_group IS 'Languages spoken by a people group, including stats from mv_language_stats. Filter by people_group_id (via people_group_region_id).';


-- Recreate global_translation_statistics view
CREATE OR REPLACE VIEW global_translation_statistics AS
WITH
  bible_stats AS (
    SELECT
      COUNT(*)::BIGINT AS total_languages,
      SUM(
        CASE
          WHEN has_full_audio_bible THEN 1
          ELSE 0
        END
      )::BIGINT AS full_audio_bible_count,
      SUM(
        CASE
          WHEN has_audio_portions THEN 1
          ELSE 0
        END
      )::BIGINT AS audio_portions_count,
      SUM(
        CASE
          WHEN has_portions THEN 1
          ELSE 0
        END
      )::BIGINT AS text_portions_count
    FROM
      mv_language_stats
  ),
  project_completion AS (
    SELECT
      p.id,
      p.project_status,
      BOOL_OR(avps.book_fraction = 1) AS has_complete_audio,
      BOOL_OR(tvps.book_fraction = 1) AS has_complete_text
    FROM
      projects p
      LEFT JOIN audio_versions av ON av.project_id = p.id
      AND av.deleted_at IS NULL
      LEFT JOIN audio_version_progress_summary avps ON avps.audio_version_id = av.id
      LEFT JOIN text_versions tv ON tv.project_id = p.id
      AND tv.deleted_at IS NULL
      LEFT JOIN text_version_progress_summary tvps ON tvps.text_version_id = tv.id
    WHERE
      p.deleted_at IS NULL
    GROUP BY
      p.id,
      p.project_status
  ),
  internal_project_counts AS (
    SELECT
      COUNT(*) FILTER (
        WHERE
          project_status = 'active'
      )::BIGINT AS active_projects,
      COUNT(*) FILTER (
        WHERE
          project_status = 'completed'
          OR has_complete_audio
          OR has_complete_text
      )::BIGINT AS completed_projects
    FROM
      project_completion
  ),
  audio_chapter_totals AS (
    SELECT
      p.id AS project_id,
      MAX(avps.chapters_with_audio)::BIGINT AS chapters_completed
    FROM
      audio_versions av
      JOIN projects p ON p.id = av.project_id
      AND p.deleted_at IS NULL
      JOIN audio_version_progress_summary avps ON avps.audio_version_id = av.id
    WHERE
      av.deleted_at IS NULL
    GROUP BY
      p.id
  ),
  text_chapter_totals AS (
    SELECT
      p.id AS project_id,
      MAX(tvps.complete_chapters)::BIGINT AS chapters_completed
    FROM
      text_versions tv
      JOIN projects p ON p.id = tv.project_id
      AND p.deleted_at IS NULL
      JOIN text_version_progress_summary tvps ON tvps.text_version_id = tv.id
    WHERE
      tv.deleted_at IS NULL
    GROUP BY
      p.id
  ),
  internal_chapters AS (
    SELECT
      COALESCE(ac.project_id, tc.project_id) AS project_id,
      COALESCE(ac.chapters_completed, 0) + COALESCE(tc.chapters_completed, 0) AS chapters_completed
    FROM
      audio_chapter_totals ac
      FULL OUTER JOIN text_chapter_totals tc ON tc.project_id = ac.project_id
  ),
  internal_chapter_totals AS (
    SELECT
      COALESCE(SUM(chapters_completed), 0)::BIGINT AS total_chapters_completed
    FROM
      internal_chapters
  ),
  external_projects AS (
    SELECT
      COUNT(*) FILTER (
        WHERE
          is_active
          AND deleted_at IS NULL
      )::BIGINT AS active_external_projects,
      COUNT(*) FILTER (
        WHERE
          deleted_at IS NULL
          AND total_chapters > 0
          AND completed_chapters >= total_chapters
      )::BIGINT AS completed_external_projects,
      COALESCE(SUM(completed_chapters), 0)::BIGINT AS external_chapters_completed
    FROM
      external_projects_overrides
    WHERE
      deleted_at IS NULL
  )
SELECT
  bs.total_languages,
  bs.full_audio_bible_count,
  ROUND(
    bs.full_audio_bible_count::NUMERIC / NULLIF(bs.total_languages, 0) * 100,
    2
  ) AS full_audio_bible_percentage,
  bs.audio_portions_count,
  ROUND(
    bs.audio_portions_count::NUMERIC / NULLIF(bs.total_languages, 0) * 100,
    2
  ) AS audio_portions_percentage,
  bs.text_portions_count,
  ROUND(
    bs.text_portions_count::NUMERIC / NULLIF(bs.total_languages, 0) * 100,
    2
  ) AS text_portions_percentage,
  ipc.active_projects + ep.active_external_projects AS active_projects_total,
  ipc.completed_projects + ep.completed_external_projects AS completed_projects_total,
  ict.total_chapters_completed + ep.external_chapters_completed AS total_chapters_completed,
  NOW() AS generated_at
FROM
  bible_stats bs
  CROSS JOIN internal_project_counts ipc
  CROSS JOIN internal_chapter_totals ict
  CROSS JOIN external_projects ep;


comment ON view global_translation_statistics IS 'Aggregated translation and project metrics for frontend consumption. Includes bible translation statistics from mv_language_stats and project completion metrics.';


-- ============================================================
-- Step 6: Recreate dependent materialized views and views
-- ============================================================
-- Note: mv_region_stats and mv_people_group_stats were dropped by CASCADE
-- and need to be recreated since their migrations (00050, 00051) have already run
-- Recreate mv_region_stats (depends on mv_language_stats)
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
      jc.rog2 AS continent_code,
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
  GREATEST(COALESCE(jc.cache_population, 0), 0)::BIGINT AS population,
  GREATEST(
    COALESCE(jc.cache_people_group_count, 0),
    COALESCE(pgc.people_group_count, 0)
  )::INTEGER AS people_group_count,
  GREATEST(
    COALESCE(jc.cache_language_count, 0),
    COALESCE(lc.language_count, 0)
  )::INTEGER AS language_count,
  COALESCE(lbs.languages_no_scripture, 0)::INTEGER AS languages_no_scripture,
  COALESCE(lbs.languages_portions, 0)::INTEGER AS languages_portions,
  COALESCE(lbs.languages_new_testament, 0)::INTEGER AS languages_new_testament,
  COALESCE(lbs.languages_full_bible, 0)::INTEGER AS languages_full_bible,
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
  jc.jp_region_name,
  jc.continent_code,
  jc.window_status,
  jc.capital,
  jc.jp_country_name,
  jc.jpscale_ctry,
  jc.jpscale_text,
  jc.jpscale_image_url,
  jc.security_level,
  NOW() AS computed_at
FROM
  region_base rb
  LEFT JOIN jp_countries_data jc ON jc.region_id = rb.region_id
  LEFT JOIN people_groups_count pgc ON pgc.region_id = rb.region_id
  LEFT JOIN languages_count lc ON lc.region_id = rb.region_id
  LEFT JOIN language_bible_stats lbs ON lbs.region_id = rb.region_id;


CREATE UNIQUE INDEX idx_mv_region_stats_region_id ON mv_region_stats (region_id);


CREATE INDEX idx_mv_region_stats_iso3 ON mv_region_stats (iso3)
WHERE
  iso3 IS NOT NULL;


CREATE INDEX idx_mv_region_stats_iso2 ON mv_region_stats (iso2)
WHERE
  iso2 IS NOT NULL;


CREATE INDEX idx_mv_region_stats_rog3 ON mv_region_stats (rog3)
WHERE
  rog3 IS NOT NULL;


comment ON materialized view mv_region_stats IS 'Combined region (country) statistics from regions, jp_countries_cache, and aggregated language stats from mv_language_stats. Includes demographics, religious composition, language Bible status breakdowns, and JP fields.';


-- Recreate mv_people_group_stats (depends on mv_language_stats)
CREATE MATERIALIZED VIEW mv_people_group_stats AS
WITH
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
  cache_aggregated AS (
    SELECT
      people_id3,
      COALESCE(SUM(population), 0)::BIGINT AS population,
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
  countries_count AS (
    SELECT
      pgr.people_group_id,
      COUNT(DISTINCT pgr.region_id)::INTEGER AS country_count
    FROM
      people_groups_regions pgr
    GROUP BY
      pgr.people_group_id
  ),
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
  COALESCE(ca.population, 0)::BIGINT AS population,
  COALESCE(ca.language_count, 0)::INTEGER AS language_count,
  COALESCE(cc.country_count, 0)::INTEGER AS country_count,
  ca.primary_language_rol3,
  ca.primary_language_name,
  plbs.primary_language_bible_status,
  plbs.primary_language_has_whole_bible,
  plbs.primary_language_has_new_testament,
  plbs.primary_language_has_portions,
  ca.image_url,
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
  ca.peop_name_in_country,
  ca.peop_name_across_countries,
  ca.affinity_bloc,
  ca.people_cluster,
  NOW() AS computed_at
FROM
  people_group_base pgb
  LEFT JOIN cache_aggregated ca ON ca.people_id3 = pgb.people_id3
  LEFT JOIN countries_count cc ON cc.people_group_id = pgb.people_group_id
  LEFT JOIN primary_language_bible_status plbs ON plbs.people_group_id = pgb.people_group_id;


CREATE UNIQUE INDEX idx_mv_people_group_stats_people_group_id ON mv_people_group_stats (people_group_id);


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


comment ON materialized view mv_people_group_stats IS 'Combined people group statistics from people_groups, aggregated jp_people_groups_cache (by people_id3), and primary language Bible status from mv_language_stats. Includes demographics, status fields, Bible translation info, and media availability.';


-- Recreate remaining relationship views
CREATE OR REPLACE VIEW vw_people_groups_in_region AS
SELECT
  pgr.region_id,
  pgr.people_group_id,
  pg.name AS people_group_name,
  pg.people_id3,
  mpg.population,
  mpg.language_count,
  mpg.country_count,
  mpg.primary_language_rol3,
  mpg.primary_language_name,
  mpg.primary_language_bible_status,
  mpg.image_url,
  mpg.jpscale,
  mpg.least_reached,
  mpg.frontier,
  mpg.primary_religion,
  mpg.percent_evangelical,
  mpg.percent_christian_pc,
  mpg.bible_status,
  mpg.has_audio_recordings,
  mpg.has_jesus_film,
  pgr.longitude,
  pgr.latitude,
  pgr.location_point,
  pgr.peop_name_in_country,
  pgr.population AS instance_population
FROM
  people_groups_regions pgr
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_people_group_stats mpg ON mpg.people_group_id = pgr.people_group_id
WHERE
  r.level = 'country'
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_people_groups_in_region IS 'People groups in a country, including stats from mv_people_group_stats. Filter by region_id.';


CREATE OR REPLACE VIEW vw_people_groups_by_language AS
SELECT
  lepg.language_entity_id,
  pgr.people_group_id,
  pg.name AS people_group_name,
  pg.people_id3,
  pgr.region_id,
  r.name AS region_name,
  mpg.population,
  mpg.language_count,
  mpg.country_count,
  mpg.primary_language_rol3,
  mpg.primary_language_name,
  mpg.primary_language_bible_status,
  mpg.image_url,
  mpg.jpscale,
  mpg.least_reached,
  mpg.frontier,
  mpg.primary_religion,
  mpg.percent_evangelical,
  mpg.percent_christian_pc,
  mpg.bible_status,
  mpg.has_audio_recordings,
  mpg.has_jesus_film,
  pgr.longitude,
  pgr.latitude,
  pgr.location_point,
  pgr.peop_name_in_country,
  pgr.population AS instance_population,
  lepg.is_primary
FROM
  language_entities_people_groups_regions lepg
  JOIN people_groups_regions pgr ON lepg.people_group_region_id = pgr.id
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_people_group_stats mpg ON mpg.people_group_id = pgr.people_group_id
WHERE
  pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_people_groups_by_language IS 'People groups who speak a language, including stats from mv_people_group_stats. Filter by language_entity_id.';


CREATE OR REPLACE VIEW vw_regions_for_language AS
SELECT
  ler.language_entity_id,
  ler.region_id,
  r.name AS region_name,
  mrs.iso3,
  mrs.iso2,
  mrs.rog3,
  mrs.population AS region_population,
  mrs.people_group_count AS region_people_group_count,
  mrs.language_count AS region_language_count,
  mrs.languages_no_scripture,
  mrs.languages_portions,
  mrs.languages_new_testament,
  mrs.languages_full_bible,
  mrs.percent_christianity,
  mrs.percent_islam,
  mrs.percent_buddhism,
  mrs.percent_hinduism,
  mrs.percent_ethnic_religions,
  mrs.percent_non_religious,
  mrs.percent_other_small,
  mrs.window_status,
  mrs.jpscale_ctry,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source
FROM
  language_entities_regions ler
  JOIN language_entities le ON ler.language_entity_id = le.id
  JOIN regions r ON ler.region_id = r.id
  LEFT JOIN mv_region_stats mrs ON mrs.region_id = ler.region_id
WHERE
  r.level = 'country'
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_regions_for_language IS 'Countries where a language is spoken, including stats from mv_region_stats. Filter by language_entity_id.';


CREATE OR REPLACE VIEW vw_regions_for_people_group AS
SELECT
  pgr.people_group_id,
  pgr.region_id,
  r.name AS region_name,
  mrs.iso3,
  mrs.iso2,
  mrs.rog3,
  mrs.population AS region_population,
  mrs.people_group_count AS region_people_group_count,
  mrs.language_count AS region_language_count,
  mrs.languages_no_scripture,
  mrs.languages_portions,
  mrs.languages_new_testament,
  mrs.languages_full_bible,
  mrs.percent_christianity,
  mrs.percent_islam,
  mrs.percent_buddhism,
  mrs.percent_hinduism,
  mrs.percent_ethnic_religions,
  mrs.percent_non_religious,
  mrs.percent_other_small,
  mrs.window_status,
  mrs.jpscale_ctry,
  pgr.longitude,
  pgr.latitude,
  pgr.location_point,
  pgr.peop_name_in_country,
  pgr.population AS instance_population
FROM
  people_groups_regions pgr
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_region_stats mrs ON mrs.region_id = pgr.region_id
WHERE
  r.level = 'country'
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_regions_for_people_group IS 'Countries containing a people group, including stats from mv_region_stats. Filter by people_group_id.';


-- Recreate language_coordinates_for_map (depends on mv_language_stats)
CREATE MATERIALIZED VIEW language_coordinates_for_map AS
SELECT
  ler.language_entity_id,
  le.name AS language_name,
  ler.region_id,
  r.name AS region_name,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source,
  mls.has_full_audio_bible,
  mls.has_audio_portions,
  mls.has_portions AS has_text_portions,
  mls.bible_status,
  mls.has_jesus_film,
  mls.iso639_3,
  mls.rolv_code,
  mls.computed_at AS bible_stats_computed_at
FROM
  language_entities_regions ler
  INNER JOIN language_entities le ON ler.language_entity_id = le.id
  INNER JOIN regions r ON ler.region_id = r.id
  LEFT JOIN mv_language_stats mls ON ler.language_entity_id = mls.language_entity_id
WHERE
  ler.location IS NOT NULL
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


CREATE UNIQUE INDEX idx_language_coords_map_unique ON language_coordinates_for_map (language_entity_id, region_id);


CREATE INDEX idx_language_coords_map_location ON language_coordinates_for_map USING gist (location);


CREATE INDEX idx_language_coords_map_language_id ON language_coordinates_for_map (language_entity_id);


CREATE INDEX idx_language_coords_map_region_id ON language_coordinates_for_map (region_id);


CREATE INDEX idx_language_coords_map_location_source ON language_coordinates_for_map (location_source)
WHERE
  location_source IS NOT NULL;


comment ON materialized view language_coordinates_for_map IS 'Pre-joined language coordinates data optimized for map rendering. Includes language names, region names, locations, bible translation status with bible_status and has_jesus_film from mv_language_stats. Refreshed automatically after mv_language_stats refreshes.';


-- Recreate people_groups_coordinates_for_map (depends on mv_people_group_stats)
CREATE MATERIALIZED VIEW people_groups_coordinates_for_map AS
SELECT
  pgr.people_group_id,
  pg.name AS people_group_name,
  pgr.region_id,
  r.name AS region_name,
  pgr.location_point,
  st_x (pgr.location_point) AS longitude,
  st_y (pgr.location_point) AS latitude,
  pgr.peop_name_in_country,
  mpg.population,
  mpg.language_count,
  mpg.country_count,
  mpg.primary_language_rol3,
  mpg.primary_language_name,
  mpg.primary_language_bible_status,
  mpg.image_url,
  mpg.jpscale,
  mpg.least_reached,
  mpg.frontier,
  mpg.primary_religion,
  mpg.percent_evangelical,
  mpg.percent_christian_pc,
  mpg.bible_status,
  mpg.has_audio_recordings,
  mpg.has_jesus_film,
  mpg.computed_at AS stats_computed_at
FROM
  people_groups_regions pgr
  INNER JOIN people_groups pg ON pgr.people_group_id = pg.id
  INNER JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_people_group_stats mpg ON pgr.people_group_id = mpg.people_group_id
WHERE
  pgr.location_point IS NOT NULL
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


CREATE UNIQUE INDEX idx_people_groups_coords_map_unique ON people_groups_coordinates_for_map (people_group_id, region_id);


CREATE INDEX idx_people_groups_coords_map_location ON people_groups_coordinates_for_map USING gist (location_point);


CREATE INDEX idx_people_groups_coords_map_people_group_id ON people_groups_coordinates_for_map (people_group_id);


CREATE INDEX idx_people_groups_coords_map_region_id ON people_groups_coordinates_for_map (region_id);


comment ON materialized view people_groups_coordinates_for_map IS 'Pre-joined people group coordinates data optimized for map rendering. Includes people group names, region names, locations, and stats from mv_people_group_stats.';


-- ============================================================
-- Step 7: Update comments
-- ============================================================
comment ON materialized view mv_language_stats IS 'Combined language statistics from language_entities, cache tables (jp_language_cache, grn_language_cache), aggregated people groups stats, bible translation overrides, and internal project progress. Includes Bible status, audio recordings, Jesus Film, population stats, and JP fields. Optimized with composite indexes and refactored CTEs for better refresh performance.';


-- Reset statement timeout
RESET statement_timeout;


COMMIT;
