-- Rename stats materialized views: mv_language_stats -> language_stats, mv_region_stats -> region_stats, mv_people_groups_stats -> people_groups_stats
-- Migration: 20251226000060_rename_stats_materialized_views.sql
-- Strategy: Update dependent objects first, then drop/recreate MVs to avoid unintended CASCADE drops
BEGIN;


-- Increase statement timeout for materialized view operations
SET
  local statement_timeout = '300s';


-- ============================================================================
-- STEP 1: Drop views that depend on old stats MVs (will be recreated after MVs)
-- ============================================================================
-- Drop views first so we can recreate them after the new MVs exist
DROP VIEW if EXISTS vw_languages_in_region cascade;


DROP VIEW if EXISTS vw_languages_by_people_group cascade;


DROP VIEW if EXISTS vw_regions_for_language cascade;


DROP VIEW if EXISTS vw_regions_for_people_group cascade;


DROP VIEW if EXISTS vw_people_groups_in_region cascade;


DROP VIEW if EXISTS vw_people_groups_by_language cascade;


DROP VIEW if EXISTS global_translation_statistics cascade;


-- ============================================================================
-- STEP 2: Drop old MVs and create new MVs (in dependency order)
-- ============================================================================
-- Order matters: language_stats must be created first, then region_stats and people_groups_stats
-- Drop mv_language_stats (will CASCADE drop mv_region_stats, mv_people_groups_stats, language_coordinates_for_map)
DROP MATERIALIZED VIEW IF EXISTS mv_language_stats cascade;


-- Create language_stats MV (exact copy of mv_language_stats definition)
CREATE MATERIALIZED VIEW language_stats AS
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
      BOOL_OR(avp.book_fraction = 1) AS has_complete_audio_version,
      BOOL_OR(avp.chapter_fraction > 0) AS has_audio_progress
    FROM
      audio_versions av
      JOIN projects p ON p.id = av.project_id
      AND p.deleted_at IS NULL
      JOIN audio_version_progress avp ON avp.audio_version_id = av.id
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
      BOOL_OR(tvp.book_fraction = 1) AS has_complete_text_version,
      BOOL_OR(tvp.chapter_fraction > 0) AS has_text_progress
    FROM
      text_versions tv
      JOIN projects p ON p.id = tv.project_id
      AND p.deleted_at IS NULL
      JOIN text_version_progress tvp ON tvp.text_version_id = tv.id
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


-- Create indexes on language_stats
CREATE UNIQUE INDEX idx_language_stats_language_entity_id ON language_stats (language_entity_id);


CREATE INDEX idx_language_stats_iso639_3 ON language_stats (iso639_3)
WHERE
  iso639_3 IS NOT NULL;


CREATE INDEX idx_language_stats_rolv_code ON language_stats (rolv_code)
WHERE
  rolv_code IS NOT NULL;


CREATE INDEX idx_language_stats_bible_status ON language_stats (bible_status)
WHERE
  bible_status IS NOT NULL;


CREATE INDEX idx_language_stats_has_whole_bible ON language_stats (has_whole_bible)
WHERE
  has_whole_bible = TRUE;


CREATE INDEX idx_language_stats_has_new_testament ON language_stats (has_new_testament)
WHERE
  has_new_testament = TRUE;


CREATE INDEX idx_language_stats_has_audio_recordings ON language_stats (has_audio_recordings)
WHERE
  has_audio_recordings = TRUE;


comment ON materialized view language_stats IS 'Combined language statistics from language_entities, cache tables (jp_language_cache, grn_language_cache), aggregated people groups stats, bible translation overrides, and internal project progress. Includes Bible status, audio recordings, Jesus Film, population stats, and JP fields. Optimized with composite indexes and refactored CTEs for better refresh performance.';


-- Create region_stats MV (depends on language_stats)
CREATE MATERIALIZED VIEW region_stats AS
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
      LEFT JOIN language_stats mls ON mls.language_entity_id = ler.language_entity_id
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


-- Create indexes on region_stats
CREATE UNIQUE INDEX idx_region_stats_region_id ON region_stats (region_id);


