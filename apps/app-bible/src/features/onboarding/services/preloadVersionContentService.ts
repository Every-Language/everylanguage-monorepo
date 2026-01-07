import { supabase } from '@/shared/services/api/supabase';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = true;

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
 * Type for verse_texts row from Supabase
 */
interface VerseTextRow {
  id: string;
  verse_id: string;
  text_version_id: string | null;
  verse_text: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  version: number | null;
  publish_status: 'pending' | 'published' | 'archived' | null;
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
  // Direct console log to ensure we see it's being called
  console.log(
    '[preloadVersionContent] 🚀 STARTING - textVersionId:',
    textVersionId,
    'audioVersionId:',
    audioVersionId
  );

  logger.info(
    ENABLE_LOGGING,
    `[preloadVersionContent] Starting preload - textVersionId: ${textVersionId}, audioVersionId: ${audioVersionId}`
  );

  const result: PreloadResult = {
    verseTexts: 0,
    mediaFiles: 0,
    mediaFilesVerses: 0,
  };

  // Preload verse_texts if text version selected
  if (textVersionId) {
    console.log('[preloadVersionContent] Preloading verse_texts...');
    const count = await preloadVerseTexts(textVersionId, onProgress);
    result.verseTexts = count;
    console.log(`[preloadVersionContent] ✅ Preloaded ${count} verse_texts`);
  } else {
    console.log('[preloadVersionContent] ⚠️ No textVersionId provided');
  }

  // Preload media_files and media_files_verses if audio version selected
  if (audioVersionId) {
    console.log('[preloadVersionContent] Preloading media_files...');
    const { mediaFiles, mediaFilesVerses } =
      await preloadMediaFiles(audioVersionId);
    result.mediaFiles = mediaFiles;
    result.mediaFilesVerses = mediaFilesVerses;
    console.log(
      `[preloadVersionContent] ✅ Preloaded ${mediaFiles} media_files and ${mediaFilesVerses} media_files_verses`
    );
  } else {
    console.log('[preloadVersionContent] ⚠️ No audioVersionId provided');
  }

  console.log(
    '[preloadVersionContent] ✅ COMPLETE - Result:',
    JSON.stringify(result, null, 2)
  );

  logger.info(
    ENABLE_LOGGING,
    `[preloadVersionContent] Complete - Result: ${JSON.stringify(result)}`
  );

  return result;
}

/**
 * Fetch and insert verse_texts for a text version
 * Uses pagination to fetch all verses and optimized batched inserts
 * Fetches all ~31,000 verses to ensure immediate availability after onboarding
 */
