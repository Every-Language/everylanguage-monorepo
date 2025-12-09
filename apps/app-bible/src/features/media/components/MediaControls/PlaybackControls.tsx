import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { logger } from '@/shared/utils/logger';
import { ICON_SIZES, BUTTON_SIZES, SPACING } from '../../constants';
import {
  usePlaybackState,
  usePlaybackActions,
} from '../../store/PlaybackStore';
import { useVerseStore } from '../../store/VerseStore';

// Logging configuration for this module
const ENABLE_LOGGING = true;

interface PlaybackControlsProps {
  compact?: boolean;
  showAlbumArt?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = React.memo(
  function PlaybackControls({
    compact = false,
    showAlbumArt = false,
  }: PlaybackControlsProps) {
    const { theme } = useTheme();

    // Get playback state and actions directly from hooks
    const { isPlaying, isLoading } = usePlaybackState();
    const { play, pause } = usePlaybackActions();

    // Get navigation actions from MediaPlayerService
    const skipToNext = async () => {
      const { mediaPlayerService } =
        await import('../../services/MediaPlayerService');
      return mediaPlayerService.skipToNext();
    };

    const skipToPrevious = async () => {
      const { getPlaybackStore } = await import('../../store/PlaybackStore');
      const position = getPlaybackStore().position;
      const { mediaPlayerService } =
        await import('../../services/MediaPlayerService');
      return mediaPlayerService.skipToPrevious(position);
    };
    const { nextVerse, previousVerse } = useVerseStore();

    const handlePlayPause = async () => {
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    };

    const handlePreviousQueueItem = async () => {
      try {
        const success = await skipToPrevious(); // Position not needed for queue navigation
        if (!success) {
          logger.info(
            ENABLE_LOGGING,
            'No previous track available or failed to skip'
          );
        }
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Error skipping to previous track:',
          error
        );
      }
    };

    const handleNextQueueItem = async () => {
      try {
        const success = await skipToNext();
        if (!success) {
          logger.info(
            ENABLE_LOGGING,
            'No next track available or failed to skip'
          );
        }
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Error skipping to next track:', error);
      }
    };

    const handlePreviousVerse = async () => {
      try {
        await previousVerse();
        logger.info(ENABLE_LOGGING, '[PlaybackControls] Previous verse');
      } catch (e) {
        logger.error(ENABLE_LOGGING, '[PlaybackControls] Prev verse error', e);
      }
    };

    const handleNextVerse = async () => {
      try {
        await nextVerse();
        logger.info(ENABLE_LOGGING, '[PlaybackControls] Next verse');
      } catch (e) {
        logger.error(ENABLE_LOGGING, '[PlaybackControls] Next verse error', e);
      }
    };

    return (
      <View
        style={[
          styles.controlsContainer,
          compact && styles.compactControlsContainer,
        ]}>
        {/* Album Art */}
        {showAlbumArt && (
          <View style={styles.albumArtContainer}>
            <Image
              source={{
                uri: 'https://via.placeholder.com/60x60/8B5CF6/FFFFFF?text=📖',
              }}
              style={[
                styles.albumArt,
                {
                  width: BUTTON_SIZES.ALBUM_ART.width,
                  height: BUTTON_SIZES.ALBUM_ART.height,
                  borderRadius: BUTTON_SIZES.ALBUM_ART.borderRadius,
                },
              ]}
            />
          </View>
        )}

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <View style={styles.controls}>
            {/* Outer Left: Previous Queue Item */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePreviousQueueItem}>
              <MaterialIcons
                name='skip-previous'
                size={
                  compact
                    ? ICON_SIZES.CONTROL_BUTTON.compact
                    : ICON_SIZES.CONTROL_BUTTON.normal
                }
                color={theme.colors.text}
              />
            </TouchableOpacity>

            {/* Inner Left: Previous Verse */}
            <TouchableOpacity
              style={[styles.controlButton]}
              onPress={handlePreviousVerse}>
              <MaterialIcons
                name='keyboard-arrow-left'
                size={
                  compact
                    ? ICON_SIZES.CONTROL_BUTTON.compact
                    : ICON_SIZES.CONTROL_BUTTON.normal
                }
                color={theme.colors.text}
              />
            </TouchableOpacity>

            {/* Center: Play/Pause */}
            <TouchableOpacity
              style={[
                styles.playButton,
                {
                  backgroundColor: theme.colors.primary,
                  width: BUTTON_SIZES.PLAY_BUTTON.width,
                  height: BUTTON_SIZES.PLAY_BUTTON.height,
                  borderRadius: BUTTON_SIZES.PLAY_BUTTON.borderRadius,
                },
                isLoading && styles.opacityDisabled,
              ]}
              onPress={handlePlayPause}
              disabled={isLoading}>
              <MaterialIcons
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={
                  compact
                    ? ICON_SIZES.PLAY_BUTTON.compact
                    : ICON_SIZES.PLAY_BUTTON.normal
                }
                color={theme.colors.background}
              />
            </TouchableOpacity>

            {/* Inner Right: Next Verse */}
            <TouchableOpacity
              style={[styles.controlButton]}
              onPress={handleNextVerse}>
              <MaterialIcons
                name='keyboard-arrow-right'
                size={
                  compact
                    ? ICON_SIZES.CONTROL_BUTTON.compact
                    : ICON_SIZES.CONTROL_BUTTON.normal
                }
                color={theme.colors.text}
              />
            </TouchableOpacity>

            {/* Outer Right: Next Queue Item */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleNextQueueItem}>
              <MaterialIcons
                name='skip-next'
                size={
                  compact
                    ? ICON_SIZES.CONTROL_BUTTON.compact
                    : ICON_SIZES.CONTROL_BUTTON.normal
                }
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Spacer to balance layout */}
          <View style={[styles.spacer24, { width: SPACING.SPACER_24 }]} />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  controlsContainer: {
    alignItems: 'center',
  },
  compactControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  albumArtContainer: {
    marginBottom: 12,
  },
  albumArt: {
    // Dimensions now set inline using BUTTON_SIZES.ALBUM_ART
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    flex: 1,
  },
  controlButton: {
    padding: 8,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    // Dimensions now set inline using BUTTON_SIZES.PLAY_BUTTON
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  opacityDisabled: { opacity: 0.6 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  spacer24: {
    // Width now set inline using SPACING.SPACER_24
  },
});
