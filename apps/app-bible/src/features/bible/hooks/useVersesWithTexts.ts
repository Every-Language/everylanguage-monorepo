import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';
import type { VerseWithText } from '../types';

// Database row type for verse query results
export interface VerseWithTextRow {
  // Verse fields
  id: string;
  chapter_id: string;
  verse_number: number;
  global_order: number | null;
  created_at: string | null;
  updated_at: string | null;

  // Verse text fields (when joined)
  verse_text_id?: string;
  text_version_id?: string;
  verse_text?: string;
  publish_status?: string;
  version?: number;
  text_created_at?: string;
  text_updated_at?: string;
}

interface UseVersesWithTextsReturn {
  versesWithTexts: VerseWithText[];
  loading: boolean;
  error: string | null;
  isRefetching: boolean;
  refetch: () => void;
}

/**
 * Hook to get verses with their associated text for a specific chapter from PowerSync database
 * Uses TanStack Query for intelligent caching and performance optimization
 */
export const useVersesWithTexts = (
  chapterId: string | null,
  textVersionId?: string
): UseVersesWithTextsReturn => {
  const { logQuery } = useQueryLogger('use-verses-with-texts');

  const {
    data: versesWithTexts = [],
    isLoading: loading,
    error,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['verses-with-texts', chapterId, textVersionId],
    queryFn: async (): Promise<VerseWithText[]> => {
      if (!powerSyncSystem.isInitialized || !chapterId) {
        return [];
      }

      // Use centralized query constants - no duplication!
      const query = textVersionId
        ? QUERIES.VERSES_WITH_TEXTS
        : QUERIES.VERSES_WITHOUT_TEXTS;
      const params = textVersionId ? [textVersionId, chapterId] : [chapterId];

      return await logQuery(query, async () => {
        const results = await powerSyncSystem.getAll(query, params);

        // Transform to VerseWithText format
        const versesWithTextsResult: VerseWithText[] = results.map(
          (row: VerseWithTextRow) => {
            const verse = {
              id: row.id,
              chapter_id: row.chapter_id,
              verse_number: row.verse_number,
              global_order: row.global_order,
              created_at: row.created_at,
              updated_at: row.updated_at,
            };

            // Only require verse_text to be present - publish_status and version may be null/0
            // but we still want to display the text if it exists
            const verseText =
              row.verse_text_id && row.text_version_id && row.verse_text
                ? {
                    id: row.verse_text_id,
                    verse_id: row.id,
                    text_version_id: row.text_version_id,
                    verse_text: row.verse_text,
                    publish_status: row.publish_status || null,
                    version: row.version ?? null,
                    created_at: row.text_created_at || row.created_at || '',
                    updated_at: row.text_updated_at || row.updated_at || '',
                  }
                : null;

            return {
              verse,
              verseText,
            };
          }
        );

        return versesWithTextsResult;
      });
    },
    enabled: !!chapterId && powerSyncSystem.isInitialized,
    staleTime: 5 * 60 * 1000, // 5 minutes - Bible text rarely changes
    gcTime: 10 * 60 * 1000, // 10 minutes - Keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch on app focus (static data)
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  return {
    versesWithTexts,
    loading,
    error: error ? (error as Error).message : null,
    isRefetching,
    refetch: () => refetch(),
  };
};
