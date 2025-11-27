import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../shared/services/supabase';

export interface BookProgressFromView {
  audio_version_id: string;
  book_id: string;
  chapters_with_audio: number;
  total_chapters: number;
  book: {
    id: string;
    name: string;
    global_order: number;
    testament: string | null;
  };
}

export function useBookProgressFromView(audioVersionId: string | null) {
  return useQuery({
    queryKey: ['book-progress-view', audioVersionId],
    queryFn: async () => {
      if (!audioVersionId) {
        return [];
      }

      // Fetch book progress from view
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: progressData, error: progressError } = await (
        supabase as any
      )
        .from('audio_version_book_progress')
        .select(
          'audio_version_id, book_id, chapters_with_audio, total_chapters'
        )
        .eq('audio_version_id', audioVersionId);

      if (progressError) {
        console.error('Error fetching book progress from view:', progressError);
        throw progressError;
      }

      if (!progressData || progressData.length === 0) {
        return [];
      }

      // Get unique book IDs (filter out nulls)
      const bookIds = Array.from(
        new Set(
          (progressData as Array<{ book_id: string | null }>)
            .map(p => p.book_id)
            .filter((id): id is string => id !== null)
        )
      );

      if (bookIds.length === 0) {
        return [];
      }

      // Fetch book details separately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: booksData, error: booksError } = await (supabase as any)
        .from('books')
        .select('id, name, global_order, testament')
        .in('id', bookIds);

      if (booksError) {
        console.error('Error fetching books:', booksError);
        throw booksError;
      }

      // Create a map of book_id -> book data
      const booksMap = new Map(
        (
          (booksData || []) as Array<{
            id: string;
            name: string;
            global_order: number | null;
            testament: 'old' | 'new' | null;
          }>
        ).map(book => [book.id, book])
      );

      // Combine progress data with book data
      const combinedData: BookProgressFromView[] = [];

      for (const progress of (progressData || []) as Array<{
        audio_version_id: string | null;
        book_id: string | null;
        chapters_with_audio: number | null;
        total_chapters: number | null;
      }>) {
        if (
          !progress.audio_version_id ||
          !progress.book_id ||
          progress.chapters_with_audio === null ||
          progress.total_chapters === null
        ) {
          continue;
        }

        const book = booksMap.get(progress.book_id);
        if (!book || book.global_order === null) continue;

        // Ensure testament is the correct type
        const testament: 'old' | 'new' | null =
          book.testament === 'old' || book.testament === 'new'
            ? book.testament
            : null;

        combinedData.push({
          audio_version_id: progress.audio_version_id,
          book_id: progress.book_id,
          chapters_with_audio: progress.chapters_with_audio,
          total_chapters: progress.total_chapters,
          book: {
            id: book.id,
            name: book.name,
            global_order: book.global_order,
            testament,
          },
        });
      }

      combinedData.sort((a, b) => a.book.global_order - b.book.global_order);

      return combinedData;
    },
    enabled: !!audioVersionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
