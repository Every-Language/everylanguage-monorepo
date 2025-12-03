-- 20251219000010_update_project_status_and_activity.sql
-- Reverts active project counting to use project_status and sorts projects by latest activity
BEGIN;


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


DROP FUNCTION if EXISTS get_active_projects_with_progress ();


CREATE OR REPLACE FUNCTION get_active_projects_with_progress () returns TABLE (
  project_id UUID,
  project_name TEXT,
  language_name TEXT,
  has_audio BOOLEAN,
  has_text BOOLEAN,
  completed_chapters INTEGER,
  total_chapters INTEGER,
  progress_percentage NUMERIC,
  last_activity_at TIMESTAMPTZ
) AS $$
WITH audio_progress AS (
  SELECT
    av.project_id,
    MAX(le.name) AS language_name,
    MAX(avps.chapters_with_audio)::INTEGER AS chapters_with_audio,
    MAX(avps.total_chapters)::INTEGER AS total_chapters,
    MAX(avps.chapter_fraction) AS chapter_fraction
  FROM audio_versions av
  JOIN language_entities le ON le.id = av.language_entity_id
  JOIN audio_version_progress_summary avps ON avps.audio_version_id = av.id
  WHERE av.deleted_at IS NULL
    AND av.project_id IS NOT NULL
  GROUP BY av.project_id
),
text_progress AS (
  SELECT
    tv.project_id,
    MAX(le.name) AS language_name,
    MAX(tvps.complete_chapters)::INTEGER AS complete_chapters,
    MAX(tvps.total_chapters)::INTEGER AS total_chapters,
    MAX(tvps.chapter_fraction) AS chapter_fraction
  FROM text_versions tv
  JOIN language_entities le ON le.id = tv.language_entity_id
  JOIN text_version_progress_summary tvps ON tvps.text_version_id = tv.id
  WHERE tv.deleted_at IS NULL
    AND tv.project_id IS NOT NULL
  GROUP BY tv.project_id
),
media_activity AS (
  SELECT
    av.project_id,
    MAX(mf.created_at) AS last_media_at
  FROM media_files mf
  JOIN audio_versions av ON av.id = mf.audio_version_id
  WHERE mf.deleted_at IS NULL
    AND av.deleted_at IS NULL
    AND av.project_id IS NOT NULL
  GROUP BY av.project_id
),
text_activity AS (
  SELECT
    tv.project_id,
    MAX(vt.created_at) AS last_text_at
  FROM verse_texts vt
  JOIN text_versions tv ON tv.id = vt.text_version_id
  WHERE vt.deleted_at IS NULL
    AND tv.deleted_at IS NULL
    AND tv.project_id IS NOT NULL
  GROUP BY tv.project_id
),
activity AS (
  SELECT
    COALESCE(ma.project_id, ta.project_id) AS project_id,
    CASE
      WHEN ma.last_media_at IS NOT NULL AND ta.last_text_at IS NOT NULL THEN GREATEST(ma.last_media_at, ta.last_text_at)
      ELSE COALESCE(ma.last_media_at, ta.last_text_at)
    END AS last_activity_at
  FROM media_activity ma
  FULL OUTER JOIN text_activity ta ON ta.project_id = ma.project_id
)
SELECT
  p.id AS project_id,
  p.name AS project_name,
  COALESCE(a.language_name, t.language_name, 'Unknown') AS language_name,
  (a.project_id IS NOT NULL) AS has_audio,
  (t.project_id IS NOT NULL) AS has_text,
  COALESCE(a.chapters_with_audio, t.complete_chapters, 0) AS completed_chapters,
  COALESCE(a.total_chapters, t.total_chapters, 0) AS total_chapters,
  ROUND(
    GREATEST(
      COALESCE(a.chapter_fraction, 0),
      COALESCE(t.chapter_fraction, 0)
    ) * 100,
    2
  ) AS progress_percentage,
  act.last_activity_at
FROM projects p
LEFT JOIN audio_progress a ON a.project_id = p.id
LEFT JOIN text_progress t ON t.project_id = p.id
LEFT JOIN activity act ON act.project_id = p.id
WHERE p.deleted_at IS NULL
  AND p.project_status = 'active'
  AND (a.project_id IS NOT NULL OR t.project_id IS NOT NULL)
ORDER BY act.last_activity_at DESC NULLS LAST, p.created_at DESC;
$$ language sql stable;


comment ON function get_active_projects_with_progress IS 'Returns active Every Language projects with aggregated progress metrics and recent activity timestamp.';


COMMIT;
