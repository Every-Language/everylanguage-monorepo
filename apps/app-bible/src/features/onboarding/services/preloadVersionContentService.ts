import { supabase } from '@/shared/services/api/supabase';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = false;

interface PreloadResult {
  verseTexts: number;
  mediaFiles: number;
  mediaFilesVerses: number;
}

export interface PreloadProgress {
  current: number;
  total: number;
  type: 'verse_texts' | 'media_files';
}

/**
 * Preload verse_texts and media_files for selected versions
 * Fetches from Supabase and inserts directly into PowerSync local DB
 */
export async function preloadVersionContent(
  textVersionId: string | null,
  audioVersionId: string | null,
  onProgress?: (progress: PreloadProgress) => void
): Promise<PreloadResult> {
  const result: PreloadResult = {
    verseTexts: 0,
    mediaFiles: 0,
    mediaFilesVerses: 0,
  };

  // Preload verse_texts if text version selected
  if (textVersionId) {
    const count = await preloadVerseTexts(textVersionId, onProgress);
    result.verseTexts = count;
  }

  // Preload media_files and media_files_verses if audio version selected
  if (audioVersionId) {
    const { mediaFiles, mediaFilesVerses } =
      await preloadMediaFiles(audioVersionId);
    result.mediaFiles = mediaFiles;
    result.mediaFilesVerses = mediaFilesVerses;
  }

  return result;
}

/**
 * Fetch and insert verse_texts for a text version
 * Uses batched inserts with transactions to prevent queue overflow
 */
