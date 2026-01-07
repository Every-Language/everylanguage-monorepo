import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';
import type { ChapterWithMetadata } from '../types';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import { ChapterMetadataService } from '../services/ChapterMetadataService';
import type { ChapterMetadataRecord } from '../../../../powersync/LocalSchema';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = false;

interface UseChaptersWithMetadataReturn {
  chapters: ChapterWithMetadata[];
  loading: boolean;
  error: string | null;
  isRefetching: boolean;
  fetchChapters: () => void;
}

/**
 * Map pre-computed metadata records to ChapterWithMetadata interface
 */
const mapMetadataResults = (
  metadataResults: ChapterMetadataRecord[]
): ChapterWithMetadata[] => {
  return metadataResults.map(record => {
    const hasMediaFiles = (record.media_file_count ?? 0) > 0;
    const isDownloaded = (record.downloaded_file_count ?? 0) > 0;
    const isAvailable = (record.verse_count ?? 0) > 0;

    return {
      id: record.chapter_id,
      book_id: record.book_id,
      chapter_number: record.chapter_number,
      total_verses: record.verse_count ?? 0,
      created_at: null, // Not stored in metadata table
      updated_at: null, // Not stored in metadata table
      global_order: 0, // Not stored in metadata table
      title: record.title,
      verseRange: record.verse_range,
      // Keep existing fields for compatibility
      mediaAvailability: hasMediaFiles
        ? isDownloaded
          ? 'complete'
          : 'partial'
        : 'none',
      versesMarked: hasMediaFiles,
      mediaFileCount: record.media_file_count ?? 0,
      downloadedFileCount: record.downloaded_file_count ?? 0,
      isAvailable,
      isDownloaded,
      hasMediaFiles,
      // Progress for circular indicator
      totalDownloadedBytes: record.total_downloaded_bytes ?? 0,
      totalFileSizeBytes: record.total_file_size_bytes ?? 0,
      downloadProgressRatio: record.download_progress_ratio ?? 0,
    } as ChapterWithMetadata;
  });
};

/**
 * Hook to get chapters with metadata for a specific book from PowerSync database
 * Uses TanStack Query for intelligent caching and performance optimization
 * Now includes fast path via pre-computed metadata table
 */

