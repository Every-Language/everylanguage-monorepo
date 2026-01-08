import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { MenuView, type MenuAction } from '@react-native-menu/menu';
import { logger } from '@/shared/utils/logger';
import { getSpeedDisplay } from '../../utils/speedUtils';
import type { PlaybackRate } from '../../constants/playback';
import { usePlaybackRate } from '../../store/PlaybackStore';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Playback rate strings used only in this component
const PLAYBACK_RATE_STRINGS = ['0.5', '1', '1.25', '1.5', '2'] as const;

interface SpeedControlProps {
  compact?: boolean;
  onRateChange: (rate: PlaybackRate) => Promise<void>;
}

export const SpeedControl: React.FC<SpeedControlProps> = React.memo(
  function SpeedControl({ compact = false, onRateChange }: SpeedControlProps) {
    const { theme } = useTheme();
    const { t } = useLocalization();

    // Get playback rate from store
    const playbackRate = usePlaybackRate();

    const rateActions: MenuAction[] = PLAYBACK_RATE_STRINGS.map(id => ({
      id,
      title: t('audio.speedRate', { rate: id }),
      state:
        (Number(id) === 0.5 && playbackRate === 0.5) ||
        (Number(id) === 1 && playbackRate === 1) ||
        (Number(id) === 1.25 && playbackRate === 1.25) ||
        (Number(id) === 1.5 && playbackRate === 1.5) ||
        (Number(id) === 2 && playbackRate === 2)
          ? 'on'
          : 'off',
    }));

    const onRateAction = useCallback(
      async ({ nativeEvent }: { nativeEvent: { event: string } }) => {
        const key = nativeEvent.event;
        const rate = Number(key);
        if (!isNaN(rate)) {
          try {
            await onRateChange(rate as PlaybackRate);
          } catch (e) {
            logger.error(ENABLE_LOGGING, 'Failed to set playback rate', e);
          }
        }
      },
      [onRateChange]
    );

    return (
      <View style={[styles.speedInfo, compact && styles.mt0]}>
        <MenuView onPressAction={onRateAction} actions={rateActions}>
          <Text
            style={[styles.speedText, { color: theme.colors.textSecondary }]}>
            {getSpeedDisplay(playbackRate)}
          </Text>
        </MenuView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  speedInfo: {
    alignItems: 'center',
  },
  mt0: { marginTop: 0 },
  speedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
