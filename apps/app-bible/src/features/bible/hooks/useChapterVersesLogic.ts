import { useMemo, useCallback, useState, useEffect } from 'react';
import type { ChapterWithMetadata } from '../types';
import { useResolvedBibleLocation } from './useResolvedBibleLocation';
import { useVersesWithTexts } from './useVersesWithTexts';
import { useCurrentVersions } from '../../languages/hooks';
import { useVerseTextInvalidation } from './useVerseTextInvalidation';
import { useChapterDownloadStatus } from '@/features/downloads/hooks';
import { useMediaBottomInset } from '@/features/media/layout/useMediaBottomInset';
import { useBibleNavigationV2 } from '../services/BibleNavigationServiceV2';
import { useBibleNavigationStore } from '../store/bibleNavigationStore';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';

export const useChapterVersesLogic = () => {
  const { goBack } = useBibleNavigationV2();
  const bottomInset = useMediaBottomInset();
  const rootNavigation = useNavigation<RootStackNavigationProp>();

  // Get current navigation state from store
  const { selectedBook, selectedChapter, selectedVerseId } =
    useBibleNavigationStore();

  // Params extraction from store
  const incomingBook = selectedBook;
  const incomingChapter = selectedChapter;
  const incomingChapterId = incomingChapter?.id ?? null;
  const incomingVerseId = selectedVerseId;

  // Add a small delay to ensure store state is fully propagated
  const [isStoreReady, setIsStoreReady] = useState(false);

  useEffect(() => {
    if (selectedBook && selectedChapter) {
      // Small delay to ensure all components have updated
      const timer = setTimeout(() => setIsStoreReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsStoreReady(false);
      return undefined;
    }
  }, [selectedBook, selectedChapter]);

  // Resolve location
  const {
    resolvedBook,
    resolvedBookId,
    resolvedChapterId,
    resolvedChapterNumber,
  } = useResolvedBibleLocation({
    incomingBook: incomingBook ?? null,
    incomingBookId: incomingBook?.id ?? null,
    incomingChapterId,
    incomingVerseId,
  });

  const effectiveChapterId = incomingChapter?.id ?? resolvedChapterId;
  const book = useMemo(
    () => incomingBook ?? resolvedBook,
    [incomingBook, resolvedBook]
  );

  const chapter: ChapterWithMetadata | null = useMemo(() => {
    if (!effectiveChapterId) return null;
    if (incomingChapter) return incomingChapter;
    return {
      id: effectiveChapterId,
      ...(resolvedBookId ? { book_id: resolvedBookId } : {}),
      chapter_number: resolvedChapterNumber ?? 0,
      total_verses: 0,
      hasMediaFiles: true,
    } as unknown as ChapterWithMetadata;
  }, [
    effectiveChapterId,
    incomingChapter,
    resolvedBookId,
    resolvedChapterNumber,
  ]);

  // Current versions
  const { currentTextVersion, currentAudioVersion } = useCurrentVersions();

  // Verses data
  const {
    versesWithTexts,
    loading: versesLoading,
    refetch: refetchVerses,
    isRefetching,
  } = useVersesWithTexts(effectiveChapterId ?? null, currentTextVersion?.id);

  // Reactively invalidate verses-with-texts as verse_texts for the chapter/version change
  useVerseTextInvalidation(
    effectiveChapterId ?? null,
    currentTextVersion?.id ?? null
  );

  // Chapter download status
  const downloadStatus = useChapterDownloadStatus(
    effectiveChapterId ?? null,
    currentAudioVersion?.id ?? null
  );

  // Navigation handlers
  const handleBack = useCallback(() => goBack(), [goBack]);

  // Header title (book name only)
  const headerTitle = useMemo(() => {
    return book?.name ?? 'Unknown Book';
  }, [book?.name]);

  // Chapter title (chapter name only)
  const chapterTitle = useMemo(() => {
    const chapterNumber =
      chapter?.chapter_number ?? resolvedChapterNumber ?? '';
    return chapterNumber ? `Chapter ${chapterNumber}` : 'Chapter';
  }, [chapter?.chapter_number, resolvedChapterNumber]);

  return {
    // Data
    book,
    chapter,
    effectiveChapterId,
    versesWithTexts,
    versesLoading,
    currentTextVersion,
    currentAudioVersion,
    downloadStatus,
    headerTitle,
    chapterTitle,

    // Navigation
    handleBack,
    bottomInset,
    rootNavigation,

    // Actions
    refetchVerses,
    isRefetching,

    // Store state
    isStoreReady,

    // Route params for deep linking
    incomingChapterId,
    incomingVerseId,
    resolvedChapterId,
  };
};
