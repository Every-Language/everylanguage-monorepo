/* eslint-disable @typescript-eslint/no-explicit-any */
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { streamingResolver } from '@/features/downloads/services/StreamingResolver';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import type {
  ChapterMedia,
  MediaFileWithDownload,
  VerseWithTiming,
  ChapterMediaOptions,
  StreamingUrlResult,
  BibleAudioError,
  BibleAudioErrorDetails,
} from '../types';

export class ChapterMediaResolver {
  // 🚀 PERFORMANCE: Cache for resolved chapter media
  private mediaCache = new Map<string, ChapterMedia>();
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Generate cache key for chapter media
   */
  private getCacheKey(chapterId: string, audioVersionId?: string): string {
    return `${chapterId}_${audioVersionId || 'default'}`;
  }

  /**
   * Clear cache for a specific chapter or all chapters
   */
  clearCache(chapterId?: string): void {
    if (chapterId) {
      // Clear specific chapter
      const keysToDelete = Array.from(this.mediaCache.keys()).filter(key =>
        key.startsWith(`${chapterId}_`)
      );
      keysToDelete.forEach(key => this.mediaCache.delete(key));
      logger.debug(ENABLE_LOGGING, `Cleared cache for chapter: ${chapterId}`);
    } else {
      // Clear all cache
      this.mediaCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
      logger.debug(ENABLE_LOGGING, 'Cleared all chapter media cache');
    }
  }

  /**
   * Invalidate cache when media files change (downloads, etc.)
   */
  invalidateCacheForChapter(chapterId: string): void {
    this.clearCache(chapterId);
    logger.debug(
      ENABLE_LOGGING,
      `Invalidated cache for chapter: ${chapterId} (media files changed)`
    );
  }

  /**
   * Invalidate cache for all chapters with a specific audio version
   */
  invalidateCacheForAudioVersion(audioVersionId: string): void {
    const keysToDelete = Array.from(this.mediaCache.keys()).filter(key =>
      key.endsWith(`_${audioVersionId}`)
    );
    keysToDelete.forEach(key => this.mediaCache.delete(key));
    logger.debug(
      ENABLE_LOGGING,
      `Invalidated cache for audio version: ${audioVersionId} (${keysToDelete.length} chapters)`
    );
  }

