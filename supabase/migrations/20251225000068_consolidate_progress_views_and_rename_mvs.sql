-- Consolidate Progress Views and Rename Materialized Views
-- ============================================================
-- 1. Enable RLS on progress_refresh_queue (no policies - internal table only)
-- 2. Drop redundant views (audio_version_progress_summary, text_version_progress_summary)
-- 3. Rename MVs: mv_audio_version_progress_summary -> audio_version_progress
--                mv_text_version_progress_summary -> text_version_progress
-- 4. Add language_entity_id to MVs (denormalized for easier querying)
-- 5. Drop unused best views (language_entity_best_audio_version, language_entity_best_text_version)
-- 6. Update refresh functions to use new MV names
-- 7. Update dependent functions/views
BEGIN;


-- 1. Enable RLS on progress_refresh_queue (internal table, no policies needed)
ALTER TABLE progress_refresh_queue enable ROW level security;


-- 2. Drop redundant views (they will be replaced by renamed MVs)
DROP VIEW if EXISTS public.audio_version_progress_summary cascade;


DROP VIEW if EXISTS public.text_version_progress_summary cascade;


-- 3. Drop unused best views
DROP VIEW if EXISTS public.language_entity_best_audio_version cascade;


DROP VIEW if EXISTS public.language_entity_best_text_version cascade;


-- 4. Drop old MVs (will recreate with new names and language_entity_id)
DROP MATERIALIZED VIEW IF EXISTS public.mv_audio_version_progress_summary cascade;


DROP MATERIALIZED VIEW IF EXISTS public.mv_text_version_progress_summary cascade;


-- 5. Recreate audio_version_progress MV with language_entity_id
CREATE MATERIALIZED VIEW audio_version_progress AS
WITH
  scope AS (
    SELECT
      av.id,
      av.bible_version_id,
      av.language_entity_id
    FROM
      audio_versions av
    WHERE
      av.deleted_at IS NULL
  ),
  verse_totals AS (
    SELECT
      s.id AS audio_version_id,
      COUNT(v.id)::BIGINT AS total_verses
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
      JOIN verses v ON v.chapter_id = c.id
    GROUP BY
      s.id
  ),
  -- Inlined audio_verse_coverage
  avc AS (
    (
      SELECT DISTINCT
        mf.audio_version_id,
        mfv.verse_id
      FROM
        media_files mf
        JOIN media_files_verses mfv ON mfv.media_file_id = mf.id
      WHERE
        mf.deleted_at IS NULL
        AND mf.media_type = 'audio'
        AND mf.is_bible_audio IS TRUE
        AND mf.upload_status = 'completed'
        AND mf.publish_status = 'published'
        AND mfv.deleted_at IS NULL
        AND mf.audio_version_id IS NOT NULL
    )
    UNION
    (
      SELECT DISTINCT
        mf.audio_version_id,
        v.id AS verse_id
      FROM
        media_files mf
        JOIN verses v ON v.chapter_id = mf.chapter_id
      WHERE
        mf.deleted_at IS NULL
        AND mf.media_type = 'audio'
        AND mf.is_bible_audio IS TRUE
        AND mf.upload_status = 'completed'
        AND mf.publish_status = 'published'
        AND mf.chapter_id IS NOT NULL
        AND mf.audio_version_id IS NOT NULL
    )
    UNION
    (
      SELECT DISTINCT
        mf.audio_version_id,
        v.id AS verse_id
      FROM
        media_files mf
        JOIN verses vs ON vs.id = mf.start_verse_id
        LEFT JOIN verses ve ON ve.id = mf.end_verse_id
        JOIN verses v ON v.global_order BETWEEN vs.global_order AND COALESCE(ve.global_order, vs.global_order)
      WHERE
        mf.deleted_at IS NULL
        AND mf.media_type = 'audio'
        AND mf.is_bible_audio IS TRUE
        AND mf.upload_status = 'completed'
        AND mf.publish_status = 'published'
        AND mf.start_verse_id IS NOT NULL
        AND mf.audio_version_id IS NOT NULL
    )
  ),
  verse_covered AS (
    SELECT
      avc.audio_version_id,
      COUNT(DISTINCT avc.verse_id)::BIGINT AS covered_verses
    FROM
      avc
    GROUP BY
      avc.audio_version_id
  ),
  chapter_totals AS (
    SELECT
      s.id AS audio_version_id,
      COUNT(c.id)::BIGINT AS total_chapters
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
    GROUP BY
      s.id
  ),
  -- Inlined audio_chapter_coverage
  acc AS (
    SELECT
      avc.audio_version_id,
      v.chapter_id,
      COUNT(DISTINCT avc.verse_id) AS covered_verses,
      c.total_verses,
      (COUNT(DISTINCT avc.verse_id) > 0) AS has_any,
      (COUNT(DISTINCT avc.verse_id) = c.total_verses) AS is_complete
    FROM
      avc
      JOIN verses v ON v.id = avc.verse_id
      JOIN chapters c ON c.id = v.chapter_id
    GROUP BY
      avc.audio_version_id,
      v.chapter_id,
      c.total_verses
  ),
  chapters_with_any AS (
    SELECT
      acc.audio_version_id,
      COUNT(*)::BIGINT AS chapters_with_audio
    FROM
      acc
    WHERE
      acc.has_any
    GROUP BY
      acc.audio_version_id
  ),
  book_totals AS (
    SELECT
      s.id AS audio_version_id,
      COUNT(b.id)::BIGINT AS total_books
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
    GROUP BY
      s.id
  ),
  -- Inlined audio_book_coverage pieces
  chapters_per_book AS (
    SELECT
      b.id AS book_id,
      COUNT(*) AS total_chapters
    FROM
      chapters c
      JOIN books b ON b.id = c.book_id
    GROUP BY
      b.id
  ),
  chapters_complete AS (
    SELECT
      acc.audio_version_id,
      c.book_id,
      COUNT(*) AS complete_chapters
    FROM
      acc
      JOIN chapters c ON c.id = acc.chapter_id
    WHERE
      acc.is_complete
    GROUP BY
      acc.audio_version_id,
      c.book_id
  ),
  abc AS (
    SELECT
      cpb.book_id,
      cc.audio_version_id,
      cc.complete_chapters,
      cpb.total_chapters,
      (
        COALESCE(cc.complete_chapters, 0) = cpb.total_chapters
      ) AS is_complete
    FROM
      chapters_per_book cpb
      LEFT JOIN chapters_complete cc ON cc.book_id = cpb.book_id
  ),
  books_complete AS (
    SELECT
      abc.audio_version_id,
      COUNT(*)::BIGINT AS books_complete
    FROM
      abc
    WHERE
      abc.is_complete
    GROUP BY
      abc.audio_version_id
  )
