import { useState, useEffect, useMemo } from 'react';
import { useBibleVersions } from '../../../shared/stores/project';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useAudioVersionsByProject } from '../../../shared/hooks/query/audio-versions';
import { useTextVersionsByProject } from '../../../shared/hooks/query/text-versions';
import {
  useSelectedBibleVersionId,
  useSetSelectedBibleVersionId,
} from '../../../shared/stores/project';
import { supabase } from '../../../shared/services/supabase';
import { useQuery } from '@tanstack/react-query';
import { useBookProgressFromView } from './useBookProgressFromView';

// Types for progress tracking
export interface ChapterProgress {
  id: string;
  chapterId: string;
  chapterNumber: number;
  totalVerses: number;
  progress: number;
  mediaFiles: Array<{
    id: string;
    object_key: string | null;
    duration_seconds: number | null;
  }>;
  status: 'complete' | 'in_progress' | 'not_started';
}

export interface BookProgress {
  id: string;
  bookId: string;
  bookName: string;
  totalChapters: number;
  progress: number;
  chapters: ChapterProgress[];
  status: 'complete' | 'in_progress' | 'not_started';
}

// Statistics for overall progress
export interface ProgressStats {
  booksProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  chaptersProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  versesProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export function useBibleProgress() {
  const { selectedProject } = useSelectedProject();
  const bibleVersions = useBibleVersions(); // This is now an array directly
  const { data: audioVersions } = useAudioVersionsByProject(
    selectedProject?.id || ''
  );
  const { data: textVersions } = useTextVersionsByProject(
    selectedProject?.id || ''
  );

  // Use global bible version selection from project store
  const selectedBibleVersionId = useSelectedBibleVersionId();
  const setSelectedBibleVersionId = useSetSelectedBibleVersionId();

  // State for version selection
  const [selectedVersionType, setSelectedVersionType] = useState<
    'audio' | 'text'
  >('audio');
  const [currentVersionId, setCurrentVersionId] = useState<string>('');

  // Fetch book-level progress from view for audio versions
  const { data: bookProgressFromView } = useBookProgressFromView(
    selectedVersionType === 'audio' ? currentVersionId : null
  );

  // Memoize the first available bible version ID to prevent infinite loops
  const firstBibleVersionId = useMemo(() => {
    return bibleVersions && bibleVersions.length > 0
      ? bibleVersions[0].id
      : null;
  }, [bibleVersions]);

  // Auto-select first available bible version if none is selected
  useEffect(() => {
    if (firstBibleVersionId && !selectedBibleVersionId) {
      setSelectedBibleVersionId(firstBibleVersionId);
    }
  }, [firstBibleVersionId, selectedBibleVersionId, setSelectedBibleVersionId]);

  // Auto-select version based on type
  useEffect(() => {
    if (
      selectedVersionType === 'audio' &&
      audioVersions &&
      audioVersions.length > 0
    ) {
      // Only set if currentVersionId is empty or doesn't exist in the current version type
      const currentVersionExists = audioVersions.some(
        v => v.id === currentVersionId
      );
      if (!currentVersionExists) {
        setCurrentVersionId(audioVersions[0].id);
      }
    } else if (
      selectedVersionType === 'text' &&
      textVersions &&
      textVersions.length > 0
    ) {
      // Only set if currentVersionId is empty or doesn't exist in the current version type
      const currentVersionExists = textVersions.some(
        v => v.id === currentVersionId
      );
      if (!currentVersionExists) {
        setCurrentVersionId(textVersions[0].id);
      }
    }
  }, [selectedVersionType, audioVersions, textVersions, currentVersionId]);

  // Helper functions for version selection
  const setSelectedAudioVersion = (versionId: string) => {
    setCurrentVersionId(versionId);
  };

  const setSelectedTextVersion = (versionId: string) => {
    setCurrentVersionId(versionId);
  };

  // OPTIMIZED: Calculate progress statistics using efficient counting
  const { data: progressStats, isLoading: statsLoading } =
    useQuery<ProgressStats>({
      queryKey: [
        'bible-progress-stats',
        selectedProject?.id,
        selectedBibleVersionId,
        selectedVersionType,
        currentVersionId,
      ],
      queryFn: async () => {
        if (
          !selectedProject?.id ||
          !selectedBibleVersionId ||
          !currentVersionId
        ) {
          return {
            booksProgress: { completed: 0, total: 0, percentage: 0 },
            chaptersProgress: { completed: 0, total: 0, percentage: 0 },
            versesProgress: { completed: 0, total: 0, percentage: 0 },
          };
        }

        try {
          // Get total chapters and verses count for this bible version
          const { count: totalChapters, error: chaptersCountError } =
            await supabase
              .from('chapters')
              .select('*, books!inner(*)', { count: 'exact', head: true })
              .eq('books.bible_version_id', selectedBibleVersionId);

          if (chaptersCountError) throw chaptersCountError;

          const { count: totalVerses, error: versesCountError } = await supabase
            .from('verses')
            .select('*, chapters!inner(*, books!inner(*))', {
              count: 'exact',
              head: true,
            })
            .eq('chapters.books.bible_version_id', selectedBibleVersionId);

          if (versesCountError) throw versesCountError;

          if (!totalChapters || totalChapters === 0) {
            return {
              booksProgress: { completed: 0, total: 0, percentage: 0 },
              chaptersProgress: { completed: 0, total: 0, percentage: 0 },
              versesProgress: { completed: 0, total: 0, percentage: 0 },
            };
          }

          let completedChapters = 0;
          let completedVerses = 0;
          let chaptersWithContentSet = new Set<string>();

          if (selectedVersionType === 'audio') {
            // Count distinct chapters that have media files
            const { data: chaptersWithMedia } = await supabase
              .from('media_files')
              .select('chapter_id')
              .eq('audio_version_id', currentVersionId)
              .eq('upload_status', 'completed')
              .not('chapter_id', 'is', null);

            // Count unique chapters with media files
            const validChapterIds =
              chaptersWithMedia
                ?.map(file => file.chapter_id)
                .filter((id): id is string => id !== null) || [];
            chaptersWithContentSet = new Set(validChapterIds);
            completedChapters = chaptersWithContentSet.size;

            // Count verses that have media_files_verses records linking to media_files in this audio version
            const { data: versesWithMedia } = await supabase
              .from('media_files_verses')
              .select(
                `
              verse_id,
              media_files!media_file_id(audio_version_id)
            `
              )
              .eq('media_files.audio_version_id', currentVersionId);

            // Count unique verses with media files verses
            const validVerseIds =
              versesWithMedia
                ?.map(mfv => mfv.verse_id)
                .filter((id): id is string => id !== null) || [];
            completedVerses = new Set(validVerseIds).size;
          } else {
            // For text versions: Use proper aggregated queries to count only COMPLETE chapters

            // First, get all chapters for this bible version
            const { data: allChapters } = await supabase
              .from('chapters')
              .select(
                `
              id,
              total_verses,
              books!inner(bible_version_id)
            `
              )
              .eq('books.bible_version_id', selectedBibleVersionId);

            if (!allChapters || allChapters.length === 0) {
              completedChapters = 0;
              completedVerses = 0;
            } else {
              // For each chapter, count how many verses have verse_texts
              const chapterCompletionMap = new Map<
                string,
                { totalVerses: number; completedVerses: number }
              >();

              // Initialize all chapters with zero completed verses
              allChapters.forEach(chapter => {
                chapterCompletionMap.set(chapter.id, {
                  totalVerses: chapter.total_verses,
                  completedVerses: 0,
                });
              });

              // Get verse completion counts per chapter
              const allChapterIds = allChapters.map(c => c.id);
              const { data: verseTextCounts } = await supabase
                .from('verse_texts')
                .select(
                  `
                verse_id,
                verses!inner(
                  chapter_id
                )
              `
                )
                .eq('text_version_id', currentVersionId)
                .in('verses.chapter_id', allChapterIds)
                .not('verse_text', 'is', null);

              // Count completed verses per chapter
              verseTextCounts?.forEach(verseText => {
                const verse = verseText.verses as { chapter_id: string } | null;
                if (verse?.chapter_id) {
                  const chapterData = chapterCompletionMap.get(
                    verse.chapter_id
                  );
                  if (chapterData) {
                    chapterData.completedVerses += 1;
                  }
                }
              });

              // Calculate completed chapters (where completedVerses === totalVerses)
              chapterCompletionMap.forEach((data, chapterId) => {
                if (
                  data.completedVerses === data.totalVerses &&
                  data.totalVerses > 0
                ) {
                  chaptersWithContentSet.add(chapterId);
                }
              });

              completedChapters = chaptersWithContentSet.size;

              // Total completed verses across all chapters
              completedVerses = verseTextCounts?.length || 0;
            }
          }

          // Calculate books progress by checking which books have ALL their chapters complete
          const { data: booksWithChapters } = await supabase
            .from('books')
            .select(
              `
            id,
            chapters!inner(id)
          `
            )
            .eq('bible_version_id', selectedBibleVersionId);

          let completedBooks = 0;
          const totalBooks = booksWithChapters?.length || 0;

          booksWithChapters?.forEach(book => {
            const allChaptersComplete = book.chapters.every(chapter =>
              chaptersWithContentSet.has(chapter.id)
            );
            if (allChaptersComplete && book.chapters.length > 0) {
              completedBooks++;
            }
          });

          return {
            booksProgress: {
              completed: completedBooks,
              total: totalBooks,
              percentage:
                totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0,
            },
            chaptersProgress: {
              completed: completedChapters,
              total: totalChapters,
              percentage:
                totalChapters > 0
                  ? (completedChapters / totalChapters) * 100
                  : 0,
            },
            versesProgress: {
              completed: completedVerses,
              total: totalVerses || 0,
              percentage:
                totalVerses && totalVerses > 0
                  ? (completedVerses / totalVerses) * 100
                  : 0,
            },
          };
        } catch (error) {
          console.error('Error calculating progress stats:', error);
          throw error;
        }
      },
      enabled:
        !!selectedProject?.id && !!selectedBibleVersionId && !!currentVersionId,
      staleTime: 30000, // Cache for 30 seconds
    });

  // Get book-level progress - use view for audio, calculate for text
  const { data: bookData, isLoading: bookDataLoading } = useQuery<
    BookProgress[]
  >({
    queryKey: [
      'bible-progress-books',
      selectedProject?.id,
      selectedBibleVersionId,
      selectedVersionType,
      currentVersionId,
    ],
    queryFn: async () => {
      if (
        !selectedProject?.id ||
        !selectedBibleVersionId ||
        !currentVersionId
      ) {
        return [];
      }

      try {
        // Get all books with their chapters
        const { data: booksWithChapters, error: booksError } = await supabase
          .from('books')
          .select(
            `
            id,
            name,
            book_number,
            chapters(
              id,
              chapter_number,
              total_verses
            )
          `
          )
          .eq('bible_version_id', selectedBibleVersionId)
          .order('book_number');

        if (booksError) throw booksError;
        if (!booksWithChapters) return [];

        // For audio versions: use the view data
        if (selectedVersionType === 'audio' && bookProgressFromView) {
          // Create a map of book progress from view
          const bookProgressMap = new Map<
            string,
            (typeof bookProgressFromView)[0]
          >();
          bookProgressFromView.forEach(bp => {
            if (bp) {
              bookProgressMap.set(bp.book_id, bp);
            }
          });

          // Get chapters with media files for audio versions
          const allChapterIds = booksWithChapters.flatMap(book =>
            book.chapters.map(chapter => chapter.id)
          );
          const { data: mediaFiles } = await supabase
            .from('media_files')
            .select('chapter_id')
            .eq('audio_version_id', currentVersionId)
            .eq('upload_status', 'completed')
            .eq('publish_status', 'published')
            .in('chapter_id', allChapterIds)
            .not('chapter_id', 'is', null);

          const chaptersWithMediaFiles = new Set(
            mediaFiles?.map(f => f.chapter_id).filter(Boolean) || []
          );

          return booksWithChapters.map(book => {
            const bookProgress = bookProgressMap.get(book.id);
            const chaptersWithAudio = bookProgress?.chapters_with_audio || 0;
            const totalChapters =
              bookProgress?.total_chapters || book.chapters.length;
            const bookProgressPercent =
              totalChapters > 0
                ? Math.round((chaptersWithAudio / totalChapters) * 100)
                : 0;

            const chapterProgressData: ChapterProgress[] = book.chapters.map(
              chapter => {
                const hasMediaFile = chaptersWithMediaFiles.has(chapter.id);
                const status: ChapterProgress['status'] = hasMediaFile
                  ? 'complete'
                  : 'not_started';

                return {
                  id: `${book.id}-${chapter.id}`,
                  chapterId: chapter.id,
                  chapterNumber: chapter.chapter_number,
                  totalVerses: chapter.total_verses,
                  progress: hasMediaFile ? 100 : 0,
                  mediaFiles: hasMediaFile
                    ? [
                        {
                          id: `placeholder-${chapter.id}`,
                          object_key: null,
                          duration_seconds: null,
                        },
                      ]
                    : [],
                  status,
                };
              }
            );

            return {
              id: book.id,
              bookId: book.id,
              bookName: book.name,
              totalChapters: book.chapters.length,
              progress: bookProgressPercent,
              chapters: chapterProgressData,
              status:
                bookProgressPercent === 100
                  ? 'complete'
                  : bookProgressPercent > 0
                    ? 'in_progress'
                    : 'not_started',
            };
          });
        }

        // For text versions: calculate verse completion
        const allChapterIds = booksWithChapters.flatMap(book =>
          book.chapters.map(chapter => chapter.id)
        );

        const chapterVerseProgressMap = new Map<
          string,
          { totalVerses: number; completedVerses: number }
        >();

        // Initialize progress map for all chapters
        booksWithChapters.forEach(book => {
          book.chapters.forEach(chapter => {
            chapterVerseProgressMap.set(chapter.id, {
              totalVerses: chapter.total_verses,
              completedVerses: 0,
            });
          });
        });

        // Get verse completion counts for all chapters
        const { data: verseTextCounts } = await supabase
          .from('verse_texts')
          .select(
            `
            verse_id,
            verses!inner(
              chapter_id
            )
          `
          )
          .eq('text_version_id', currentVersionId)
          .in('verses.chapter_id', allChapterIds)
          .is('deleted_at', null);

        // Count completed verses per chapter
        verseTextCounts?.forEach(verseText => {
          const verse = verseText.verses as { chapter_id: string } | null;
          if (verse?.chapter_id) {
            const chapterData = chapterVerseProgressMap.get(verse.chapter_id);
            if (chapterData) {
              chapterData.completedVerses += 1;
            }
          }
        });

        // Build book progress data
        return booksWithChapters.map(book => {
          const chapterProgressData: ChapterProgress[] = book.chapters.map(
            chapter => {
              const verseProgress = chapterVerseProgressMap.get(chapter.id);
              const progress =
                verseProgress && verseProgress.totalVerses > 0
                  ? Math.round(
                      (verseProgress.completedVerses /
                        verseProgress.totalVerses) *
                        100
                    )
                  : 0;

              const status: ChapterProgress['status'] =
                progress === 100
                  ? 'complete'
                  : progress > 0
                    ? 'in_progress'
                    : 'not_started';

              return {
                id: `${book.id}-${chapter.id}`,
                chapterId: chapter.id,
                chapterNumber: chapter.chapter_number,
                totalVerses: chapter.total_verses,
                progress,
                mediaFiles: [],
                status,
              };
            }
          );

          const completedChapters = chapterProgressData.filter(
            ch => ch.status === 'complete'
          ).length;
          const bookProgress =
            book.chapters.length > 0
              ? Math.round((completedChapters / book.chapters.length) * 100)
              : 0;

          return {
            id: book.id,
            bookId: book.id,
            bookName: book.name,
            totalChapters: book.chapters.length,
            progress: bookProgress,
            chapters: chapterProgressData,
            status:
              bookProgress === 100
                ? 'complete'
                : bookProgress > 0
                  ? 'in_progress'
                  : 'not_started',
          };
        });
      } catch (error) {
        console.error('Error calculating book data:', error);
        throw error;
      }
    },
    enabled:
      !!selectedProject?.id &&
      !!selectedBibleVersionId &&
      !!currentVersionId &&
      (selectedVersionType !== 'audio' || !!bookProgressFromView),
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    // State
    selectedVersionType,
    setSelectedVersionType,
    currentVersionId,

    // Data
    audioVersions: audioVersions || [],
    textVersions: textVersions || [],
    progressStats,
    bookData: bookData || [],

    // Derived state
    availableVersions:
      selectedVersionType === 'audio'
        ? audioVersions || []
        : textVersions || [],

    // Loading states
    isLoading: statsLoading || bookDataLoading,
    statsLoading,
    bookDataLoading,

    // Computed
    hasData:
      !!selectedProject &&
      !!selectedBibleVersionId &&
      !!currentVersionId &&
      !statsLoading,

    // Functions
    setSelectedAudioVersion,
    setSelectedTextVersion,
  };
}