export const useChaptersWithMetadata = (
  bookId: string
): UseChaptersWithMetadataReturn => {
  const { currentAudioVersion } = useVersionsStore();
  const selectedAudioVersionId = currentAudioVersion?.id ?? null;
  const { logQuery } = useQueryLogger('use-chapters-with-metadata');

  const {
    data: chapters = [],
    isLoading: loading,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    // Include selected audio version in the key so switching versions triggers a refetch
    queryKey: ['chapters-metadata', bookId, selectedAudioVersionId],
    queryFn: async (): Promise<ChapterWithMetadata[]> => {
      if (!powerSyncSystem.isInitialized || !bookId) {
        return [];
      }

      const metadataService = ChapterMetadataService.getInstance();

      // Try fast path first: pre-computed metadata
      const fastPathResults = await metadataService.getBookChapterMetadata(
        bookId,
        selectedAudioVersionId!
      );

      if (fastPathResults.length > 0) {
        // Fast path: return pre-computed metadata
        return await logQuery('chapters-metadata-fast-path', async () => {
          return mapMetadataResults(fastPathResults);
        });
      }

      // Fallback: use original complex query
      return await logQuery('chapters-metadata-fallback', async () => {
        const query = QUERIES.CHAPTERS_WITH_METADATA;
        const params = [
          // mf_counts filter
          selectedAudioVersionId,
          selectedAudioVersionId,
          // mfd_counts filter
          selectedAudioVersionId,
          selectedAudioVersionId,
          // dln filter
          selectedAudioVersionId,
          selectedAudioVersionId,
          // bookId
          bookId,
        ];

        return await logQuery(query, async () => {
          const results = await powerSyncSystem.getAll(query, params);

          // Validate results structure to ensure functionality hasn't changed
          if (results.length > 0) {
            const firstResult = results[0] as Record<string, unknown>;
            const requiredFields = [
              'id',
              'book_id',
              'chapter_number',
              'title',
              'verseRange',
            ];
            const missingFields = requiredFields.filter(
              field => !(field in firstResult)
            );
            if (missingFields.length > 0) {
              logger.warn(
                ENABLE_LOGGING,
                '[useChaptersWithMetadata] Missing required fields:',
                missingFields
              );
            }
          }

          // Map into ChapterWithMetadata with availability booleans
          type ChapterRow = {
            id: string;
            book_id: string;
            chapter_number: number;
            total_verses?: number;
            created_at?: string;
            updated_at?: string;
            global_order?: number;
            title: string;
            verseRange: string;
            media_file_count?: number;
            downloaded_file_count?: number;
            total_downloaded_bytes?: number;
            total_file_size_bytes?: number;
            download_progress_ratio?: number;
            verse_count?: number;
          };

          const mapped = (results as ChapterRow[]).map(row => {
            // Validate row data integrity
            if (
              !row.id ||
              !row.book_id ||
              typeof row.chapter_number !== 'number'
            ) {
              logger.error(
                ENABLE_LOGGING,
                '[useChaptersWithMetadata] Invalid row data:',
                row
              );
              throw new Error('Invalid chapter data received from database');
            }

            const mediaFileCount = Number(row.media_file_count || 0);
            const downloadedFileCount = Number(row.downloaded_file_count || 0);
            const verseCount = Number(row.verse_count || 0);
            const isAvailable = verseCount > 0;
            const isDownloaded = downloadedFileCount > 0;
            const hasMediaFiles = mediaFileCount > 0;
            const totalDownloadedBytes = Number(
              row.total_downloaded_bytes || 0
            );
            const totalFileSizeBytes = Number(row.total_file_size_bytes || 0);
            const downloadProgressRatio = Number(
              row.download_progress_ratio || 0
            );

            // Validate calculated values
            if (downloadProgressRatio < 0 || downloadProgressRatio > 1) {
              logger.warn(
                ENABLE_LOGGING,
                '[useChaptersWithMetadata] Invalid progress ratio:',
                downloadProgressRatio,
                'for chapter:',
                row.id
              );
            }

            const chapterMetadata: ChapterWithMetadata = {
              id: row.id,
              book_id: row.book_id,
              chapter_number: row.chapter_number,
              total_verses: row.total_verses ?? row.verse_count ?? 0,
              created_at: row.created_at ?? null,
              updated_at: row.updated_at ?? null,
              global_order: row.global_order ?? 0, // Add missing global_order field
              title: row.title,
              verseRange: row.verseRange,
              // Keep existing fields for compatibility (based on media file availability)
              mediaAvailability: hasMediaFiles
                ? isDownloaded
                  ? 'complete'
                  : 'partial'
                : 'none',
              versesMarked: hasMediaFiles, // approximate; refine later with verse timing
              mediaFileCount,
              downloadedFileCount,
              isAvailable,
              isDownloaded,
              hasMediaFiles,
              // progress for circular indicator
              totalDownloadedBytes,
              totalFileSizeBytes,
              downloadProgressRatio,
            };

            // Final validation of mapped result
            if (
              !chapterMetadata.id ||
              !chapterMetadata.book_id ||
              typeof chapterMetadata.chapter_number !== 'number'
            ) {
              logger.error(
                ENABLE_LOGGING,
                '[useChaptersWithMetadata] Invalid mapped chapter data:',
                chapterMetadata
              );
              throw new Error(
                'Chapter mapping failed - invalid result structure'
              );
            }

            return chapterMetadata;
          });

          return mapped;
        });
      });
    },
    // Gate on selectedAudioVersionId to avoid false negatives before selection is ready
    enabled:
      !!bookId && powerSyncSystem.isInitialized && !!selectedAudioVersionId,
    staleTime: 5 * 60 * 1000, // 5 minutes - Bible structure rarely changes
    gcTime: 10 * 60 * 1000, // 10 minutes - Keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on app focus (static data)
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  return {
    chapters,
    loading,
    error: error ? (error as Error).message : null,
    isRefetching,
    fetchChapters: () => refetch(),
  };
};
