import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useCurrentTrack } from '../../store/PlaybackStore';
import { useQueueStore } from '../../store/QueueStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomSheet } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useDerivedValue,
} from 'react-native-reanimated';
import { MenuView } from '@react-native-menu/menu';
import { MaterialIcons } from '@expo/vector-icons';
import { useCurrentVersions } from '@/features/languages/hooks';
import { useShare } from '@/features/sharing/hooks/useShare';
import {
  getChapterMenuActions,
  handleChapterMenuAction,
  type HandleMenuActionParams,
} from '@/features/bible/utils/chapterMenu';
import { MediaControls } from '../MediaControls';
import { TextAndQueueTabs } from '../TextAndQueueTabs';
import { TrackDetailsExpanded } from '../TrackDetailsExpanded';
import { TrackDetailsCollapsed } from '../TrackDetailsCollapsed';
import {
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  CONTENT_HEIGHT_COLLAPSED,
} from '../../layout/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ChapterMenuEvent = { nativeEvent: { event: string } };

export const MediaPlayerContent: React.FC = () => {
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();
  const insets = useSafeAreaInsets();

  // Get the animated index from the bottom sheet context
  const { snapToIndex, animatedIndex } = useBottomSheet();

  // Pre-calculate fixed values to avoid recalculation
  const maxContentHeight = useMemo(
    () =>
      SCREEN_HEIGHT -
      HEADER_HEIGHT -
      FOOTER_HEIGHT -
      insets.top -
      insets.bottom,
    [insets.top, insets.bottom]
  );

  // Direct interpolation from animatedIndex - no complex calculations
  const currentTopSafeArea = useDerivedValue(() => {
    return interpolate(
      animatedIndex.value,
      [0, 1],
      [0, insets.top],
      Extrapolation.CLAMP
    );
  });

  const currentContentHeight = useDerivedValue(() => {
    return interpolate(
      animatedIndex.value,
      [0, 1],
      [CONTENT_HEIGHT_COLLAPSED, maxContentHeight],
      Extrapolation.CLAMP
    );
  });

  const sheetProgress = useDerivedValue(() => {
    return Math.max(0, Math.min(1, animatedIndex.value));
  });

  // Animations synchronized with actual sheet position
  const collapsedHeaderInfoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sheetProgress.value,
      [0, 0.3],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const expandedHeaderButtonsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sheetProgress.value,
      [0.7, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const topSafeAreaStyle = useAnimatedStyle(() => ({
    height: currentTopSafeArea.value,
  }));

  const contentContainerStyle = useAnimatedStyle(() => ({
    height: currentContentHeight.value,
    opacity: interpolate(
      sheetProgress.value,
      [0, 0.3, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Remove percentage-based height calculations - use flexbox instead

  const headerChapterMenuActions = useMemo(() => {
    // Current track is playing, so hasMediaFiles=true suffices
    const base = getChapterMenuActions(true, true, true);
    return base.filter(a => a.id !== 'queue');
  }, []);

  const addToQueue = useQueueStore(state => state.addToQueue);
  const { currentAudioVersion, currentTextVersion } = useCurrentVersions();
  const { shareChapter } = useShare();

  const onHeaderMenuAction = useCallback(
    async ({ nativeEvent }: ChapterMenuEvent) => {
      if (!currentTrack) return;
      const paramsBase: Omit<
        HandleMenuActionParams,
        'bookName' | 'currentAudioVersionId' | 'currentTextVersionId'
      > = {
        chapter: {
          id: currentTrack.chapterId,
          chapter_number: currentTrack.chapterNumber ?? 0,
          total_verses: 0,
          hasMediaFiles: true,
        } as unknown as HandleMenuActionParams['chapter'],
        shareChapter,
        addToQueue: async (
          chapterId: string,
          options?: {
            audioVersionId?: string;
            textVersionId?: string;
            preferOffline?: boolean;
          }
        ) => {
          const queueOptions = {
            preferOffline: true,
            ...(options?.audioVersionId
              ? { audioVersionId: options.audioVersionId }
              : {}),
            ...(options?.textVersionId
              ? { textVersionId: options.textVersionId }
              : {}),
          } as Parameters<typeof addToQueue>[1];
          await addToQueue(chapterId, queueOptions);
        },
      };
      const params: HandleMenuActionParams = {
        ...paramsBase,
        ...(typeof currentTrack.title === 'string' && currentTrack.title
          ? { bookName: undefined as unknown as string }
          : {}),
        ...(currentAudioVersion?.id
          ? { currentAudioVersionId: currentAudioVersion.id }
          : {}),
        ...(currentTextVersion?.id
          ? { currentTextVersionId: currentTextVersion.id }
          : {}),
      };

      await handleChapterMenuAction(nativeEvent.event, params);
    },
    [
      currentTrack,
      addToQueue,
      shareChapter,
      currentAudioVersion?.id,
      currentTextVersion?.id,
    ]
  );

  const handleCollapse = useCallback(() => {
    snapToIndex(0);
  }, [snapToIndex]);

  if (!currentTrack) return null;

  return (
    <View style={styles.contentWrapper}>
      {/* Top Safe Area - only in expanded mode */}
      <Animated.View style={topSafeAreaStyle} />

      {/* Header - Fixed 50px height */}
      <View style={[styles.header, { height: HEADER_HEIGHT }]}>
        {/* Collapsed Mode: Track Details */}
        <Animated.View
          key={currentTrack.id}
          style={[styles.headerContent, collapsedHeaderInfoStyle]}>
          <TrackDetailsCollapsed />
        </Animated.View>

        {/* Expanded Mode: Header Buttons */}
        <Animated.View
          style={[styles.headerContent, expandedHeaderButtonsStyle]}>
          <TouchableOpacity
            onPress={handleCollapse}
            accessibilityRole='button'
            accessibilityLabel='Collapse player'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons
              name='keyboard-arrow-down'
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <View style={styles.flexSpacer} />
          <MenuView
            actions={headerChapterMenuActions}
            onPressAction={onHeaderMenuAction}>
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel='Player menu'
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons
                name='more-vert'
                size={22}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </MenuView>
        </Animated.View>
      </View>

      {/* Content - Dynamic height */}
      <Animated.View style={[styles.content, contentContainerStyle]}>
        {/* Expanded Track Details - Fixed height for track info */}
        <View style={styles.expandedTrackDetails}>
          <TrackDetailsExpanded />
        </View>

        {/* Text and Queue Tabs - Flexible height to fill remaining space */}
        <View style={styles.textAndQueueTabs}>
          <TextAndQueueTabs />
        </View>
      </Animated.View>

      {/* Footer - Fixed 160px height */}
      <View style={[styles.footer, { height: FOOTER_HEIGHT }]}>
        <MediaControls showAlbumArt={false} compact={true} />
      </View>

      {/* Bottom Safe Area - always present */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: { flex: 1 },
  header: {
    position: 'relative',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  flexSpacer: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    overflow: 'visible',
  },
  expandedTrackDetails: {
    justifyContent: 'center',
    flexShrink: 0, // Don't shrink the track details
  },
  textAndQueueTabs: {
    flex: 1, // Fill remaining space
    minHeight: 0,
  },
  footer: {
    justifyContent: 'center',
  },
});