SELECT
  s.id AS audio_version_id,
  s.language_entity_id,
  COALESCE(vc.covered_verses, 0) AS covered_verses,
  vt.total_verses,
  (
    COALESCE(vc.covered_verses, 0)::NUMERIC / NULLIF(vt.total_verses, 0)
  ) AS verse_fraction,
  COALESCE(ca.chapters_with_audio, 0) AS chapters_with_audio,
  ct.total_chapters,
  (
    COALESCE(ca.chapters_with_audio, 0)::NUMERIC / NULLIF(ct.total_chapters, 0)
  ) AS chapter_fraction,
  COALESCE(bc.books_complete, 0) AS books_complete,
  bt.total_books,
  (
    COALESCE(bc.books_complete, 0)::NUMERIC / NULLIF(bt.total_books, 0)
  ) AS book_fraction
FROM
  scope s
  JOIN verse_totals vt ON vt.audio_version_id = s.id
  LEFT JOIN verse_covered vc ON vc.audio_version_id = s.id
  JOIN chapter_totals ct ON ct.audio_version_id = s.id
  LEFT JOIN chapters_with_any ca ON ca.audio_version_id = s.id
  JOIN book_totals bt ON bt.audio_version_id = s.id
  LEFT JOIN books_complete bc ON bc.audio_version_id = s.id;


CREATE UNIQUE INDEX audio_version_progress_pkey ON audio_version_progress (audio_version_id);


CREATE INDEX audio_version_progress_language_entity_id_idx ON audio_version_progress (language_entity_id);


comment ON materialized view audio_version_progress IS 'Materialized summary metrics for audio versions with denormalized language_entity_id.';


