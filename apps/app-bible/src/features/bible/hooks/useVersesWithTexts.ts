import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import type { VerseWithText } from '../types';

// Database row type for verse text query results (internal use)
interface VerseTextRow {
  id: string;
  verse_id: string;
  text_version_id: string;
  verse_text: string;
  publish_status: string | null;
  version: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Database row type for verse query results (exported for playlist hooks)
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
 * Parse chapter ID to extract book and chapter number
 * Example: "gen-1" → { book: "gen", chapterNumber: 1 }
 */
const parseChapterId = (
  chapterId: string
): { book: string; chapterNumber: number } => {
  const parts = chapterId.split('-');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid chapterId format: ${chapterId}`);
  }
  const chapterNumber = parseInt(parts[1], 10);
  if (isNaN(chapterNumber) || chapterNumber < 1) {
    throw new Error(`Invalid chapter number in chapterId: ${chapterId}`);
  }
  return {
    book: parts[0],
    chapterNumber,
  };
};

/**
 * Get verse count for a chapter (fallback if not available in metadata)
 */
const getVerseCount = async (chapterId: string): Promise<number> => {
  // Try to get from chapters table first
  const chapter = await powerSyncSystem.get(
    `SELECT total_verses FROM chapters WHERE id = ?`,
    [chapterId]
  );
  if (
    chapter?.total_verses &&
    typeof chapter.total_verses === 'number' &&
    chapter.total_verses > 0
  ) {
    return chapter.total_verses;
  }

  // Fallback: count verses in chapter
  const countResult = await powerSyncSystem.get(
    `SELECT COUNT(*) as count FROM verses WHERE chapter_id = ?`,
    [chapterId]
  );
  return countResult?.count ?? 0;
};

/**
 * Hook to get verses with their associated text for a specific chapter from PowerSync database
 * Uses optimized pattern match + in-memory join strategy for better performance
 *
 * Performance: ~50-100ms vs 14+ seconds with JOIN
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

      return await logQuery(
        `OPTIMIZED: Pattern match + in-memory join for chapter ${chapterId}`,
        async () => {
          // Parse chapter ID to extract book and chapter number
          const { book, chapterNumber } = parseChapterId(chapterId);

          // Get verse count for the chapter
          const verseCount = await getVerseCount(chapterId);
          if (verseCount === 0) {
            return [];
          }

          // Query verse_texts with pattern match (fast indexed lookup)
          const verseTexts: VerseTextRow[] = textVersionId
            ? await powerSyncSystem.getAll(
                `SELECT 
                  id,
                  verse_id,
                  text_version_id,
                  verse_text,
                  publish_status,
                  version,
                  created_at,
                  updated_at
                FROM verse_texts 
                WHERE verse_id LIKE ? AND text_version_id = ?`,
                [`${book}-${chapterNumber}-%`, textVersionId]
              )
            : [];

          // Build map: verse_id → verse_text for fast lookup
          const verseTextMap = new Map<string, VerseTextRow>();
          for (const vt of verseTexts) {
            verseTextMap.set(vt.verse_id, vt);
          }

          // Generate complete array of all verses (1 to verseCount)
          const versesWithTextsResult: VerseWithText[] = [];
          for (let verseNumber = 1; verseNumber <= verseCount; verseNumber++) {
            const verseId = `${book}-${chapterNumber}-${verseNumber}`;
            const verseText = verseTextMap.get(verseId);

            versesWithTextsResult.push({
              verse: {
                id: verseId,
                chapter_id: chapterId,
                verse_number: verseNumber,
                global_order: null, // Not needed for single chapter queries
                created_at: null,
                updated_at: null,
              },
              verseText: verseText
                ? {
                    id: verseText.id,
                    verse_id: verseId,
                    text_version_id: verseText.text_version_id,
                    verse_text: verseText.verse_text,
                    publish_status: verseText.publish_status || 'published',
                    version: verseText.version ?? 0,
                    created_at: verseText.created_at || '',
                    updated_at: verseText.updated_at || '',
                  }
                : null,
            });
          }

          return versesWithTextsResult;
        }
      );
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
