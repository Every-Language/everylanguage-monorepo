/**
 * Centralized query constants to avoid duplication between logging and execution
 */
export const QUERIES = {
  // Verse queries
  VERSES_WITH_TEXTS: `
    SELECT 
      v.*,
      vt.id as verse_text_id,
      vt.text_version_id,
      vt.verse_text,
      vt.publish_status,
      vt.version,
      vt.created_at as text_created_at,
      vt.updated_at as text_updated_at
    FROM verses v
    LEFT JOIN verse_texts vt ON v.id = vt.verse_id AND vt.text_version_id = ?
    WHERE v.chapter_id = ?
    ORDER BY v.verse_number ASC
  `,

  VERSES_WITHOUT_TEXTS: `
    SELECT 
      v.*,
      NULL as verse_text_id,
      NULL as text_version_id,
      NULL as verse_text,
      NULL as publish_status,
      NULL as version,
      NULL as text_created_at,
      NULL as text_updated_at
    FROM verses v
    WHERE v.chapter_id = ?
    ORDER BY v.verse_number ASC
  `,

  // Chapter queries - OPTIMIZED for better performance
  CHAPTERS_WITH_METADATA: `
    SELECT 
      c.id,
      c.book_id,
      c.chapter_number,
      c.total_verses,
      c.created_at,
      c.updated_at,
      b.name as book_name,
      (b.name || ' ' || c.chapter_number) as title,
      CASE 
        WHEN COALESCE(vc.verse_count, 0) > 0 
        THEN ('1-' || vc.verse_count) 
        ELSE '1' 
      END as verseRange,
      COALESCE(mf_counts.media_file_count, 0) as media_file_count,
      COALESCE(mfd_counts.downloaded_count, 0) as downloaded_file_count,
      COALESCE(dln.total_downloaded_bytes, 0) AS total_downloaded_bytes,
      COALESCE(dln.total_file_size_bytes, 0) AS total_file_size_bytes,
      CASE 
        WHEN COALESCE(dln.total_file_size_bytes,0) > 0 
        THEN CAST(COALESCE(dln.total_downloaded_bytes,0) AS REAL) / CAST(dln.total_file_size_bytes AS REAL)
        ELSE 0
      END AS download_progress_ratio
    FROM chapters c
    INNER JOIN books b ON c.book_id = b.id
    LEFT JOIN (
      SELECT chapter_id, COUNT(1) as verse_count 
      FROM verses 
      GROUP BY chapter_id
    ) vc ON vc.chapter_id = c.id
    LEFT JOIN (
      SELECT chapter_id, COUNT(1) as media_file_count
      FROM media_files
      WHERE deleted_at IS NULL
        AND (? IS NULL OR audio_version_id = ?)
      GROUP BY chapter_id
    ) mf_counts ON mf_counts.chapter_id = c.id
    LEFT JOIN (
      SELECT mf.chapter_id, COUNT(1) as downloaded_count
      FROM media_files mf
      INNER JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
      WHERE mf.deleted_at IS NULL 
        AND mfd.download_status = 'completed'
        AND (? IS NULL OR mf.audio_version_id = ?)
      GROUP BY mf.chapter_id
    ) mfd_counts ON mfd_counts.chapter_id = c.id
    LEFT JOIN (
      SELECT mf.chapter_id,
             SUM(COALESCE(mfd.downloaded_bytes,0)) AS total_downloaded_bytes,
             SUM(COALESCE(mfd.file_size_bytes,0)) AS total_file_size_bytes
      FROM media_files mf
      LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
      WHERE mf.deleted_at IS NULL
        AND (? IS NULL OR mf.audio_version_id = ?)
      GROUP BY mf.chapter_id
    ) dln ON dln.chapter_id = c.id
    WHERE c.book_id = ?
    ORDER BY c.chapter_number ASC
  `,

  // Book queries
  BOOKS: `
    SELECT * FROM books 
    ORDER BY global_order ASC
  `,

  CHAPTERS_BY_BOOK: `
    SELECT * FROM chapters 
    WHERE book_id = ? 
    ORDER BY chapter_number ASC
  `,

  VERSES_BY_CHAPTER: `
    SELECT * FROM verses 
    WHERE chapter_id = ? 
    ORDER BY verse_number ASC
  `,

  VERSES_WITH_TIMING: `
    SELECT 
      v.id as verse_id,
      v.verse_number,
      vt.verse_text,
      mfv.start_time_seconds,
      mfv.duration_seconds,
      mf.id as media_file_id
    FROM verses v
    LEFT JOIN verse_texts vt ON (vt.verse_id = v.id AND vt.text_version_id = ?)
    LEFT JOIN media_files_verses mfv ON (mfv.verse_id = v.id AND mfv.deleted_at IS NULL)
    LEFT JOIN media_files mf ON (
      mfv.media_file_id = mf.id 
      AND mf.chapter_id = ? 
      AND mf.deleted_at IS NULL
      AND (? IS NULL OR mf.audio_version_id = ?)
    )
    WHERE v.chapter_id = ?
    ORDER BY v.verse_number ASC
  `,

  // Media queries
  MEDIA_FILES_FOR_CHAPTER: `
    SELECT * FROM media_files 
    WHERE chapter_id = ? AND deleted_at IS NULL
  `,

  // Download queries
  DOWNLOAD_STATUS: `
    SELECT 
      mf.id as media_file_id,
      mf.chapter_id,
      mf.file_size as file_size_bytes,
      mfd.download_status,
      mfd.downloaded_bytes,
      mfd.error_message,
      mfd.retry_count
    FROM media_files mf
    LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
    WHERE mf.deleted_at IS NULL
  `,

  DOWNLOAD_STATUS_ACTIVE: `
    SELECT dq.id,
           dq.media_file_id,
           dq.status,
           mfd.progress,
           mfd.downloaded_bytes,
           mfd.file_size_bytes,
           COALESCE(b.name || ' ' || c.chapter_number, 'Unknown') AS chapter_ref,
           av.name AS version_name
    FROM download_queue dq
    LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = dq.media_file_id
    LEFT JOIN media_files mf ON mf.id = dq.media_file_id
    LEFT JOIN chapters c ON c.id = mf.chapter_id
    LEFT JOIN books b ON b.id = c.book_id
    LEFT JOIN audio_versions av ON av.id = mf.audio_version_id
    WHERE dq.status IN ('active','queued')
    ORDER BY CASE dq.status WHEN 'active' THEN 0 ELSE 1 END, dq.priority DESC, dq.enqueued_at ASC
    LIMIT 50
  `,

  CHAPTER_DOWNLOAD_STATUS: `
    SELECT 
      COUNT(mf.id) AS total_files,
      COUNT(CASE WHEN mfd.download_status = 'completed' THEN 1 END) AS downloaded_files,
      COUNT(CASE WHEN dq.status = 'active' THEN 1 END) AS active_downloads,
      COALESCE(SUM(mfd.downloaded_bytes), 0) AS downloaded_bytes,
      COALESCE(SUM(mfd.file_size_bytes), 0) AS total_bytes
    FROM media_files mf
    LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
    LEFT JOIN download_queue dq ON dq.media_file_id = mf.id AND dq.status = 'active'
    WHERE mf.chapter_id = ? AND mf.audio_version_id = ? AND mf.deleted_at IS NULL
  `,

  BOOK_CHAPTER_DOWNLOAD_MAP: `
    SELECT c.id AS chapter_id,
           COUNT(mf.id) AS total_files,
           COUNT(CASE WHEN mfd.download_status = 'completed' THEN 1 END) AS downloaded_files,
           COUNT(CASE WHEN dq.status = 'active' THEN 1 END) AS active_downloads,
           COALESCE(SUM(mfd.downloaded_bytes), 0) AS downloaded_bytes,
           COALESCE(SUM(mfd.file_size_bytes), 0) AS total_bytes
    FROM chapters c
    LEFT JOIN media_files mf
      ON mf.chapter_id = c.id
     AND mf.audio_version_id = ?
     AND mf.deleted_at IS NULL
    LEFT JOIN media_files_downloads mfd
      ON mfd.media_file_id = mf.id
    LEFT JOIN download_queue dq
      ON dq.media_file_id = mf.id
     AND dq.status = 'active'
    WHERE c.book_id = ?
    GROUP BY c.id
  `,

  // User queries
  USER_SAVED_VERSIONS: `
    SELECT * FROM user_saved_text_versions 
    WHERE user_id = ?
  `,

  USER_SAVED_AUDIO_VERSIONS: `
    SELECT * FROM user_saved_audio_versions 
    WHERE user_id = ?
  `,

  USER_CURRENT_SELECTIONS: `
    SELECT * FROM user_current_selections 
    WHERE user_id = ?
  `,
} as const;
