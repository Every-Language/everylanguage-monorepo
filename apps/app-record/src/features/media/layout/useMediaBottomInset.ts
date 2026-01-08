import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentTrack } from '@/features/media/store/PlaybackStore';
import { FOOTER_HEIGHT, HEADER_HEIGHT } from './constants';

/**
 * Computes the bottom inset needed to avoid being covered by the collapsed media player.
 * Returns 0 if there is no current track (player hidden).
 */
export const useMediaBottomInset = (): number => {
  const insets = useSafeAreaInsets();
  const currentTrack = useCurrentTrack();

  // If no track, the sheet is not mounted; no inset is needed
  if (!currentTrack) return 0;

  // Collapsed sheet occlusion within content area = header + footer + android fallback (not iOS safe area)
  const androidFallback =
    Platform.OS === 'android' && insets.bottom === 0 ? 16 : 0;
  return HEADER_HEIGHT + FOOTER_HEIGHT + androidFallback;
};
