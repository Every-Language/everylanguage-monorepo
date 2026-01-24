import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { VerseCard } from './VerseCard';
import { VerseCardSkeleton } from './VerseCardSkeleton';
import { useVerseAutoScroll } from '../hooks/useVerseAutoScroll';
import { useChapterVersesLogic } from '../hooks/useChapterVersesLogic';
import { useCurrentVersions } from '../../languages/hooks';
import { DeepLinkState } from '@/shared/services/deeplink/DeepLinkState';
import { logger } from '@/shared/utils/logger';
import type { VerseWithText } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export const ChapterVersesList: React.FC = () => {
  const { theme } = useTheme();

  // Get data directly from hooks - no props needed!
  const { versesWithTexts, chapter, book, incomingVerseId, versesLoading } =
    useChapterVersesLogic();
  const { currentAudioVersion, currentTextVersion } = useCurrentVersions();
  const scrollRef = useRef<ScrollView | null>(null);
  const verseItemOffsets = useRef<Record<string, number>>({});

  const styles = StyleSheet.create({
    listContent: { paddingBottom: 16 },
  });

  // Auto-scroll to deep-linked verse
  const effectiveVerseIdForScroll =
    incomingVerseId ?? DeepLinkState.get()?.entityId ?? null;
  useVerseAutoScroll(
    scrollRef,
    effectiveVerseIdForScroll,
    versesWithTexts.length,
    verseItemOffsets
  );

  // Cumulative offsets for item layout
  const cumulativeHeightRef = useRef(0);
  const renderVerseItem = useCallback(
    ({ item }: { item: VerseWithText }) => {
      const hasText = Boolean(item.verseText?.verse_text);
      const onLayout = (e: { nativeEvent: { layout: { height: number } } }) => {
        const h = e.nativeEvent.layout.height;
        verseItemOffsets.current[item.verse.id] = cumulativeHeightRef.current;
        cumulativeHeightRef.current += h;
      };

      const verseCardProps: React.ComponentProps<typeof VerseCard> = {
        verse: item.verse,
        verseText: item.verseText,
        showMenu: hasText,
        chapterInfo: {
          chapterId: chapter?.id ?? '',
          bookName: book?.name || 'Unknown Book',
          chapterNumber: chapter?.chapter_number ?? 0,
        },
        onPress: () =>
          logger.debug(ENABLE_LOGGING, 'VersesScreen: Verse pressed', {
            verseNumber: item.verse.verse_number,
          }),
        theme,
        testID: `verse-${item.verse.verse_number}`,
      };

      if (currentAudioVersion?.id)
        verseCardProps.currentAudioVersionId = currentAudioVersion.id;
      if (currentTextVersion?.id)
        verseCardProps.currentTextVersionId = currentTextVersion.id;

      return (
        <View onLayout={onLayout}>
          <VerseCard {...verseCardProps} />
        </View>
      );
    },
    [chapter, book, currentAudioVersion, currentTextVersion, theme]
  );

  // Show skeleton placeholders while loading
  if (versesLoading && versesWithTexts.length === 0) {
    return (
      <View style={styles.listContent}>
        {Array.from({ length: 8 }).map((_, index) => (
          <VerseCardSkeleton key={`skeleton-${index}`} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.listContent}>
      {versesWithTexts.map(v => (
        <View key={v.verse.id}>{renderVerseItem({ item: v })}</View>
      ))}
    </View>
  );
};
