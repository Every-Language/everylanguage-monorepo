import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';
import { logger } from '@/shared/utils/logger';
import type { Book, Chapter, Verse } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

interface UseBibleReturn {
  books: Book[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseChaptersReturn {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseVersesReturn {
  verses: Verse[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get all books from PowerSync database with TanStack Query caching
 */
export const useBooks = (): UseBibleReturn => {
  const { logQuery } = useQueryLogger('use-books');

  const {
    data: books = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['books'],
    queryFn: async (): Promise<Book[]> => {
      if (!powerSyncSystem.isInitialized) {
        throw new Error('PowerSync not initialized');
      }

      return await logQuery(QUERIES.BOOKS, async () => {
        return await powerSyncSystem.getAll(QUERIES.BOOKS);
      });
    },
    enabled: powerSyncSystem.isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes - Books rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes - Keep books in memory longer
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    books,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};

/**
 * Hook to get chapters for a specific book from PowerSync database with TanStack Query caching
 */
export const useChaptersPS = (bookId: string | null): UseChaptersReturn => {
  const { logQuery } = useQueryLogger('use-chapters-ps');

  const {
    data: chapters = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chapters', bookId],
    queryFn: async (): Promise<Chapter[]> => {
      if (!powerSyncSystem.isInitialized || !bookId) {
        return [];
      }

      return await logQuery(QUERIES.CHAPTERS_BY_BOOK, async () => {
        const results = await powerSyncSystem.getAll(QUERIES.CHAPTERS_BY_BOOK, [
          bookId,
        ]);

        logger.debug(ENABLE_LOGGING, 'useChaptersPS: Retrieved chapters', {
          bookId,
          count: results.length,
        });
        return results;
      });
    },
    enabled: !!bookId && powerSyncSystem.isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes - Chapters rarely change
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    chapters,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};

/**
 * Hook to get verses for a specific chapter from PowerSync database with TanStack Query caching
 */
export const useVersesPS = (chapterId: string | null): UseVersesReturn => {
  const { logQuery } = useQueryLogger('use-verses-ps');

  const {
    data: verses = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['verses', chapterId],
    queryFn: async (): Promise<Verse[]> => {
      if (!powerSyncSystem.isInitialized || !chapterId) {
        return [];
      }

      return await logQuery(QUERIES.VERSES_BY_CHAPTER, async () => {
        const results = await powerSyncSystem.getAll(
          QUERIES.VERSES_BY_CHAPTER,
          [chapterId]
        );

        logger.debug(ENABLE_LOGGING, 'useVersesPS: Retrieved verses', {
          chapterId,
          count: results.length,
        });
        return results;
      });
    },
    enabled: !!chapterId && powerSyncSystem.isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes - Verses rarely change
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    verses,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};