CREATE INDEX idx_region_stats_iso3 ON region_stats (iso3)
WHERE
  iso3 IS NOT NULL;


CREATE INDEX idx_region_stats_iso2 ON region_stats (iso2)
WHERE
  iso2 IS NOT NULL;


CREATE INDEX idx_region_stats_rog3 ON region_stats (rog3)
WHERE
  rog3 IS NOT NULL;


comment ON materialized view region_stats IS 'Combined region (country) statistics from regions, jp_countries_cache, and aggregated language stats from language_stats. Includes demographics, religious composition, language Bible status breakdowns, and JP fields.';


-- Create people_groups_stats MV (depends on language_stats)
CREATE MATERIALIZED VIEW people_groups_stats AS
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
      LEFT JOIN language_stats mls ON mls.language_entity_id = lepgr.language_entity_id
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


-- Create indexes on people_groups_stats
CREATE UNIQUE INDEX idx_people_groups_stats_people_group_id ON people_groups_stats (people_group_id);


CREATE INDEX idx_people_groups_stats_people_id3 ON people_groups_stats (people_id3)
WHERE
  people_id3 IS NOT NULL;


CREATE INDEX idx_people_groups_stats_primary_language_rol3 ON people_groups_stats (primary_language_rol3)
WHERE
  primary_language_rol3 IS NOT NULL;


CREATE INDEX idx_people_groups_stats_least_reached ON people_groups_stats (least_reached)
WHERE
  least_reached = TRUE;


CREATE INDEX idx_people_groups_stats_frontier ON people_groups_stats (frontier)
WHERE
  frontier = TRUE;


comment ON materialized view people_groups_stats IS 'Combined people group statistics from people_groups, aggregated jp_people_groups_cache (by people_id3), and primary language Bible status from language_stats. Includes demographics, status fields, Bible translation info, and media availability.';


