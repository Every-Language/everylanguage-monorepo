-- Fix get_active_projects_with_progress to filter by project_status = 'active'
-- ============================================================================
-- The function was missing the project_status filter when it was recreated
-- in migration 20251225000068. This causes it to return all projects instead
-- of just active ones, or potentially 0 projects if there are data issues.
-- Adding the filter back to match the summary view logic.
BEGIN;


DROP FUNCTION if EXISTS get_active_projects_with_progress ();


CREATE FUNCTION get_active_projects_with_progress () returns TABLE (
  project_id UUID,
  project_name TEXT,
  language_name TEXT,
  has_audio BOOLEAN,
  has_text BOOLEAN,
  completed_chapters INTEGER,
  total_chapters INTEGER,
  progress_percentage NUMERIC
) AS $$
WITH audio_progress AS (
  SELECT
    av.project_id,
    MAX(le.name) AS language_name,
    MAX(avp.chapters_with_audio)::INTEGER AS chapters_with_audio,
    MAX(avp.total_chapters)::INTEGER AS total_chapters,
    MAX(avp.chapter_fraction) AS chapter_fraction
  FROM audio_versions av
  JOIN language_entities le ON le.id = av.language_entity_id
  JOIN audio_version_progress avp ON avp.audio_version_id = av.id
  WHERE av.deleted_at IS NULL
    AND av.project_id IS NOT NULL
  GROUP BY av.project_id
),
text_progress AS (
  SELECT
    tv.project_id,
    MAX(le.name) AS language_name,
    MAX(tvp.complete_chapters)::INTEGER AS complete_chapters,
    MAX(tvp.total_chapters)::INTEGER AS total_chapters,
    MAX(tvp.chapter_fraction) AS chapter_fraction
  FROM text_versions tv
  JOIN language_entities le ON le.id = tv.language_entity_id
  JOIN text_version_progress tvp ON tvp.text_version_id = tv.id
  WHERE tv.deleted_at IS NULL
    AND tv.project_id IS NOT NULL
  GROUP BY tv.project_id
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
  ) AS progress_percentage
FROM projects p
LEFT JOIN audio_progress a ON a.project_id = p.id
LEFT JOIN text_progress t ON t.project_id = p.id
WHERE p.deleted_at IS NULL
  AND p.project_status = 'active'
  AND (a.project_id IS NOT NULL OR t.project_id IS NOT NULL)
ORDER BY progress_percentage DESC NULLS LAST, p.created_at DESC;
$$ language sql stable;


comment ON function get_active_projects_with_progress IS 'Returns active Every Language projects with aggregated progress metrics. Only includes projects with project_status = ''active'' and at least one version with progress data.';


COMMIT;