-- 6. Recreate text_version_progress MV with language_entity_id
CREATE MATERIALIZED VIEW text_version_progress AS
WITH
  scope AS (
    SELECT
      tv.id,
      tv.bible_version_id,
      tv.language_entity_id
    FROM
      text_versions tv
    WHERE
      tv.deleted_at IS NULL
  ),
  verse_totals AS (
    SELECT
      s.id AS text_version_id,
      COUNT(v.id)::BIGINT AS total_verses
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
      JOIN verses v ON v.chapter_id = c.id
    GROUP BY
      s.id
  ),
  -- Inlined text_verse_coverage
  tvc AS (
    SELECT
      vt.text_version_id,
      vt.verse_id
    FROM
      verse_texts vt
      JOIN text_versions tv ON tv.id = vt.text_version_id
    WHERE
      vt.deleted_at IS NULL
      AND tv.deleted_at IS NULL
  ),
  verse_covered AS (
    SELECT
      tvc.text_version_id,
      COUNT(DISTINCT tvc.verse_id)::BIGINT AS covered_verses
    FROM
      tvc
    GROUP BY
      tvc.text_version_id
  ),
  chapter_totals AS (
    SELECT
      s.id AS text_version_id,
      COUNT(c.id)::BIGINT AS total_chapters
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
    GROUP BY
      s.id
  ),
  -- Inlined text_chapter_coverage
  tcc AS (
    SELECT
      tvc.text_version_id,
      v.chapter_id,
      COUNT(DISTINCT tvc.verse_id) AS verses_with_text,
      c.total_verses,
      (COUNT(DISTINCT tvc.verse_id) = c.total_verses) AS is_complete
    FROM
      tvc
      JOIN verses v ON v.id = tvc.verse_id
      JOIN chapters c ON c.id = v.chapter_id
    GROUP BY
      tvc.text_version_id,
      v.chapter_id,
      c.total_verses
  ),
  chapters_complete AS (
    SELECT
      tcc.text_version_id,
      c.book_id,
      COUNT(*) AS complete_chapters
    FROM
      tcc
      JOIN chapters c ON c.id = tcc.chapter_id
    WHERE
      tcc.is_complete
    GROUP BY
      tcc.text_version_id,
      c.book_id
  ),
  book_totals AS (
    SELECT
      s.id AS text_version_id,
      COUNT(b.id)::BIGINT AS total_books
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
    GROUP BY
      s.id
  ),
  chapters_per_book AS (
    SELECT
      b.id AS book_id,
      COUNT(*) AS total_chapters
    FROM
      chapters c
      JOIN books b ON b.id = c.book_id
    GROUP BY
      b.id
  ),
  tbc AS (
    SELECT
      cpb.book_id,
      cc.text_version_id,
      cc.complete_chapters,
      cpb.total_chapters,
      (
        COALESCE(cc.complete_chapters, 0) = cpb.total_chapters
      ) AS is_complete
    FROM
      chapters_per_book cpb
      LEFT JOIN chapters_complete cc ON cc.book_id = cpb.book_id
  ),
  books_complete AS (
    SELECT
      tbc.text_version_id,
      COUNT(*)::BIGINT AS books_complete
    FROM
      tbc
    WHERE
      tbc.is_complete
    GROUP BY
      tbc.text_version_id
  )
SELECT
  s.id AS text_version_id,
  s.language_entity_id,
  COALESCE(vc.covered_verses, 0) AS covered_verses,
  vt.total_verses,
  (
    COALESCE(vc.covered_verses, 0)::NUMERIC / NULLIF(vt.total_verses, 0)
  ) AS verse_fraction,
  COALESCE(cc.complete_chapters, 0) AS complete_chapters,
  ct.total_chapters,
  (
    COALESCE(cc.complete_chapters, 0)::NUMERIC / NULLIF(ct.total_chapters, 0)
  ) AS chapter_fraction,
  COALESCE(bc.books_complete, 0) AS books_complete,
  bt.total_books,
  (
    COALESCE(bc.books_complete, 0)::NUMERIC / NULLIF(bt.total_books, 0)
  ) AS book_fraction
FROM
  scope s
  JOIN verse_totals vt ON vt.text_version_id = s.id
  LEFT JOIN verse_covered vc ON vc.text_version_id = s.id
  JOIN chapter_totals ct ON ct.text_version_id = s.id
  LEFT JOIN (
    SELECT
      text_version_id,
      SUM(
        CASE
          WHEN is_complete THEN 1
          ELSE 0
        END
      )::BIGINT AS complete_chapters
    FROM
      tcc
    GROUP BY
      text_version_id
  ) cc ON cc.text_version_id = s.id
  JOIN book_totals bt ON bt.text_version_id = s.id
  LEFT JOIN books_complete bc ON bc.text_version_id = s.id;


CREATE UNIQUE INDEX text_version_progress_pkey ON text_version_progress (text_version_id);


CREATE INDEX text_version_progress_language_entity_id_idx ON text_version_progress (language_entity_id);


comment ON materialized view text_version_progress IS 'Materialized summary metrics for text versions with denormalized language_entity_id.';


-- 7. Update refresh functions to use new MV names
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_audio_verse_coverage;
  REFRESH MATERIALIZED VIEW mv_audio_chapter_coverage;
  REFRESH MATERIALIZED VIEW mv_audio_book_coverage;
  REFRESH MATERIALIZED VIEW audio_version_progress;

  REFRESH MATERIALIZED VIEW mv_text_verse_coverage;
  REFRESH MATERIALIZED VIEW mv_text_chapter_coverage;
  REFRESH MATERIALIZED VIEW mv_text_book_coverage;
  REFRESH MATERIALIZED VIEW text_version_progress;
END;
$$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_verse_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_chapter_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_book_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY audio_version_progress;

  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_verse_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_chapter_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_book_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY text_version_progress;
END;
$$;


-- 8. Update get_active_projects_with_progress to use new MV names
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
  AND (a.project_id IS NOT NULL OR t.project_id IS NOT NULL)
ORDER BY progress_percentage DESC NULLS LAST, p.created_at DESC;
$$ language sql stable;


-- 9. Note: mv_language_stats references the old view names
-- The migration file 20251225000064_optimize_mv_language_stats.sql has been updated
-- to use the new MV names (audio_version_progress, text_version_progress)
-- If mv_language_stats already exists, it will need to be refreshed after this migration
-- by running: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_language_stats;
COMMIT;
