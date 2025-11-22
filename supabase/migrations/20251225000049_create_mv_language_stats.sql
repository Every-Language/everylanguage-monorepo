-- 20251225000049_create_mv_language_stats.sql
-- Create materialized view that combines language_entities with cache tables and aggregated people groups stats
-- This replaces jp_language_people_groups_stats and will replace unified_bible_translation_stats
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


CREATE MATERIALIZED VIEW mv_language_stats AS
WITH
  language_base AS (
    SELECT
      le.id AS language_entity_id,
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
  -- GRN language cache data
  grn_data AS (
    SELECT
      lb.language_entity_id,
      BOOL_OR(grn.has_recordings) AS grn_has_recordings
    FROM
      language_base lb
      LEFT JOIN grn_language_cache grn ON (
        (
          lb.iso639_3 IS NOT NULL
          AND LOWER(grn.iso639_3) = LOWER(lb.iso639_3)
        )
        OR (
          lb.rolv_code IS NOT NULL
          AND grn.grn_language_id::TEXT = lb.rolv_code
        )
      )
    GROUP BY
      lb.language_entity_id
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


-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_mv_language_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_language_stats;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh mv_language_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


comment ON materialized view mv_language_stats IS 'Combined language statistics from language_entities, cache tables (jp_language_cache, grn_language_cache), aggregated people groups stats, bible translation overrides, and internal project progress. Includes Bible status, audio recordings, Jesus Film, population stats, and JP fields.';


comment ON function refresh_mv_language_stats () IS 'Refreshes mv_language_stats materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- Reset statement timeout
RESET statement_timeout;


COMMIT;
