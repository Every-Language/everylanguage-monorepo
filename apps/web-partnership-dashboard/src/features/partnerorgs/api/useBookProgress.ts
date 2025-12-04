import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { BookProgress } from '../types';

export function useBookProgress(audioVersionIds: string[]) {
  return useQuery({
    queryKey: ['book-progress', audioVersionIds.sort().join(',')],
    queryFn: async () => {
      if (audioVersionIds.length === 0) {
        return [];
      }

      const { data: progressData, error: progressError } = await (
        supabase as any
      )
        .from('audio_version_book_progress')
        .select(
          'audio_version_id, book_id, chapters_with_audio, total_chapters'
        )
        .in('audio_version_id', audioVersionIds);

      if (progressError) {
        console.error('Error fetching book progress:', progressError);
        throw progressError;
      }

      if (!progressData || progressData.length === 0) {
        return [];
      }

      const bookIds = Array.from(
        new Set(
          (progressData as Array<{ book_id: string }>)
            .map(p => p.book_id)
            .filter(Boolean)
        )
      );

      if (bookIds.length === 0) {
        return [];
      }

      const { data: booksData, error: booksError } = await (supabase as any)
        .from('books')
        .select('id, name, global_order, testament')
        .in('id', bookIds);

      if (booksError) {
        console.error('Error fetching books:', booksError);
        throw booksError;
      }

      const booksMap = new Map(
        (
          (booksData || []) as Array<{
            id: string;
            name: string;
            global_order: number;
            testament: string | null;
          }>
        ).map(book => [book.id, book])
      );

      const combinedData: BookProgress[] = (
        (progressData || []) as Array<{
          audio_version_id: string;
          book_id: string;
          chapters_with_audio: number;
          total_chapters: number;
        }>
      )
        .map(progress => {
          const book = booksMap.get(progress.book_id);
          if (!book) return null;

          return {
            audio_version_id: progress.audio_version_id,
            book_id: progress.book_id,
            chapters_with_audio: progress.chapters_with_audio,
            total_chapters: progress.total_chapters,
            book: {
              id: book.id,
              name: book.name,
              global_order: book.global_order,
              testament: book.testament,
            },
          };
        })
        .filter((item): item is BookProgress => item !== null)
        .sort((a, b) => a.book.global_order - b.book.global_order);

      return combinedData;
    },
    enabled: audioVersionIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
