import React from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { GradientBackground } from '@everylanguage/shared-native-ui';
import { useChapterVersesLogic } from '../hooks/useChapterVersesLogic';
import { useChapterMediaActions } from '../hooks/useChapterMediaActions';
import { useChapterDeepLinkHandler } from '../hooks/useChapterDeepLinkHandler';
import {
  ChapterVersesHeader,
  ChapterVersesList,
  ChapterVersesDetails,
} from '../components';

export const ChapterVersesScreen: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    noPadding: { paddingBottom: 0 },
  });

  // Only get what we need for the main screen logic
  const {
    refetchVerses,
    isRefetching,
    bottomInset,
    effectiveChapterId,
    chapter,
    currentAudioVersion,
    currentTextVersion,
    isStoreReady,
  } = useChapterVersesLogic();

  // Deep link handling (screen-level concern) - only when store is ready
  const { playChapter, playChapterFromVerse } = useChapterMediaActions(chapter);
  useChapterDeepLinkHandler({
    effectiveChapterId,
    chapter,
    ...(currentAudioVersion?.id && {
      currentAudioVersionId: currentAudioVersion.id,
    }),
    ...(currentTextVersion?.id && {
      currentTextVersionId: currentTextVersion.id,
    }),
    playChapter,
    playChapterFromVerse,
    isStoreReady, // Only process deep links when store is ready
  });

  return (
    <GradientBackground>
      <View style={styles.container}>
        <ChapterVersesHeader />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.noPadding}
          scrollIndicatorInsets={{ bottom: bottomInset }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetchVerses}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }>
          <ChapterVersesDetails />
          <ChapterVersesList />
          <View style={{ height: bottomInset }} />
        </ScrollView>
      </View>
    </GradientBackground>
  );
};
