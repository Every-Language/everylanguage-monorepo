import * as FileSystem from 'expo-file-system';
import { chapterMediaResolver } from './ChapterMediaResolver';
import { logger } from '@/shared/utils/logger';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { Image } from 'react-native';
import { getBookImageByNumber } from '@/features/bible/assets/bookArtRegistry';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import type {
  ChapterMedia,
  BibleTrack,
  ChapterMediaOptions,
  MediaFileWithDownload,
  BibleAudioError,
  BibleAudioErrorDetails,
  VerseWithTiming,
} from '../types';

export class TrackBuilder {
  /**
   * Build a RNTP-compatible track from chapter media data
   */
  async buildChapterTrack(
    chapterId: string,
    options: ChapterMediaOptions = {}
  ): Promise<BibleTrack | undefined> {
    try {
      // Building track (reduced logging)

      // Resolve chapter media
      const chapterMedia = await chapterMediaResolver.resolveChapterMedia(
        chapterId,
        options
      );

      if (chapterMedia.mediaFiles.length === 0) {
        // ✅ GRACEFUL HANDLING: Return undefined instead of throwing for missing chapters
        logger.warn(
          ENABLE_LOGGING,
          `[TrackBuilder] No media files for chapter ${chapterId}, skipping gracefully`
        );
        return undefined; // Let caller handle missing chapters
      }

      // Get the first playable URL
      const primaryUrl = await this.resolvePrimaryUrl(chapterMedia.mediaFiles);

      // Resolve display artist (audio version name) for OS background UI
      const resolvedArtistName = await this.getAudioVersionName(
        options.audioVersionId
      );

      // Build the track
      const track: BibleTrack = {
        // Required RNTP fields
        id: this.generateTrackId(chapterId, options.audioVersionId),
        url: primaryUrl.url,
        title: this.buildTrackTitle(chapterMedia),
        artist: resolvedArtistName ?? 'Bible Audio',
        duration: chapterMedia.totalDuration,

        // Optional RNTP fields - only set if artwork exists
        ...(this.getArtworkUrl(chapterMedia)
          ? { artwork: this.getArtworkUrl(chapterMedia)! }
          : {}),

        // Our extensions
        chapterId,
        bookName: chapterMedia.bookName,
        chapterNumber: chapterMedia.chapterNumber,
        ...(typeof chapterMedia.bookGlobalOrder === 'number'
          ? { bookGlobalOrder: chapterMedia.bookGlobalOrder }
          : {}),
        audioVersionId: options.audioVersionId,
        textVersionId: options.textVersionId,

        // Verse timing for seeking and highlighting
        verses: chapterMedia.verses,

        // Multi-file support
        mediaFiles: chapterMedia.mediaFiles,
        isMultiFile: chapterMedia.mediaFiles.length > 1,

        // Metadata for UI
        subtitle: this.buildSubtitle(chapterMedia),
        description: this.buildDescription(chapterMedia),
      };

      // logger.debug(ENABLE_LOGGING, `Built track:`, {
      //   id: track.id,
      //   title: track.title,
      //   duration: track.duration,
      //   isMultiFile: track.isMultiFile,
      //   versesCount: track.verses.length,
      // });

      return track;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Error building track for chapter ${chapterId}:`,
        error
      );
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw our custom errors
      }
      throw this.createError(
        'unknown_error',
        'Failed to build track',
        chapterId,
        error
      );
    }
  }

  /**
   * Build a track for a specific verse range within a chapter
   */
  async buildVerseRangeTrack(
    chapterId: string,
    startVerseId: string,
    endVerseId: string,
    options: ChapterMediaOptions = {}
  ): Promise<BibleTrack | undefined> {
    try {
      logger.info(
        ENABLE_LOGGING,
        `[TrackBuilder] Building verse range track: ${startVerseId} - ${endVerseId} in chapter: ${chapterId}`
      );

      // First, get the full chapter media
      const chapterMedia = await chapterMediaResolver.resolveChapterMedia(
        chapterId,
        options
      );

      if (chapterMedia.mediaFiles.length === 0) {
        logger.warn(
          ENABLE_LOGGING,
          `[TrackBuilder] No media files for chapter ${chapterId}, skipping gracefully`
        );
        return undefined;
      }

      // Filter verses to the specified range
      const filteredVerses = this.filterVersesByRange(
        chapterMedia.verses,
        startVerseId,
        endVerseId
      );

      if (filteredVerses.length === 0) {
        logger.warn(
          ENABLE_LOGGING,
          `[TrackBuilder] No verses found in range ${startVerseId}-${endVerseId}`
        );
        return undefined;
      }

      // Calculate the start and end times for the range
      const rangeStartTime = Math.min(
        ...filteredVerses.map(v => v.absoluteStartTime)
      );
      const rangeEndTime = Math.max(
        ...filteredVerses.map(v => v.absoluteEndTime)
      );
      const rangeDuration = rangeEndTime - rangeStartTime;

      // Get the first playable URL
      const primaryUrl = await this.resolvePrimaryUrl(chapterMedia.mediaFiles);

      // Resolve display artist
      const resolvedArtistName = await this.getAudioVersionName(
        options.audioVersionId
      );

      // Build track title for verse range
      const startVerseNumber = filteredVerses[0]?.verseNumber || 1;
      const endVerseNumber =
        filteredVerses[filteredVerses.length - 1]?.verseNumber || 1;
      const rangeTitle =
        startVerseNumber === endVerseNumber
          ? `${chapterMedia.bookName} ${chapterMedia.chapterNumber}:${startVerseNumber}`
          : `${chapterMedia.bookName} ${chapterMedia.chapterNumber}:${startVerseNumber}-${endVerseNumber}`;

      // Build the track
      const track: BibleTrack = {
        // Required RNTP fields
        id: this.generateVerseRangeTrackId(
          chapterId,
          startVerseId,
          endVerseId,
          options.audioVersionId
        ),
        url: primaryUrl.url,
        title: rangeTitle,
        artist: resolvedArtistName ?? 'Bible Audio',
        duration: rangeDuration,

        // Optional RNTP fields
        ...(this.getArtworkUrl(chapterMedia)
          ? { artwork: this.getArtworkUrl(chapterMedia)! }
          : {}),

        // Our extensions
        chapterId,
        bookName: chapterMedia.bookName,
        chapterNumber: chapterMedia.chapterNumber,
        ...(typeof chapterMedia.bookGlobalOrder === 'number'
          ? { bookGlobalOrder: chapterMedia.bookGlobalOrder }
          : {}),
        audioVersionId: options.audioVersionId,
        textVersionId: options.textVersionId,

        // Filtered verse timing for the range
        verses: filteredVerses,

        // Multi-file support (same as chapter)
        mediaFiles: chapterMedia.mediaFiles,
        isMultiFile: chapterMedia.mediaFiles.length > 1,

        // Metadata for UI
        subtitle: this.buildVerseRangeSubtitle(
          chapterMedia,
          startVerseNumber,
          endVerseNumber
        ),
        description: `Verses ${startVerseNumber}-${endVerseNumber}`,

        // Verse range specific metadata
        verseRangeStartTime: rangeStartTime,
        verseRangeEndTime: rangeEndTime,
        isVerseRange: true,
      };

      logger.info(
        ENABLE_LOGGING,
        `[TrackBuilder] ✅ Built verse range track: ${track.title} (${rangeDuration}s)`
      );
      return track;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `[TrackBuilder] Error building verse range track for ${startVerseId}-${endVerseId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Build a track for a specific verse within a chapter
   */
  async buildVerseTrack(
    chapterId: string,
    verseId: string,
    options: ChapterMediaOptions = {}
  ): Promise<BibleTrack> {
    try {
      // logger.info(ENABLE_LOGGING, //   `Building verse track for verse: ${verseId} in chapter: ${chapterId}`
      // );

      // Build the full chapter track first
      const chapterTrack = await this.buildChapterTrack(chapterId, options);

      // ✅ HANDLE MISSING MEDIA: Check if track was built successfully
      if (!chapterTrack) {
        throw this.createError(
          'file_not_found',
          'No media files available for this chapter',
          chapterId
        );
      }

      // Find the target verse
      const targetVerse = chapterTrack.verses.find(v => v.verseId === verseId);
      if (!targetVerse) {
        logger.warn(
          ENABLE_LOGGING,
          `Verse ${verseId} not found in chapter ${chapterId}, using chapter start`
        );
        return chapterTrack;
      }

      // For now, we return the same track but could modify the initial position
      // The caller will handle seeking to the verse position
      // logger.info(ENABLE_LOGGING, //   `Built verse track - verse starts at ${targetVerse.absoluteStartTime}s`
      // );

      return {
        ...chapterTrack,
        // Keep subtitle consistent: always "{num} verses"
        subtitle: chapterTrack.subtitle,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Error building verse track for verse ${verseId}:`,
        error
      );
      if (error instanceof Error && 'type' in error) {
        throw error;
      }
      throw this.createError(
        'unknown_error',
        'Failed to build verse track',
        chapterId,
        error
      );
    }
  }

  /**
   * Validate that a track is playable
   */
  async validateTrack(track: BibleTrack): Promise<boolean> {
    try {
      // Check basic requirements
      if (!track.url || !track.id || !track.chapterId) {
        logger.warn(
          ENABLE_LOGGING,
          `Track validation failed: missing required fields`,
          {
            hasUrl: !!track.url,
            hasId: !!track.id,
            hasChapterId: !!track.chapterId,
          }
        );
        return false;
      }

      // Check if chapter still has available media
      const hasMedia = await chapterMediaResolver.hasAvailableMedia(
        track.chapterId,
        track.audioVersionId
      );

      if (!hasMedia) {
        logger.warn(
          ENABLE_LOGGING,
          `Track validation failed: no available media for chapter ${track.chapterId}`
        );
        return false;
      }

      // logger.info(ENABLE_LOGGING, `Track validation passed for: ${track.id}`);
      return true;
    } catch (error) {
      logger.error(ENABLE_LOGGING, `Error validating track:`, error);
      return false;
    }
  }

  /**
   * Resolve the primary URL for playback (local file preferred over streaming)
   */
  private async resolvePrimaryUrl(
    mediaFiles: MediaFileWithDownload[]
  ): Promise<{ url: string; mediaFileId: string }> {
    // Try to find a downloaded file first
    const downloadedFile = mediaFiles.find(
      file => file.downloadStatus === 'completed' && file.localFilePath
    );

    if (downloadedFile && downloadedFile.localFilePath) {
      // logger.info(ENABLE_LOGGING, `Using local file for playbook: ${downloadedFile.id}`);
      // logger.info(ENABLE_LOGGING, `Raw local file path: ${downloadedFile.localFilePath}`);

      // Convert to absolute path with file:// protocol for TrackPlayer
      const absoluteUrl = this.buildLocalFileUrl(downloadedFile.localFilePath);
      // logger.info(ENABLE_LOGGING, `Converted to absolute URL: ${absoluteUrl}`);

      return {
        url: absoluteUrl,
        mediaFileId: downloadedFile.id,
      };
    }

    // Fall back to streaming - use the first file
    const firstFile = mediaFiles[0];
    if (!firstFile) {
      throw this.createError('file_not_found', 'No media files available');
    }

    // logger.info(ENABLE_LOGGING, `Using streaming for playback: ${firstFile.id}`);
    const streamingResult = await chapterMediaResolver.getMediaFileUrl(
      firstFile.id
    );

    return {
      url: streamingResult.url,
      mediaFileId: firstFile.id,
    };
  }

  /**
   * Generate unique track ID
   */
  private generateTrackId(chapterId: string, audioVersionId?: string): string {
    const versionPart = audioVersionId ? `_${audioVersionId}` : '';
    return `chapter_${chapterId}${versionPart}`;
  }

  /**
   * Generate track ID for verse range
   */
  private generateVerseRangeTrackId(
    chapterId: string,
    startVerseId: string,
    endVerseId: string,
    audioVersionId?: string
  ): string {
    const versionPart = audioVersionId ? `_${audioVersionId}` : '';
    return `verse_range_${startVerseId}_${endVerseId}_${chapterId}${versionPart}`;
  }

  /**
   * Build human-readable track title
   */
  private buildTrackTitle(chapterMedia: ChapterMedia): string {
    return `${chapterMedia.bookName} ${chapterMedia.chapterNumber}`;
  }

  /**
   * Resolve audio version display name by id for background UI subtitle/artist.
   */
  private async getAudioVersionName(
    audioVersionId?: string
  ): Promise<string | undefined> {
    try {
      if (!audioVersionId) return undefined;
      if (!powerSyncSystem.isInitialized) return undefined;
      const rows = await powerSyncSystem.getAll(
        `SELECT name FROM audio_versions WHERE id = ? LIMIT 1`,
        [audioVersionId]
      );
      const row = rows[0] as { name?: string } | undefined;
      return row?.name || undefined;
    } catch (e) {
      logger.debug(
        ENABLE_LOGGING,
        '[TrackBuilder] Failed to resolve audio version name',
        e
      );
      return undefined;
    }
  }

  /**
   * Build track subtitle for UI display
   */
  private buildSubtitle(chapterMedia: ChapterMedia): string {
    const verseCount = chapterMedia.verses.length;
    return `${verseCount} verses`;
  }

  /**
   * Build track description
   */
  private buildDescription(chapterMedia: ChapterMedia): string {
    const parts: string[] = [];

    parts.push(
      `${chapterMedia.bookName} Chapter ${chapterMedia.chapterNumber}`
    );

    if (chapterMedia.verses.length > 0) {
      const firstVerse = Math.min(
        ...chapterMedia.verses.map(v => v.verseNumber)
      );
      const lastVerse = Math.max(
        ...chapterMedia.verses.map(v => v.verseNumber)
      );

      if (firstVerse === lastVerse) {
        parts.push(`Verse ${firstVerse}`);
      } else {
        parts.push(`Verses ${firstVerse}-${lastVerse}`);
      }
    }

    return parts.join(' • ');
  }

  /**
   * Build subtitle for verse range
   */
  private buildVerseRangeSubtitle(
    chapterMedia: ChapterMedia,
    startVerse: number,
    endVerse: number
  ): string {
    const verseCount = endVerse - startVerse + 1;
    return `Chapter ${chapterMedia.chapterNumber} • ${verseCount} verse${verseCount > 1 ? 's' : ''}`;
  }

  /**
   * Filter verses to a specific range
   */
  private filterVersesByRange(
    verses: VerseWithTiming[],
    startVerseId: string,
    endVerseId: string
  ): VerseWithTiming[] {
    // Parse verse IDs to get verse numbers
    const startVerseNumber = this.parseVerseNumber(startVerseId);
    const endVerseNumber = this.parseVerseNumber(endVerseId);

    if (startVerseNumber === -1 || endVerseNumber === -1) {
      logger.warn(ENABLE_LOGGING, '[TrackBuilder] Invalid verse ID format');
      return [];
    }

    return verses.filter(
      verse =>
        verse.verseNumber >= startVerseNumber &&
        verse.verseNumber <= endVerseNumber
    );
  }

  /**
   * Parse verse number from verse ID (e.g., "gen-1-1" -> 1)
   */
  private parseVerseNumber(verseId: string): number {
    const parts = verseId.split('-');
    if (parts.length >= 3) {
      const verseNumber = parseInt(parts[2]!, 10);
      return isNaN(verseNumber) ? -1 : verseNumber;
    }
    return -1;
  }

  /**
   * Get artwork URL for the track (book image or default)
   */
  private getArtworkUrl(chapterMedia: ChapterMedia): string | undefined {
    try {
      const bookNumber = chapterMedia.bookGlobalOrder;
      if (typeof bookNumber !== 'number' || bookNumber <= 0) return undefined;
      const img = getBookImageByNumber(bookNumber);
      if (!img) return undefined;
      const resolved = Image.resolveAssetSource(img);
      return resolved?.uri || undefined;
    } catch (e) {
      logger.debug(
        ENABLE_LOGGING,
        '[TrackBuilder] Failed to resolve artwork uri',
        e
      );
      return undefined;
    }
  }

  /**
   * Build a proper file:// URL for local files that TrackPlayer can use
   */
  private buildLocalFileUrl(localFilePath: string): string {
    // If already a file:// URL, return as-is
    if (localFilePath.startsWith('file://')) {
      return localFilePath;
    }

    // Get the base directory (document directory)
    const base =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || '';

    // Convert relative path to absolute path
    const absolutePath = localFilePath.startsWith(base)
      ? localFilePath // Already absolute
      : `${base}${localFilePath}`; // Make it absolute

    // Ensure it starts with file:// protocol
    return absolutePath.startsWith('file://')
      ? absolutePath
      : `file://${absolutePath.replace('file://', '')}`;
  }

  /**
   * Create standardized error objects
   */
  private createError(
    type: BibleAudioError,
    message: string,
    chapterId?: string,
    originalError?: unknown
  ): BibleAudioErrorDetails & Error {
    const error = new Error(message) as BibleAudioErrorDetails & Error;
    error.type = type;
    error.message = message;
    error.chapterId = chapterId;
    error.originalError = originalError;
    error.timestamp = new Date();
    return error;
  }
}

// Export singleton instance
export const trackBuilder = new TrackBuilder();