async function preloadVerseTexts(
  textVersionId: string,
  onProgress?: (progress: PreloadProgress) => void
): Promise<number> {
  try {
    // Limit initial fetch to prevent overwhelming the queue
    // Filter by publish_status = 'published' to match media_files behavior
    const { data, error } = await supabase
      .from('verse_texts')
      .select('*')
      .eq('text_version_id', textVersionId)
      .eq('publish_status', 'published')
      .is('deleted_at', null)
      .limit(2000); // Initial limit to prevent queue overflow

    if (error) {
      logger.warn(ENABLE_LOGGING, 'Failed to fetch verse_texts:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const total = data.length;

    // Process in batches to prevent queue overflow
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);

      try {
        await powerSyncSystem.execute('BEGIN');

        // Build bulk INSERT with multiple VALUES
        const values = batch
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const params = batch.flatMap(vt => [
          vt.id,
          vt.verse_id,
          vt.text_version_id,
          vt.verse_text ?? null,
          vt.created_at ?? null,
          vt.created_by ?? null,
          vt.updated_at ?? null,
          vt.deleted_at ?? null,
          vt.version ?? null,
          vt.publish_status ?? null,
        ]);

        await powerSyncSystem.execute(
          `INSERT OR REPLACE INTO verse_texts 
           (id, verse_id, text_version_id, verse_text, created_at, created_by, updated_at, deleted_at, version, publish_status)
           VALUES ${values}`,
          params
        );

        await powerSyncSystem.execute('COMMIT');
        inserted += batch.length;

        // Report progress after each batch
        if (onProgress) {
          onProgress({
            current: inserted,
            total,
            type: 'verse_texts',
          });
        }

        // Small delay between batches to let queue process
        if (i + BATCH_SIZE < data.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (batchError) {
        try {
          await powerSyncSystem.execute('ROLLBACK');
        } catch {
          // Ignore rollback errors
        }
        logger.warn(
          ENABLE_LOGGING,
          `Failed to insert batch of verse_texts (${i}-${i + batch.length}):`,
          batchError
        );
        // Continue with next batch
      }
    }

    logger.info(
      ENABLE_LOGGING,
      `Preloaded ${inserted} verse_texts for text version ${textVersionId}`
    );

    return inserted;
  } catch (error) {
    logger.error(ENABLE_LOGGING, 'Error preloading verse_texts:', error);
    return 0;
  }
}

/**
 * Fetch and insert media_files and media_files_verses for an audio version
 * Uses batched inserts with transactions to prevent queue overflow
 */
async function preloadMediaFiles(
  audioVersionId: string
): Promise<{ mediaFiles: number; mediaFilesVerses: number }> {
  try {
    // Fetch published media_files (limit initial fetch)
    const { data: mfData, error: mfError } = await supabase
      .from('media_files')
      .select('*')
      .eq('audio_version_id', audioVersionId)
      .eq('publish_status', 'published')
      .is('deleted_at', null)
      .limit(2000); // Initial limit to prevent queue overflow

    if (mfError) {
      logger.warn(ENABLE_LOGGING, 'Failed to fetch media_files:', mfError);
      return { mediaFiles: 0, mediaFilesVerses: 0 };
    }

    if (!mfData || mfData.length === 0) {
      return { mediaFiles: 0, mediaFilesVerses: 0 };
    }

    // Insert media_files in batches
    const BATCH_SIZE = 500;
    let insertedMediaFiles = 0;

    for (let i = 0; i < mfData.length; i += BATCH_SIZE) {
      const batch = mfData.slice(i, i + BATCH_SIZE);

      try {
        await powerSyncSystem.execute('BEGIN');

        // Build bulk INSERT with multiple VALUES
        const values = batch
          .map(
            () =>
              '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .join(', ');
        const params = batch.flatMap(mf => [
          mf.id,
          mf.language_entity_id ?? null,
          mf.media_type ?? null,
          mf.file_size ?? null,
          mf.duration_seconds ?? null,
          mf.upload_status ?? null,
          mf.publish_status ?? null,
          mf.check_status ?? null,
          mf.version ?? null,
          mf.created_at ?? null,
          mf.created_by ?? null,
          mf.updated_at ?? null,
          mf.deleted_at ?? null,
          mf.is_bible_audio ?? null,
          mf.start_verse_id ?? null,
          mf.end_verse_id ?? null,
          mf.audio_version_id ?? null,
          mf.chapter_id ?? null,
          mf.object_key ?? null,
          mf.storage_provider ?? null,
          mf.original_filename ?? null,
          mf.file_type ?? null,
        ]);

        await powerSyncSystem.execute(
          `INSERT OR REPLACE INTO media_files 
           (id, language_entity_id, media_type, file_size, duration_seconds, upload_status, 
            publish_status, check_status, version, created_at, created_by, updated_at, 
            deleted_at, is_bible_audio, start_verse_id, end_verse_id, audio_version_id, 
            chapter_id, object_key, storage_provider, original_filename, file_type)
           VALUES ${values}`,
          params
        );

        await powerSyncSystem.execute('COMMIT');
        insertedMediaFiles += batch.length;

        // Small delay between batches
        if (i + BATCH_SIZE < mfData.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (batchError) {
        try {
          await powerSyncSystem.execute('ROLLBACK');
        } catch {
          // Ignore rollback errors
        }
        logger.warn(
          ENABLE_LOGGING,
          `Failed to insert batch of media_files (${i}-${i + batch.length}):`,
          batchError
        );
        // Continue with next batch
      }
    }

    // Fetch media_files_verses for these media_files
    const mediaFileIds = mfData.map(mf => mf.id);
    const { data: mfvData, error: mfvError } = await supabase
      .from('media_files_verses')
      .select('*')
      .in('media_file_id', mediaFileIds)
      .is('deleted_at', null)
      .limit(5000); // Limit to prevent queue overflow

    let insertedVerses = 0;

    if (!mfvError && mfvData && mfvData.length > 0) {
      // Insert media_files_verses in batches
      for (let i = 0; i < mfvData.length; i += BATCH_SIZE) {
        const batch = mfvData.slice(i, i + BATCH_SIZE);

        try {
          await powerSyncSystem.execute('BEGIN');

          // Build bulk INSERT with multiple VALUES
          const values = batch
            .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .join(', ');
          const params = batch.flatMap(mfv => [
            mfv.id,
            mfv.media_file_id,
            mfv.verse_id,
            mfv.start_time_seconds ?? null,
            mfv.duration_seconds ?? null,
            mfv.created_by ?? null,
            mfv.created_at ?? null,
            mfv.updated_at ?? null,
            mfv.deleted_at ?? null,
            mfv.denormalized_audio_version_id ?? null,
          ]);

          await powerSyncSystem.execute(
            `INSERT OR REPLACE INTO media_files_verses 
             (id, media_file_id, verse_id, start_time_seconds, duration_seconds, 
              created_by, created_at, updated_at, deleted_at, denormalized_audio_version_id)
             VALUES ${values}`,
            params
          );

          await powerSyncSystem.execute('COMMIT');
          insertedVerses += batch.length;

          // Small delay between batches
          if (i + BATCH_SIZE < mfvData.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } catch (batchError) {
          try {
            await powerSyncSystem.execute('ROLLBACK');
          } catch {
            // Ignore rollback errors
          }
          logger.warn(
            ENABLE_LOGGING,
            `Failed to insert batch of media_files_verses (${i}-${i + batch.length}):`,
            batchError
          );
          // Continue with next batch
        }
      }
    }

    logger.info(
      ENABLE_LOGGING,
      `Preloaded ${insertedMediaFiles} media_files and ${insertedVerses} media_files_verses for audio version ${audioVersionId}`
    );

    return {
      mediaFiles: insertedMediaFiles,
      mediaFilesVerses: insertedVerses,
    };
  } catch (error) {
    logger.error(ENABLE_LOGGING, 'Error preloading media_files:', error);
    return { mediaFiles: 0, mediaFilesVerses: 0 };
  }
}
