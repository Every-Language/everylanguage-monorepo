import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { MenuView } from '@react-native-menu/menu';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  getTrackMenuActions,
  handleTrackMenuAction,
} from '@/features/bible/utils/chapterMenu';
import { useShare } from '@/features/sharing/hooks/useShare';
import { useCurrentVersions } from '@/features/languages/hooks';
import { useQueueStore } from '../../store/QueueStore';
import type { DisplayQueueItem } from '../../store/QueueStore';

// @ts-expect-error - Icon type definitions not available
import Icon from 'react-native-vector-icons/Ionicons';

interface QueueCardProps {
  track: DisplayQueueItem;
  isCurrentlyPlaying?: boolean;
  onPlayTrack: (track: DisplayQueueItem) => Promise<void>;
  onRemoveFromQueue: (track: DisplayQueueItem) => Promise<void>;
}

export const QueueCard: React.FC<QueueCardProps> = React.memo(
  function QueueCard({
    track,
    isCurrentlyPlaying = false,
    onPlayTrack,
    onRemoveFromQueue,
  }) {
    const { theme } = useTheme();
    const { shareChapter } = useShare();
    const { currentAudioVersion, currentTextVersion } = useCurrentVersions();
    const addToQueue = useQueueStore(state => state.addToQueue);

    return (
      <Animated.View
        key={`${track.id}-${track.queueIndex}`}
        layout={LinearTransition.duration(120)}
        style={[
          styles.queueCard,
          {
            backgroundColor: theme.colors.surface,
          },
          isCurrentlyPlaying && [
            { borderWidth: 1 },
            { borderColor: theme.colors.primary },
          ],
        ]}>
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <Icon
            name='reorder-two'
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <View style={styles.rowAlignCenter}>
            {track.isManual && (
              <View style={styles.mr6}>
                <Icon
                  name='add-circle'
                  size={14}
                  color={theme.colors.primary}
                />
              </View>
            )}
            <Text
              style={[styles.trackTitle, { color: theme.colors.text }]}
              numberOfLines={1}>
              {track.title}
            </Text>
          </View>
          <Text
            style={[
              styles.trackSubtitle,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={1}>
            {track.subtitle}
          </Text>
        </View>

        {/* Play Button */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => onPlayTrack(track)}>
          <Icon name='play' size={16} color={theme.colors.background} />
        </TouchableOpacity>

        {/* Menu Button */}
        <MenuView
          actions={getTrackMenuActions({
            isManual: track.isManual,
            hasMediaFiles: true,
            withIcons: true,
            includeAudioShare: true,
            includeQueue: false,
            includeShare: false,
          })}
          onPressAction={async ({ nativeEvent }) => {
            const action = nativeEvent.event;
            switch (action) {
              case 'remove':
                onRemoveFromQueue(track);
                break;
              case 'queue':
              case 'share_audio': {
                await handleTrackMenuAction(action, {
                  trackId: track.id,
                  chapterId: track.chapterId,
                  isManual: track.isManual,
                  chapterNumber: (() => {
                    // Try to parse chapter number from title like "Genesis 5"
                    const title = track.title || '';
                    const m = title.match(/\s(\d+)$/);
                    if (m && m[1]) {
                      const n = parseInt(m[1], 10);
                      if (Number.isFinite(n) && n > 0) return n;
                    }
                    return 0;
                  })(),
                  bookName: (() => {
                    const title = track.title || '';
                    return title.replace(/\s\d+$/, '');
                  })(),
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
                  ...(currentAudioVersion?.id
                    ? { currentAudioVersionId: currentAudioVersion.id }
                    : {}),
                  ...(currentTextVersion?.id
                    ? { currentTextVersionId: currentTextVersion.id }
                    : {}),
                });
                break;
              }
            }
          }}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon
              name='ellipsis-horizontal'
              size={16}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </MenuView>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 4,
    borderRadius: 12,
    minHeight: 72,
  },
  dragHandle: {
    paddingRight: 12,
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowAlignCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mr6: {
    marginRight: 6,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