-- ============================================================================
-- STEP 3: Update refresh functions (CREATE OR REPLACE)
-- ============================================================================
-- get_language_coordinates(UUID)
CREATE OR REPLACE FUNCTION get_language_coordinates (p_language_entity_id UUID) returns TABLE (
  language_entity_id UUID,
  region_id UUID,
  region_name TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_source TEXT,
  -- Bible translation status fields from language_stats
  has_full_audio_bible BOOLEAN,
  has_audio_portions BOOLEAN,
  has_text_portions BOOLEAN,
  iso639_3 TEXT,
  rolv_code TEXT,
  bible_stats_computed_at TIMESTAMPTZ
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    ler.language_entity_id,
    ler.region_id,
    r.name AS region_name,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status from language_stats
    mls.has_full_audio_bible,
    mls.has_audio_portions,
    mls.has_portions AS has_text_portions,
    mls.iso639_3,
    mls.rolv_code,
    mls.computed_at AS bible_stats_computed_at
  FROM
    language_entities_regions ler
    INNER JOIN regions r ON ler.region_id = r.id
    LEFT JOIN language_stats mls ON ler.language_entity_id = mls.language_entity_id
  WHERE
    ler.language_entity_id = p_language_entity_id
    AND ler.location IS NOT NULL
    AND ler.deleted_at IS NULL
    AND r.deleted_at IS NULL
  ORDER BY
    r.name ASC;
$$;


comment ON function get_language_coordinates (UUID) IS 'Returns all coordinate points for a specific language_entity_id, including bible translation status from language_stats.';


-- get_coordinates_by_region(UUID)
CREATE OR REPLACE FUNCTION get_coordinates_by_region (p_region_id UUID) returns TABLE (
  language_entity_id UUID,
  language_name TEXT,
  region_id UUID,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_source TEXT,
  -- Bible translation status fields from language_stats
  has_full_audio_bible BOOLEAN,
  has_audio_portions BOOLEAN,
  has_text_portions BOOLEAN,
  iso639_3 TEXT,
  rolv_code TEXT,
  bible_stats_computed_at TIMESTAMPTZ
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    ler.language_entity_id,
    le.name AS language_name,
    ler.region_id,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status from language_stats
    mls.has_full_audio_bible,
    mls.has_audio_portions,
    mls.has_portions AS has_text_portions,
    mls.iso639_3,
    mls.rolv_code,
    mls.computed_at AS bible_stats_computed_at
  FROM
    language_entities_regions ler
    INNER JOIN language_entities le ON ler.language_entity_id = le.id
    LEFT JOIN language_stats mls ON ler.language_entity_id = mls.language_entity_id
  WHERE
    ler.region_id = p_region_id
    AND ler.location IS NOT NULL
    AND ler.deleted_at IS NULL
    AND le.deleted_at IS NULL
  ORDER BY
    le.name ASC;
$$;


comment ON function get_coordinates_by_region (UUID) IS 'Returns all language coordinate points for a specific region_id, including bible translation status from language_stats.';


-- get_countries_with_bible_status()
CREATE OR REPLACE FUNCTION get_countries_with_bible_status () returns TABLE (
  region_id UUID,
  region_name TEXT,
  boundary_simplified geometry (multipolygon, 4326),
  language_count INTEGER,
  languages_no_scripture INTEGER,
  languages_portions INTEGER,
  languages_new_testament INTEGER,
  languages_full_bible INTEGER,
  bible_status_score NUMERIC
) AS $$
  SELECT 
    r.id AS region_id,
    r.name AS region_name,
    COALESCE(r.boundary_simplified, ST_Multi(ST_CollectionExtract(r.boundary, 3))) AS boundary_simplified,
    COALESCE(mrs.language_count, 0) AS language_count,
    COALESCE(mrs.languages_no_scripture, 0) AS languages_no_scripture,
    COALESCE(mrs.languages_portions, 0) AS languages_portions,
    COALESCE(mrs.languages_new_testament, 0) AS languages_new_testament,
    COALESCE(mrs.languages_full_bible, 0) AS languages_full_bible,
    CASE 
      WHEN mrs.language_count > 0 THEN
        (
          (COALESCE(mrs.languages_no_scripture, 0) * 0.0) +
          (COALESCE(mrs.languages_portions, 0) * 2.0) +
          (COALESCE(mrs.languages_new_testament, 0) * 3.0) +
          (COALESCE(mrs.languages_full_bible, 0) * 4.0)
        )::NUMERIC / mrs.language_count
      ELSE 0
    END AS bible_status_score
  FROM regions r
  LEFT JOIN region_stats mrs ON mrs.region_id = r.id
  WHERE r.level = 'country'
    AND r.deleted_at IS NULL
    AND (r.boundary IS NOT NULL OR r.boundary_simplified IS NOT NULL)
$$ language sql stable;


comment ON function get_countries_with_bible_status () IS 'Returns all countries with their simplified boundaries and calculated weighted average bible status scores (0-4 scale). Used for rendering countries layer on map colored by bible translation status.';


-- ============================================================================
-- STEP 3: Update refresh functions (CREATE OR REPLACE)
-- ============================================================================
-- refresh_language_stats() (renamed from refresh_mv_language_stats)
CREATE OR REPLACE FUNCTION refresh_language_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY language_stats;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh language_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql security definer;


comment ON function refresh_language_stats () IS 'Refreshes language_stats materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- refresh_region_stats() (renamed from refresh_mv_region_stats)
CREATE OR REPLACE FUNCTION refresh_region_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY region_stats;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh region_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql security definer;


comment ON function refresh_region_stats () IS 'Refreshes region_stats materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- refresh_people_groups_stats() (renamed from refresh_mv_people_group_stats)
CREATE OR REPLACE FUNCTION refresh_people_groups_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY people_groups_stats;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh people_groups_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql security definer;


comment ON function refresh_people_groups_stats () IS 'Refreshes people_groups_stats materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- refresh_all_stats_mvs() - Update to call new function names
CREATE OR REPLACE FUNCTION refresh_all_stats_mvs () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes per MV (15 minutes total)
  PERFORM set_config('statement_timeout', '900000', TRUE);
  
  -- Refresh language_stats first (others depend on it)
  BEGIN
    PERFORM refresh_language_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh region_stats (depends on language_stats)
  BEGIN
    PERFORM refresh_region_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh region_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh people_groups_stats (depends on language_stats)
  BEGIN
    PERFORM refresh_people_groups_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh people_groups_stats: %', SQLERRM;
      -- Continue even if this one fails
  END;
  
  -- Also refresh language_coordinates (depends on language_stats)
  -- Note: This function will be updated in Migration 3, but we reference it here
  BEGIN
    PERFORM refresh_language_coordinates_map();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_coordinates_map: %', SQLERRM;
      -- Continue even if this one fails
  END;
END;
$$ language plpgsql security definer;


comment ON function refresh_all_stats_mvs () IS 'Refreshes all stats materialized views (language_stats, region_stats, people_groups_stats) and language_coordinates in sequence. Uses CONCURRENTLY for non-blocking updates. Includes error handling to continue on timeout or other errors.';


-- ============================================================================
-- STEP 3: Drop old views and create combined views
-- ============================================================================
-- Note: MVs were already created in Step 2, now we create new combined views
-- Drop old views (including vw_iso_country_to_region)
DROP VIEW if EXISTS vw_languages_in_region cascade;


DROP VIEW if EXISTS vw_languages_by_people_group cascade;


DROP VIEW if EXISTS vw_regions_for_language cascade;


DROP VIEW if EXISTS vw_regions_for_people_group cascade;


DROP VIEW if EXISTS vw_people_groups_in_region cascade;


DROP VIEW if EXISTS vw_people_groups_by_language cascade;


DROP VIEW if EXISTS vw_iso_country_to_region cascade;


-- languages_regions_stats: Contextual view for language-region relationships
-- Only includes contextual fields: population and people_group_count
CREATE VIEW languages_regions_stats AS
SELECT
  ler.region_id,
  ler.language_entity_id,
  -- Contextual language population in region: SUM of people_group instance populations
  COALESCE(SUM(pgr.population), 0)::BIGINT AS population,
  -- Number of people groups speaking that language in that region
  COUNT(DISTINCT pgr.people_group_id)::INTEGER AS people_group_count
FROM
  language_entities_regions ler
  JOIN language_entities le ON ler.language_entity_id = le.id
  JOIN regions r ON ler.region_id = r.id
  LEFT JOIN language_entities_people_groups_regions lepgr ON lepgr.language_entity_id = ler.language_entity_id
  LEFT JOIN people_groups_regions pgr ON lepgr.people_group_region_id = pgr.id
  AND pgr.region_id = ler.region_id
WHERE
  r.level = 'country'
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL
  AND (
    pgr.deleted_at IS NULL
    OR pgr.id IS NULL
  )
GROUP BY
  ler.region_id,
  ler.language_entity_id;


comment ON view languages_regions_stats IS 'Contextual view for language-region relationships. Includes only contextual fields: population (sum of people group instance populations) and people_group_count. Filter by language_entity_id or region_id.';


-- languages_people_groups_stats: Contextual view for language-people_group relationships
-- Only includes contextual fields: population, region_count, and is_primary
CREATE VIEW languages_people_groups_stats AS
WITH
  region_counts AS (
    SELECT
      lepg.language_entity_id,
      pgr.people_group_id,
      COUNT(DISTINCT pgr.region_id)::INTEGER AS region_count
    FROM
      language_entities_people_groups_regions lepg
      JOIN people_groups_regions pgr ON lepg.people_group_region_id = pgr.id
    WHERE
      pgr.deleted_at IS NULL
    GROUP BY
      lepg.language_entity_id,
      pgr.people_group_id
  )
SELECT
  lepg.language_entity_id,
  pgr.people_group_id,
  -- Contextual population for that language/people group combo (instance population per region)
  pgr.population,
  -- Number of regions for that language/people group combo
  rc.region_count,
  -- Is this the primary language for the people group in this region?
  lepg.is_primary
FROM
  language_entities_people_groups_regions lepg
  JOIN people_groups_regions pgr ON lepg.people_group_region_id = pgr.id
  LEFT JOIN region_counts rc ON rc.language_entity_id = lepg.language_entity_id
  AND rc.people_group_id = pgr.people_group_id
WHERE
  pgr.deleted_at IS NULL;


comment ON view languages_people_groups_stats IS 'Contextual view for language-people_group relationships. Includes only contextual fields: population (instance population per region), region_count (number of regions for that combo), and is_primary. Filter by language_entity_id or people_group_id.';


-- people_groups_regions_stats: Contextual view for people_group-region relationships
-- Only includes contextual fields: population, language_count, name, and primary_language_id
CREATE VIEW people_groups_regions_stats AS
WITH
  language_counts AS (
    SELECT
      pgr.people_group_id,
      pgr.region_id,
      COUNT(DISTINCT lepg.language_entity_id)::INTEGER AS language_count
    FROM
      people_groups_regions pgr
      LEFT JOIN language_entities_people_groups_regions lepg ON lepg.people_group_region_id = pgr.id
      AND lepg.id IS NOT NULL
    WHERE
      pgr.deleted_at IS NULL
    GROUP BY
      pgr.people_group_id,
      pgr.region_id
  )
SELECT
  pgr.region_id,
  pgr.people_group_id,
  -- Contextual people group instance population in region
  pgr.population,
  -- Number of languages for that people group in that region
  COALESCE(lc.language_count, 0)::INTEGER AS language_count,
  -- Contextual name (people_group_name_in_country)
  pgr.peop_name_in_country AS name,
  -- Primary language ID (fkey language_entities.id corresponding to the primary_language_rol3)
  (
    SELECT
      le.id
    FROM
      language_entities le
      LEFT JOIN language_entity_sources les ON les.language_entity_id = le.id
      AND les.external_id_type = 'rolv_code'
      AND les.is_external = TRUE
      AND les.deleted_at IS NULL
      LEFT JOIN people_groups_stats mpg ON mpg.people_group_id = pgr.people_group_id
    WHERE
      (
        les.external_id = mpg.primary_language_rol3
        OR les.external_id = LOWER(mpg.primary_language_rol3)
      )
      AND le.deleted_at IS NULL
    LIMIT
      1
  ) AS primary_language_id
FROM
  people_groups_regions pgr
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN language_counts lc ON lc.people_group_id = pgr.people_group_id
  AND lc.region_id = pgr.region_id
WHERE
  r.level = 'country'
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view people_groups_regions_stats IS 'Contextual view for people_group-region relationships. Includes only contextual fields: population (instance population), language_count (number of languages in that region), name (peop_name_in_country), and primary_language_id. Filter by people_group_id or region_id.';


-- global_translation_statistics
CREATE VIEW global_translation_statistics AS
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
      language_stats
  ),
  project_completion AS (
    SELECT
      p.id,
      p.project_status,
      BOOL_OR(avp.book_fraction = 1) AS has_complete_audio,
      BOOL_OR(tvp.book_fraction = 1) AS has_complete_text
    FROM
      projects p
      LEFT JOIN audio_versions av ON av.project_id = p.id
      AND av.deleted_at IS NULL
      LEFT JOIN audio_version_progress avp ON avp.audio_version_id = av.id
      LEFT JOIN text_versions tv ON tv.project_id = p.id
      AND tv.deleted_at IS NULL
      LEFT JOIN text_version_progress tvp ON tvp.text_version_id = tv.id
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
      MAX(avp.chapters_with_audio)::BIGINT AS chapters_completed
    FROM
      audio_versions av
      JOIN projects p ON p.id = av.project_id
      AND p.deleted_at IS NULL
      JOIN audio_version_progress avp ON avp.audio_version_id = av.id
    WHERE
      av.deleted_at IS NULL
    GROUP BY
      p.id
  ),
  text_chapter_totals AS (
    SELECT
      p.id AS project_id,
      MAX(tvp.complete_chapters)::BIGINT AS chapters_completed
    FROM
      text_versions tv
      JOIN projects p ON p.id = tv.project_id
      AND p.deleted_at IS NULL
      JOIN text_version_progress tvp ON tvp.text_version_id = tv.id
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


comment ON view global_translation_statistics IS 'Aggregated translation and project metrics for frontend consumption. Includes bible translation statistics from language_stats and project completion metrics.';


-- Reset statement timeout
RESET statement_timeout;


COMMIT;