  /**
   * Pre-warm cache for first few chapters of a book (for faster book switching)
   */
  async preWarmBookCache(
    bookId: string,
    audioVersionId?: string,
    maxChapters: number = 3
  ): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return;
      }

      logger.debug(
        ENABLE_LOGGING,
        `Pre-warming cache for book: ${bookId} (first ${maxChapters} chapters)`
      );

      // Get first few chapters of the book
      const chapters = await powerSyncSystem.getAll(
        `SELECT c.id FROM chapters c 
         WHERE c.book_id = ? 
         ORDER BY c.chapter_number ASC 
         LIMIT ?`,
        [bookId, maxChapters]
      );

      // Pre-warm cache for each chapter in parallel
      const preWarmPromises = chapters.map(async (chapter: any) => {
        const cacheKey = this.getCacheKey(chapter.id, audioVersionId);
        if (!this.mediaCache.has(cacheKey)) {
          try {
            await this.resolveChapterMedia(chapter.id, {
              ...(audioVersionId ? { audioVersionId } : {}),
            });
          } catch (error) {
            // Non-fatal - some chapters might not have media
            logger.debug(
              ENABLE_LOGGING,
              `Pre-warm failed for chapter ${chapter.id}:`,
              error
            );
          }
        }
      });

      await Promise.allSettled(preWarmPromises);

      const stats = this.getCacheStats();
      logger.debug(
        ENABLE_LOGGING,
        `Pre-warming complete for book: ${bookId}. Cache: ${stats.size} chapters, ${stats.hitRate.toFixed(1)}% hit rate`
      );
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        'Pre-warming failed for book:',
        bookId,
        error
      );
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
      size: this.mediaCache.size,
    };
  }

  /**
   * Resolve complete chapter media information with caching
   */
  async resolveChapterMedia(
    chapterId: string,
    options: ChapterMediaOptions = {}
  ): Promise<ChapterMedia> {
    try {
      if (!powerSyncSystem.isInitialized) {
        throw this.createError(
          'unknown_error',
          'PowerSync not initialized',
          chapterId
        );
      }

      // 🚀 PERFORMANCE: Check cache first
      const cacheKey = this.getCacheKey(chapterId, options.audioVersionId);
      const cachedResult = this.mediaCache.get(cacheKey);

      if (cachedResult) {
        this.cacheHits++;
        logger.debug(
          ENABLE_LOGGING,
          `Cache HIT for chapter: ${chapterId} (${this.cacheHits} hits, ${this.cacheMisses} misses)`
        );
        return cachedResult;
      }

      this.cacheMisses++;
      logger.debug(
        ENABLE_LOGGING,
        `Cache MISS for chapter: ${chapterId} (${this.cacheHits} hits, ${this.cacheMisses} misses)`
      );

      // Resolving chapter media with parallel database queries for performance
      const startTime = Date.now();

      // 🚀 OPTIMIZATION: Run all database queries in parallel
      const [chapterInfo, mediaFiles, verses] = await Promise.all([
        this.getChapterInfo(chapterId),
        this.getMediaFiles(chapterId, options.audioVersionId),
        this.getVerseTimings(chapterId, options.audioVersionId),
      ]);

      const queryTime = Date.now() - startTime;
      logger.debug(
        ENABLE_LOGGING,
        `Chapter media queries completed in ${queryTime}ms for chapter: ${chapterId}`
      );

      // Performance monitoring - log if queries take longer than expected
      if (queryTime > 1000) {
        logger.warn(
          ENABLE_LOGGING,
          `Slow chapter media resolution: ${queryTime}ms for chapter: ${chapterId}`
        );
      }

      // Validate chapter info
      if (!chapterInfo) {
        throw this.createError(
          'chapter_not_found',
          `Chapter not found: ${chapterId}`,
          chapterId
        );
      }

      // Handle case where no media files are found
      if (mediaFiles.length === 0) {
        logger.warn(
          ENABLE_LOGGING,
          `No media files found for chapter: ${chapterId}`
        );
        return this.createEmptyChapterMedia(chapterInfo, options);
      }

      // Calculate absolute timing for multi-file chapters
      const versesWithAbsoluteTiming = this.calculateAbsoluteTimings(
        verses,
        mediaFiles
      );

      // Calculate totals
      const totalDuration = mediaFiles.reduce(
        (sum, file) => sum + file.durationSeconds,
        0
      );
      const totalFileSize = mediaFiles.reduce(
        (sum, file) => sum + file.fileSize,
        0
      );
      const hasDownloadedFiles = mediaFiles.some(
        file => file.downloadStatus === 'completed' && file.localFilePath
      );
      const hasStreamingAvailable = mediaFiles.some(
        file => file.objectKey && file.storageProvider
      );

      const chapterMedia: ChapterMedia = {
        chapterId,
        bookName: chapterInfo.bookName,
        chapterNumber: chapterInfo.chapterNumber,
        ...(typeof chapterInfo.bookGlobalOrder === 'number'
          ? { bookGlobalOrder: chapterInfo.bookGlobalOrder }
          : {}),
        mediaFiles,
        verses: versesWithAbsoluteTiming,
        totalDuration,
        totalFileSize,
        hasDownloadedFiles,
        hasStreamingAvailable,
        audioVersionId: options.audioVersionId,
        textVersionId: options.textVersionId,
      };

      const totalTime = Date.now() - startTime;
      logger.debug(
        ENABLE_LOGGING,
        `Chapter media resolution completed in ${totalTime}ms (queries: ${queryTime}ms) for chapter: ${chapterId}`
      );

      // Performance monitoring - log if total resolution takes longer than expected
      if (totalTime > 2000) {
        logger.warn(
          ENABLE_LOGGING,
          `Slow chapter media resolution: ${totalTime}ms total for chapter: ${chapterId}`
        );
      }

      // 🚀 PERFORMANCE: Cache the resolved result
      this.mediaCache.set(cacheKey, chapterMedia);

      // Log cache statistics periodically
      const stats = this.getCacheStats();
      if (
        stats.hits + stats.misses > 0 &&
        (stats.hits + stats.misses) % 10 === 0
      ) {
        logger.info(
          ENABLE_LOGGING,
          `Chapter media cache stats: ${stats.hitRate.toFixed(1)}% hit rate (${stats.hits}/${stats.hits + stats.misses}), ${stats.size} cached chapters`
        );
      }

      return chapterMedia;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error resolving chapter media:', error);
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw our custom errors
      }
      throw this.createError(
        'unknown_error',
        'Failed to resolve chapter media',
        chapterId,
        error
      );
    }
  }

  /**
   * Get streaming or local URL for a specific media file
   */
  async getMediaFileUrl(mediaFileId: string): Promise<StreamingUrlResult> {
    try {
      // logger.info(ENABLE_LOGGING, `Resolving URL for media file: ${mediaFileId}`);

      // First, check if we have a local file
      const localFile = await this.getLocalFilePath(mediaFileId);
      if (localFile) {
        // logger.info(ENABLE_LOGGING, `Using local file for media file: ${mediaFileId}`);
        // return {
        //   url: localFile,
        //   mediaFileId,
        //   isLocal: true,
        // };
      }

      // Fall back to streaming
      logger.info(
        ENABLE_LOGGING,
        `Getting streaming URL for media file: ${mediaFileId}`
      );
      const streamingUrl = await this.getStreamingUrl(mediaFileId);

      return {
        url: streamingUrl,
        mediaFileId,
        isLocal: false,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Error resolving URL for media file ${mediaFileId}:`,
        error
      );
      throw this.createError(
        'stream_unavailable',
        'Could not resolve media file URL',
        undefined,
        error,
        mediaFileId
      );
    }
  }

  /**
   * Check if chapter has any available media (offline or streaming)
   */
  async hasAvailableMedia(
    chapterId: string,
    audioVersionId?: string
  ): Promise<boolean> {
    try {
      const mediaFiles = await this.getMediaFiles(chapterId, audioVersionId);
      return (
        mediaFiles.length > 0 &&
        mediaFiles.some(
          file =>
            // Has local file OR can stream
            (file.downloadStatus === 'completed' && file.localFilePath) ||
            (file.objectKey && file.storageProvider)
        )
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Error checking media availability for chapter ${chapterId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get basic chapter information
   */
  private async getChapterInfo(chapterId: string): Promise<{
    bookName: string;
    chapterNumber: number;
    bookGlobalOrder?: number | undefined;
  } | null> {
    const rows = await powerSyncSystem.getAll(
      `SELECT 
         c.chapter_number,
         b.name as book_name,
         b.global_order as book_global_order
       FROM chapters c
       JOIN books b ON b.id = c.book_id
       WHERE c.id = ?
       LIMIT 1`,
      [chapterId]
    );

    const row = rows[0] as
      | {
          chapter_number: number;
          book_name: string;
          book_global_order?: number | undefined;
        }
      | undefined;
    if (!row) return null;

    return {
      bookName: row.book_name,
      chapterNumber: row.chapter_number,
      bookGlobalOrder:
        typeof row.book_global_order === 'number'
          ? row.book_global_order
          : undefined,
    };
  }

  /**
   * Get media files for a chapter with download information
   */
  private async getMediaFiles(
    chapterId: string,
    audioVersionId?: string
  ): Promise<MediaFileWithDownload[]> {
    const rows = await powerSyncSystem.getAll(
      `SELECT 
         mf.id,
         mf.chapter_id as chapterId,
         mf.audio_version_id as audioVersionId,
         mf.language_entity_id as languageEntityId,
         mf.media_type as mediaType,
         mf.file_size as fileSize,
         mf.duration_seconds as durationSeconds,
         mf.upload_status as uploadStatus,
         mf.publish_status as publishStatus,
         mf.check_status as checkStatus,
         mf.version,
         mf.created_at as createdAt,
         mf.created_by as createdBy,
         mf.updated_at as updatedAt,
         mf.deleted_at as deletedAt,
         mf.is_bible_audio as isBibleAudio,
         mf.start_verse_id as startVerseId,
         mf.end_verse_id as endVerseId,
         mf.object_key as objectKey,
         mf.storage_provider as storageProvider,
         mf.original_filename as originalFilename,
         mf.file_type as fileType,
         
         -- Download information from local table
         COALESCE(mfd.local_file_path, '') as localFilePath,
         COALESCE(mfd.download_status, 'pending') as downloadStatus,
         COALESCE(mfd.progress, 0) as progress,
         COALESCE(mfd.downloaded_bytes, 0) as downloadedBytes,
         COALESCE(mfd.file_size_bytes, mf.file_size) as fileSizeBytes,
         mfd.error_message as errorMessage,
         COALESCE(mfd.priority, 0) as priority,
         COALESCE(mfd.retry_count, 0) as retryCount,
         mfd.last_attempt_at as lastAttemptAt,
         mfd.downloaded_at as downloadedAt
         
       FROM media_files mf
       LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
       WHERE mf.chapter_id = ? 
         AND mf.deleted_at IS NULL
         AND (? IS NULL OR mf.audio_version_id = ?)
       ORDER BY mf.start_verse_id ASC, mf.created_at ASC`,
      [chapterId, audioVersionId ?? null, audioVersionId ?? null]
    );

    return (rows as any[]).map(row => ({
      id: row.id,
      chapterId: row.chapterId,
      audioVersionId: row.audioVersionId,
      languageEntityId: row.languageEntityId,
      mediaType: row.mediaType,
      fileSize: Number(row.fileSize || 0),
      durationSeconds: Number(row.durationSeconds || 0),
      uploadStatus: row.uploadStatus,
      publishStatus: row.publishStatus,
      checkStatus: row.checkStatus,
      version: Number(row.version || 0),
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt || undefined,
      isBibleAudio: Boolean(row.isBibleAudio),
      startVerseId: row.startVerseId,
      endVerseId: row.endVerseId,
      objectKey: row.objectKey,
      storageProvider: row.storageProvider,
      originalFilename: row.originalFilename,
      fileType: row.fileType,

      // Download info
      localFilePath: row.localFilePath || undefined,
      downloadStatus: row.downloadStatus as any,
      progress: Number(row.progress || 0),
      downloadedBytes: Number(row.downloadedBytes || 0),
      fileSizeBytes: Number(row.fileSizeBytes || 0),
      errorMessage: row.errorMessage || undefined,
      priority: Number(row.priority || 0),
      retryCount: Number(row.retryCount || 0),
      lastAttemptAt: row.lastAttemptAt || undefined,
      downloadedAt: row.downloadedAt || undefined,
    }));
  }

  /**
   * Get verse timings for a chapter
   */
  private async getVerseTimings(
    chapterId: string,
    audioVersionId?: string
  ): Promise<VerseWithTiming[]> {
    const rows = await powerSyncSystem.getAll(
      `SELECT 
         mv.id,
         mv.media_file_id as mediaFileId,
         mv.verse_id as verseId,
         mv.start_time_seconds as startTimeSeconds,
         mv.duration_seconds as durationSeconds,
         mv.created_by as createdBy,
         mv.created_at as createdAt,
         mv.updated_at as updatedAt,
         mv.deleted_at as deletedAt,
         mv.denormalized_audio_version_id as denormalizedAudioVersionId,
         v.verse_number as verseNumber
       FROM media_files_verses mv
       JOIN media_files mf ON mf.id = mv.media_file_id
       JOIN verses v ON v.id = mv.verse_id
       WHERE mf.chapter_id = ?
         AND mf.deleted_at IS NULL
         AND mv.deleted_at IS NULL
         AND (? IS NULL OR mf.audio_version_id = ?)
       ORDER BY v.global_order ASC, mv.start_time_seconds ASC`,
      [chapterId, audioVersionId ?? null, audioVersionId ?? null]
    );

    return (rows as any[]).map(row => ({
      id: row.id,
      mediaFileId: row.mediaFileId,
      verseId: row.verseId,
      verseNumber: Number(row.verseNumber || 0),
      startTimeSeconds: Number(row.startTimeSeconds || 0),
      durationSeconds: Number(row.durationSeconds || 0),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt || undefined,
      denormalizedAudioVersionId: row.denormalizedAudioVersionId,

      // Will be calculated later
      absoluteStartTime: 0,
      absoluteEndTime: 0,
    }));
  }

  /**
   * Calculate absolute timings for verses across multiple files
   */
  private calculateAbsoluteTimings(
    verses: VerseWithTiming[],
    mediaFiles: MediaFileWithDownload[]
  ): VerseWithTiming[] {
    // Create a map of media file ID to cumulative duration
    const fileDurationMap = new Map<
      string,
      { offset: number; duration: number }
    >();
    let cumulativeOffset = 0;

    // Sort media files by start verse to ensure correct order
    const sortedFiles = [...mediaFiles].sort((a, b) => {
      // Basic sort by creation date as fallback
      return a.createdAt.localeCompare(b.createdAt);
    });

    for (const file of sortedFiles) {
      fileDurationMap.set(file.id, {
        offset: cumulativeOffset,
        duration: file.durationSeconds,
      });
      cumulativeOffset += file.durationSeconds;
    }

    // Calculate absolute timings for each verse
    return verses.map(verse => {
      const fileInfo = fileDurationMap.get(verse.mediaFileId);
      if (!fileInfo) {
        logger.warn(
          ENABLE_LOGGING,
          `No file info found for media file: ${verse.mediaFileId}`
        );
        return {
          ...verse,
          absoluteStartTime: verse.startTimeSeconds,
          absoluteEndTime: verse.startTimeSeconds + verse.durationSeconds,
        };
      }

      const absoluteStartTime = fileInfo.offset + verse.startTimeSeconds;
      const absoluteEndTime = absoluteStartTime + verse.durationSeconds;

      return {
        ...verse,
        absoluteStartTime,
        absoluteEndTime,
      };
    });
  }

  /**
   * Get local file path if available
   */
  private async getLocalFilePath(mediaFileId: string): Promise<string | null> {
    const rows = await powerSyncSystem.getAll(
      `SELECT local_file_path 
       FROM media_files_downloads 
       WHERE media_file_id = ? 
         AND download_status = 'completed'
         AND local_file_path IS NOT NULL
         AND local_file_path != ''
       LIMIT 1`,
      [mediaFileId]
    );

    const row = rows[0] as { local_file_path: string } | undefined;
    return row?.local_file_path || null;
  }

  /**
   * Get streaming URL using existing streaming resolver
   */
  private async getStreamingUrl(mediaFileId: string): Promise<string> {
    // Get chapter ID for the media file
    const rows = await powerSyncSystem.getAll(
      `SELECT chapter_id FROM media_files WHERE id = ? LIMIT 1`,
      [mediaFileId]
    );

    const row = rows[0] as { chapter_id: string } | undefined;
    if (!row) {
      throw this.createError(
        'file_not_found',
        `Media file not found: ${mediaFileId}`,
        undefined,
        undefined,
        mediaFileId
      );
    }

    // Use existing streaming resolver
    const result = await streamingResolver.resolveStreamingUrlForChapter(
      row.chapter_id
    );
    if (!result) {
      throw this.createError(
        'stream_unavailable',
        'Could not resolve streaming URL',
        row.chapter_id,
        undefined,
        mediaFileId
      );
    }

    return result.url;
  }

  /**
   * Create empty chapter media object for chapters without media files
   */
  private createEmptyChapterMedia(
    chapterInfo: { bookName: string; chapterNumber: number },
    options: ChapterMediaOptions
  ): ChapterMedia {
    return {
      chapterId: '', // Will be set by caller
      bookName: chapterInfo.bookName,
      chapterNumber: chapterInfo.chapterNumber,
      mediaFiles: [],
      verses: [],
      totalDuration: 0,
      totalFileSize: 0,
      hasDownloadedFiles: false,
      hasStreamingAvailable: false,
      audioVersionId: options.audioVersionId,
      textVersionId: options.textVersionId,
    };
  }

  /**
   * Create standardized error objects
   */
  private createError(
    type: BibleAudioError,
    message: string,
    chapterId?: string,
    originalError?: unknown,
    mediaFileId?: string
  ): BibleAudioErrorDetails & Error {
    const error = new Error(message) as BibleAudioErrorDetails & Error;
    error.type = type;
    error.message = message;
    error.chapterId = chapterId;
    error.mediaFileId = mediaFileId;
    error.originalError = originalError;
    error.timestamp = new Date();
    return error;
  }
}

// Export singleton instance
export const chapterMediaResolver = new ChapterMediaResolver();
