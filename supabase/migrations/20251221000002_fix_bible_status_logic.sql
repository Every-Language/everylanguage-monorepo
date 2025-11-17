-- 20251221000002_fix_bible_status_logic.sql
-- Fix Bible status logic: bible_status = 5 means Complete Bible (not 6)
--
-- NOTE: This migration recreates the materialized view, which takes ~4-5 minutes
-- because it processes 20,019 language entities. This is necessary because we're
-- changing the view logic (bible_status = 6 -> 5). For future migrations that
-- don't change the view structure, use REFRESH MATERIALIZED VIEW instead.
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


-- Drop and recreate the materialized view with corrected logic
DROP MATERIALIZED VIEW IF EXISTS unified_bible_translation_stats cascade;


CREATE MATERIALIZED VIEW unified_bible_translation_stats AS
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
  jp_data AS (
    SELECT
      lb.language_entity_id,
      jp.bible_status,
      jp.has_audio_recordings AS jp_has_audio
    FROM
      language_base lb
      LEFT JOIN jp_language_cache jp ON LOWER(jp.iso639_3) = LOWER(lb.iso639_3)
  ),
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
  COALESCE(
    (jp.bible_status = 5),
    internal.has_complete_audio_version,
    (override_data.has_full_audio_override = 1),
    FALSE
  ) AS has_full_audio_bible,
  COALESCE(
    jp.jp_has_audio,
    grn_data.grn_has_recordings,
    internal.has_audio_progress,
    (override_data.has_audio_portions_override = 1),
    FALSE
  ) AS has_audio_portions,
  COALESCE(
    (
      jp.bible_status IS NOT NULL
      AND jp.bible_status > 0
    ),
    internal.has_text_progress,
    (override_data.has_text_portions_override = 1),
    FALSE
  ) AS has_text_portions,
  NOW() AS computed_at
FROM
  language_base lb
  LEFT JOIN jp_data jp ON jp.language_entity_id = lb.language_entity_id
  LEFT JOIN grn_data ON grn_data.language_entity_id = lb.language_entity_id
  LEFT JOIN override_data ON override_data.language_entity_id = lb.language_entity_id
  LEFT JOIN internal_projects internal ON internal.language_entity_id = lb.language_entity_id;


CREATE UNIQUE INDEX idx_unified_stats_language ON unified_bible_translation_stats (language_entity_id);


CREATE INDEX idx_unified_stats_full_audio ON unified_bible_translation_stats (has_full_audio_bible)
WHERE
  has_full_audio_bible = TRUE;


CREATE INDEX idx_unified_stats_audio_portions ON unified_bible_translation_stats (has_audio_portions)
WHERE
  has_audio_portions = TRUE;


-- Recreate the global_translation_statistics view that was dropped by CASCADE
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
          WHEN has_text_portions THEN 1
          ELSE 0
        END
      )::BIGINT AS text_portions_count
    FROM
      unified_bible_translation_stats
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


COMMIT;
