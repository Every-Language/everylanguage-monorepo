-- 20251225000054_update_global_translation_statistics.sql
-- Update global_translation_statistics view to use mv_language_stats instead of unified_bible_translation_stats
BEGIN;


-- Recreate the global_translation_statistics view
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


COMMIT;
