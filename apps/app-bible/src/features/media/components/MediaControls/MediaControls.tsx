import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { logger } from '@/shared/utils/logger';
import { useCurrentTrack } from '../../store/PlaybackStore';
import { useMediaPlayerExpanded } from '../../store/MediaPlayerUIStore';
import { ProgressBar } from './ProgressBar';
import { TimeDisplay } from './TimeDisplay';
import { PlaybackControls } from './PlaybackControls';
import { SpeedControl } from './SpeedControl';
import type { PlaybackRate } from '../../constants/playback';

// Logging configuration for this module
const ENABLE_LOGGING = false;

interface MediaControlsProps {
  showAlbumArt?: boolean;
  compact?: boolean;
}

export const MediaControls: React.FC<MediaControlsProps> = React.memo(
  function MediaControls({
    showAlbumArt = false,
    compact = false,
  }: MediaControlsProps) {
    // Only need currentTrack to check if we should render
    const currentTrack = useCurrentTrack();

    // Get expanded state from store
    const isExpanded = useMediaPlayerExpanded();

    const setRate = useCallback(async (rate: PlaybackRate) => {
      try {
        const { getPlaybackStore } = await import('../../store/PlaybackStore');
        await getPlaybackStore().setPlaybackRate(rate);
      } catch (e) {
        logger.error(ENABLE_LOGGING, 'Failed to set playback rate', e);
      }
    }, []);

    if (!currentTrack) return null;

    // Bottom inset padding is applied by the footer wrapper in MediaPlayerSheet
    const containerStyle = [
      styles.container,
      compact && styles.compactContainer,
    ];

    return (
      <View style={containerStyle}>
        {/* Speed Controls Row - Only visible when expanded */}
        {isExpanded && (
          <View style={styles.speedControlsRow}>
            <SpeedControl compact={false} onRateChange={setRate} />
          </View>
        )}

        {/* Progress Bar */}
        <ProgressBar />

        {/* Time Display */}
        <TimeDisplay />

        {/* Main Controls */}
        <View style={styles.controlsRow}>
          <PlaybackControls compact={compact} showAlbumArt={showAlbumArt} />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compactContainer: {
    paddingVertical: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  speedControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: 8,
    paddingRight: 8,
  },
});