async function preloadVerseTexts(
  textVersionId: string,
  onProgress?: (progress: PreloadProgress) => void
): Promise<number> {
  // Direct console log to ensure visibility
  console.log(
    `[preloadVerseTexts] 🚀 STARTING for text_version_id: ${textVersionId}`
  );

  try {
    logger.info(
      ENABLE_LOGGING,
      `[preloadVerseTexts] Starting preload for text_version_id: ${textVersionId}`
    );

    // DIAGNOSTIC: Check text_version status first
    console.log(
      `[preloadVerseTexts] 🔍 DIAGNOSTIC: Checking text_version status...`
    );
    try {
      const { data: textVersionData, error: tvError } = await supabase
        .from('text_versions')
        .select('id, name, publish_status, project_id')
        .eq('id', textVersionId)
        .single();

      if (tvError) {
        console.error(
          `[preloadVerseTexts] ❌ Failed to fetch text_version:`,
          JSON.stringify(tvError, null, 2)
        );
      } else if (textVersionData) {
        console.log(
          `[preloadVerseTexts] 📋 Text Version Info:`,
          JSON.stringify(textVersionData, null, 2)
        );
      } else {
        console.warn(
          `[preloadVerseTexts] ⚠️ Text version ${textVersionId} not found`
        );
      }
    } catch (tvErr) {
      console.error(
        `[preloadVerseTexts] ❌ Exception checking text_version:`,
        tvErr
      );
    }

    // DIAGNOSTIC: Check verse_texts counts with different filters
    console.log(
      `[preloadVerseTexts] 🔍 DIAGNOSTIC: Checking verse_texts counts...`
    );
    try {
      // Total count (no filters)
      const { count: totalCount, error: totalError } = await supabase
        .from('verse_texts')
        .select('*', { count: 'exact', head: true })
        .eq('text_version_id', textVersionId);

      // Count by publish_status
      const { count: publishedCount, error: publishedError } = await supabase
        .from('verse_texts')
        .select('*', { count: 'exact', head: true })
        .eq('text_version_id', textVersionId)
        .eq('publish_status', 'published');

      // Count not deleted
      const { count: notDeletedCount, error: notDeletedError } = await supabase
        .from('verse_texts')
        .select('*', { count: 'exact', head: true })
        .eq('text_version_id', textVersionId)
        .is('deleted_at', null);

      // Count with both filters (what we'll actually fetch)
      const { count: availableCount, error: availableError } = await supabase
        .from('verse_texts')
        .select('*', { count: 'exact', head: true })
        .eq('text_version_id', textVersionId)
        .eq('publish_status', 'published')
        .is('deleted_at', null);

      console.log(
        `[preloadVerseTexts] 📊 DIAGNOSTIC Counts:`,
        JSON.stringify(
          {
            total: totalCount ?? 'error',
            totalError: totalError ? totalError.message : null,
            published: publishedCount ?? 'error',
            publishedError: publishedError ? publishedError.message : null,
            notDeleted: notDeletedCount ?? 'error',
            notDeletedError: notDeletedError ? notDeletedError.message : null,
            available: availableCount ?? 'error',
            availableError: availableError ? availableError.message : null,
          },
          null,
          2
        )
      );

      if (totalError) {
        console.error(
          `[preloadVerseTexts] ❌ Total count error:`,
          JSON.stringify(totalError, null, 2)
        );
      }
      if (publishedError) {
        console.error(
          `[preloadVerseTexts] ❌ Published count error:`,
          JSON.stringify(publishedError, null, 2)
        );
      }
      if (notDeletedError) {
        console.error(
          `[preloadVerseTexts] ❌ Not deleted count error:`,
          JSON.stringify(notDeletedError, null, 2)
        );
      }
      if (availableError) {
        console.error(
          `[preloadVerseTexts] ❌ Available count error:`,
          JSON.stringify(availableError, null, 2)
        );
      }
    } catch (diagErr) {
      console.error(
        `[preloadVerseTexts] ❌ Exception in diagnostic queries:`,
        diagErr
      );
    }

    // First, get the total count to show accurate progress
    // Try with publish_status filter first, fallback to without if needed
    let totalCount: number | null = null;
    let usePublishStatusFilter = true;
    try {
      const { count, error: countError } = await supabase
        .from('verse_texts')
        .select('*', { count: 'exact', head: true })
        .eq('text_version_id', textVersionId)
        .eq('publish_status', 'published')
        .is('deleted_at', null);

      if (countError) {
        console.error(
          `[preloadVerseTexts] ❌ Count error with publish_status filter:`,
          JSON.stringify(countError, null, 2)
        );
        logger.warn(ENABLE_LOGGING, 'Failed to count verse_texts:', countError);

        // Fallback: Try without publish_status filter
        console.log(
          `[preloadVerseTexts] 🔄 Fallback: Trying count without publish_status filter...`
        );
        const { count: fallbackCount, error: fallbackError } = await supabase
          .from('verse_texts')
          .select('*', { count: 'exact', head: true })
          .eq('text_version_id', textVersionId)
          .is('deleted_at', null);

        if (fallbackError) {
          console.error(
            `[preloadVerseTexts] ❌ Fallback count error:`,
            JSON.stringify(fallbackError, null, 2)
          );
        } else {
          totalCount = fallbackCount ?? null;
          usePublishStatusFilter = false;
          console.log(
            `[preloadVerseTexts] ⚠️ Using fallback count (without publish_status filter): ${totalCount}`
          );
        }
      } else {
        totalCount = count ?? null;
        console.log(
          `[preloadVerseTexts] 📊 Found ${totalCount} verse_texts (with publish_status='published') for text_version_id: ${textVersionId}`
        );
        logger.info(
          ENABLE_LOGGING,
          `[preloadVerseTexts] Found ${totalCount} verse_texts for text_version_id: ${textVersionId}`
        );
      }
    } catch (countErr) {
      console.error(
        `[preloadVerseTexts] ❌ Exception while counting verse_texts:`,
        countErr
      );
      logger.warn(
        ENABLE_LOGGING,
        'Exception while counting verse_texts:',
        countErr
      );
    }

    // Optimized batch sizes for better performance
    const FETCH_PAGE_SIZE = 5000; // Fetch 5000 at a time from Supabase
    const INSERT_BATCH_SIZE = 1500; // Insert 1500 at a time into PowerSync
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    let inserted = 0;
    let offset = 0;
    let hasMore = true;

    // Fetch and insert in pages
    let pageNumber = 0;
    while (hasMore) {
      pageNumber++;
      let retryCount = 0;
      let fetchSuccess = false;
      let pageData: VerseTextRow[] = [];

      console.log(
        `[preloadVerseTexts] 📥 Fetching page ${pageNumber} (offset: ${offset}, limit: ${FETCH_PAGE_SIZE})`
      );
      logger.info(
        ENABLE_LOGGING,
        `[preloadVerseTexts] Fetching page ${pageNumber} (offset: ${offset}, limit: ${FETCH_PAGE_SIZE})`
      );

      // Retry logic for fetching from Supabase
      while (retryCount < MAX_RETRIES && !fetchSuccess) {
        try {
          // Build query based on whether we should use publish_status filter
          let query = supabase
            .from('verse_texts')
            .select('*')
            .eq('text_version_id', textVersionId);

          if (usePublishStatusFilter) {
            query = query.eq('publish_status', 'published');
          }

          query = query
            .is('deleted_at', null)
            .order('id', { ascending: true })
            .range(offset, offset + FETCH_PAGE_SIZE - 1);

          const { data, error } = await query;

          if (error) {
            console.error(
              `[preloadVerseTexts] ❌ Supabase query error:`,
              JSON.stringify(error, null, 2)
            );
            console.error(
              `[preloadVerseTexts] Query details: text_version_id=${textVersionId}, publish_status filter=${usePublishStatusFilter}, offset=${offset}, limit=${FETCH_PAGE_SIZE}`
            );
            throw error;
          }

          if (!data || data.length === 0) {
            hasMore = false;
            fetchSuccess = true;
            logger.info(
              ENABLE_LOGGING,
              `[preloadVerseTexts] No more data at offset ${offset}, finished fetching`
            );
            break;
          }

          pageData = data;
          fetchSuccess = true;
          console.log(
            `[preloadVerseTexts] ✅ Fetched ${pageData.length} verse_texts from page ${pageNumber}`
          );
          logger.info(
            ENABLE_LOGGING,
            `[preloadVerseTexts] Fetched ${pageData.length} verse_texts from page ${pageNumber}`
          );
        } catch (fetchError) {
          retryCount++;
          console.error(
            `[preloadVerseTexts] ❌ Fetch error (retry ${retryCount}/${MAX_RETRIES}):`,
            JSON.stringify(fetchError, null, 2)
          );
          logger.warn(
            ENABLE_LOGGING,
            `Failed to fetch verse_texts page (offset ${offset}, retry ${retryCount}/${MAX_RETRIES}):`,
            fetchError
          );

          if (retryCount < MAX_RETRIES) {
            // Exponential backoff
            console.log(
              `[preloadVerseTexts] ⏳ Waiting ${RETRY_DELAY * retryCount}ms before retry...`
            );
            await new Promise(resolve =>
              setTimeout(resolve, RETRY_DELAY * retryCount)
            );
          } else {
            console.error(
              `[preloadVerseTexts] ❌ Failed to fetch verse_texts after ${MAX_RETRIES} retries. Final error:`,
              JSON.stringify(fetchError, null, 2)
            );
            logger.error(
              ENABLE_LOGGING,
              `Failed to fetch verse_texts after ${MAX_RETRIES} retries`
            );
            throw fetchError;
          }
        }
      }

      if (!fetchSuccess || pageData.length === 0) {
        break;
      }

      // Process fetched data in optimized batches
      const batchCount = Math.ceil(pageData.length / INSERT_BATCH_SIZE);
      console.log(
        `[preloadVerseTexts] 🔄 Processing page ${pageNumber} in ${batchCount} batches of ${INSERT_BATCH_SIZE}`
      );
      logger.info(
        ENABLE_LOGGING,
        `[preloadVerseTexts] Processing page ${pageNumber} in ${batchCount} batches of ${INSERT_BATCH_SIZE}`
      );

      for (let i = 0; i < pageData.length; i += INSERT_BATCH_SIZE) {
        const batch = pageData.slice(i, i + INSERT_BATCH_SIZE);
        const batchNumber = Math.floor(i / INSERT_BATCH_SIZE) + 1;
        let insertRetryCount = 0;
        let insertSuccess = false;

        console.log(
          `[preloadVerseTexts] 💾 Inserting batch ${batchNumber}/${batchCount} (${batch.length} verses) into verse_texts table`
        );
        logger.info(
          ENABLE_LOGGING,
          `[preloadVerseTexts] Inserting batch ${batchNumber}/${batchCount} (${batch.length} verses) into verse_texts table`
        );

        // Retry logic for inserting into PowerSync
        while (insertRetryCount < MAX_RETRIES && !insertSuccess) {
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
            insertSuccess = true;

            const progressPercent = totalCount
              ? ((inserted / totalCount) * 100).toFixed(1)
              : '?';

            console.log(
              `[preloadVerseTexts] ✅ Batch ${batchNumber} complete. Progress: ${inserted}/${totalCount ?? '?'} (${progressPercent}%)`
            );
            logger.info(
              ENABLE_LOGGING,
              `[preloadVerseTexts] ✅ Batch ${batchNumber} complete. Progress: ${inserted}/${totalCount ?? '?'} (${progressPercent}%)`
            );

            // Report progress after each batch
            // Use inserted count as total if we don't have accurate count
            if (onProgress) {
              onProgress({
                current: inserted,
                total: totalCount ?? inserted,
                type: 'verse_texts',
              });
            }
          } catch (batchError) {
            insertRetryCount++;
            try {
              await powerSyncSystem.execute('ROLLBACK');
            } catch {
              // Ignore rollback errors
            }

            if (insertRetryCount < MAX_RETRIES) {
              logger.warn(
                ENABLE_LOGGING,
                `Failed to insert batch of verse_texts (${i}-${i + batch.length}, retry ${insertRetryCount}/${MAX_RETRIES}):`,
                batchError
              );
              // Exponential backoff
              await new Promise(resolve =>
                setTimeout(resolve, RETRY_DELAY * insertRetryCount)
              );
            } else {
              logger.error(
                ENABLE_LOGGING,
                `Failed to insert batch after ${MAX_RETRIES} retries:`,
                batchError
              );
              // Continue with next batch instead of failing completely
              break;
            }
          }
        }

        // Small delay between batches to let queue process (only if not last batch)
        if (i + INSERT_BATCH_SIZE < pageData.length) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      // Check if we've fetched all data
      if (pageData.length < FETCH_PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += FETCH_PAGE_SIZE;
      }
    }

    console.log(
      `[preloadVerseTexts] 🎉 COMPLETE: Preloaded ${inserted} verse_texts for text_version_id: ${textVersionId}`
    );
    logger.info(
      ENABLE_LOGGING,
      `[preloadVerseTexts] ✅ COMPLETE: Preloaded ${inserted} verse_texts for text_version_id: ${textVersionId}`
    );
    if (totalCount !== null) {
      const matchStatus = inserted === totalCount ? '✅' : '⚠️';
      console.log(
        `[preloadVerseTexts] Expected: ${totalCount}, Inserted: ${inserted}, Match: ${matchStatus}`
      );
      logger.info(
        ENABLE_LOGGING,
        `[preloadVerseTexts] Expected: ${totalCount}, Inserted: ${inserted}, Match: ${matchStatus}`
      );
    }

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
