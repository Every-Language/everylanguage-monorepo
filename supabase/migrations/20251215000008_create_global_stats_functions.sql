-- 20250115000008_create_global_stats_functions.sql
-- RPC helpers for frontend consumption of global stats and activity feeds
BEGIN;


DROP FUNCTION if EXISTS get_active_projects_with_progress ();


CREATE OR REPLACE FUNCTION get_active_projects_with_progress () returns TABLE (
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


comment ON function get_active_projects_with_progress IS 'Returns active Every Language projects with aggregated progress metrics.';


DROP FUNCTION if EXISTS get_recent_bible_audio_uploads (limit_count INTEGER);


CREATE OR REPLACE FUNCTION get_recent_bible_audio_uploads (limit_count INTEGER DEFAULT 10) returns TABLE (
  media_file_id UUID,
  language_name TEXT,
  book_name TEXT,
  chapter_number INTEGER,
  uploaded_at TIMESTAMPTZ,
  audio_version_id UUID,
  object_key TEXT
) AS $$
SELECT
  mf.id AS media_file_id,
  le.name AS language_name,
  COALESCE(b.name, fallback_book.name, 'Unknown') AS book_name,
  COALESCE(c.chapter_number, fallback_chapter.chapter_number, 0) AS chapter_number,
  mf.created_at AS uploaded_at,
  mf.audio_version_id,
  mf.object_key
FROM media_files mf
JOIN language_entities le ON le.id = mf.language_entity_id
LEFT JOIN verses v ON v.id = mf.start_verse_id
LEFT JOIN chapters c ON c.id = v.chapter_id
LEFT JOIN books b ON b.id = c.book_id
LEFT JOIN chapters fallback_chapter ON fallback_chapter.id = mf.chapter_id
LEFT JOIN books fallback_book ON fallback_book.id = fallback_chapter.book_id
WHERE mf.deleted_at IS NULL
  AND mf.media_type = 'audio'
  AND mf.is_bible_audio IS TRUE
  AND mf.upload_status = 'completed'
  AND mf.publish_status = 'published'
ORDER BY mf.created_at DESC
LIMIT GREATEST(limit_count, 1);
$$ language sql stable;


comment ON function get_recent_bible_audio_uploads IS 'Returns the most recent published Bible audio files for the activity feed.';


DROP FUNCTION if EXISTS get_recent_public_updates (limit_count INTEGER);


CREATE OR REPLACE FUNCTION get_recent_public_updates (limit_count INTEGER DEFAULT 10) returns TABLE (
  update_id UUID,
  project_id UUID,
  project_name TEXT,
  language_name TEXT,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ,
  media_keys TEXT[]
) AS $$
SELECT
  pu.id AS update_id,
  pu.project_id,
  p.name AS project_name,
  le.name AS language_name,
  pu.title,
  pu.body,
  pu.created_at,
  COALESCE(
    ARRAY_AGG(pum.object_key ORDER BY pum.display_order)
      FILTER (WHERE pum.object_key IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS media_keys
FROM project_updates pu
JOIN projects p ON p.id = pu.project_id
JOIN language_entities le ON le.id = p.target_language_entity_id
LEFT JOIN project_updates_media pum
  ON pum.project_update_id = pu.id
  AND pum.deleted_at IS NULL
WHERE pu.deleted_at IS NULL
  AND pu.visibility = 'public'
GROUP BY pu.id, pu.project_id, p.name, le.name, pu.title, pu.body, pu.created_at
ORDER BY pu.created_at DESC
LIMIT GREATEST(limit_count, 1);
$$ language sql stable;


comment ON function get_recent_public_updates IS 'Returns the most recent public project updates with associated media.';


COMMIT;
