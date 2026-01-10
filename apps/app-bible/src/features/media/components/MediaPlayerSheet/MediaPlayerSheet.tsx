import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Dimensions, BackHandler, Platform } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/shared/hooks';
import { useCurrentTrack } from '../../store/PlaybackStore';
import { useMediaPlayerUIStore } from '../../store/MediaPlayerUIStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMediaSettingsStore } from '@/features/settings';
import { GradientBackground } from './GradientBackground';
import { MediaPlayerContent } from './MediaPlayerContent';
import {
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  CONTENT_HEIGHT_COLLAPSED,
} from '../../layout/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MediaPlayerSheet: React.FC = () => {
  // ==========================================
  // HOOKS & STATE
  // ==========================================
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const isInitializing = useRef(false);
  const currentSheetIndex = useRef(0); // Track current sheet index to prevent unwanted changes

  // Get expanded state from store
  const { isExpanded, setExpanded } = useMediaPlayerUIStore();

  // ==========================================
  // ACTIONS
  // ==========================================
  const expand = useCallback(() => setExpanded(true), [setExpanded]);
  const collapse = useCallback(() => setExpanded(false), [setExpanded]);

  // ==========================================
  // CALCULATED VALUES
  // ==========================================
  // Enhanced Android bottom safe area detection
  const effectiveBottomInset = useMemo(() => {
    return (
      (Platform.OS === 'android' && insets.bottom === 0 ? 16 : insets.bottom) +
      74 // Standalone tab bar height
    );
  }, [insets.bottom]);

  // Snap points: collapsed = header + content + footer + effective bottom safe area; expanded = 100%
  const snapPoints = useMemo(() => {
    const collapsedHeight =
      HEADER_HEIGHT +
      CONTENT_HEIGHT_COLLAPSED +
      FOOTER_HEIGHT +
      effectiveBottomInset;
    return [`${(collapsedHeight / SCREEN_HEIGHT) * 100}%`, '100%'];
  }, [effectiveBottomInset]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  // Handle sheet changes for state management only - with improved logic to prevent unwanted state changes
  const handleSheetChanges = useCallback(
    (index: number) => {
      // Prevent state changes during initialization
      if (isInitializing.current) {
        return;
      }

      // Update current sheet index
      currentSheetIndex.current = index;

      // Only update state if there's an actual change needed
      if (index === 0 && isExpanded) {
        // Collapsed state - only collapse if currently expanded
        collapse();
      } else if (index === 1 && !isExpanded) {
        // Expanded state - only expand if currently collapsed
        expand();
      }
      // If index is -1 (dismissed), don't change the expanded state
      // This prevents the sheet from hiding itself when expanded
    },
    [isExpanded, collapse, expand]
  );

  // ==========================================
  // EFFECTS
  // ==========================================
  // Initialize sheet position only on mount or when expanded state changes
  useEffect(() => {
    if (currentTrack && !isInitializing.current) {
      const targetIndex = isExpanded ? 1 : 0;
      // Only change index if it's different from current to prevent unnecessary updates
      if (currentSheetIndex.current !== targetIndex) {
        currentSheetIndex.current = targetIndex;
        bottomSheetRef.current?.snapToIndex(targetIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]); // Removed currentTrack dependency to prevent sheet closing on track changes

  // Handle initial sheet positioning when track first appears (only on mount)
  useEffect(() => {
    if (currentTrack && !isInitializing.current) {
      // Set initial position based on current expanded state
      const targetIndex = isExpanded ? 1 : 0;
      currentSheetIndex.current = targetIndex;
      bottomSheetRef.current?.snapToIndex(targetIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount, not on track changes

  // Observe one-shot expand request from media settings store
  useEffect(() => {
    // Expand when flag is set and a track exists
    const applyIfRequested = () => {
      const s = useMediaSettingsStore.getState();
      if (s.expandOnNextExternalPlay && currentTrack) {
        // Add smooth animation with slight delay for better UX
        setTimeout(() => {
          setExpanded(true);
        }, 150); // Small delay to ensure smooth transition
        // consume the flag to avoid repeated expansions
        s.consumeExpandOnNextExternalPlay();
      }
    };
    // Run once on mount/currentTrack change
    applyIfRequested();
    // Subscribe to changes
    const unsub = useMediaSettingsStore.subscribe(() => {
      applyIfRequested();
    });
    return unsub;
  }, [currentTrack, setExpanded]);

  // Android back button: collapse when expanded
  useEffect(() => {
    const onBack = () => {
      if (currentTrack && isExpanded) {
        collapse();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [currentTrack, isExpanded, collapse]);

  // ==========================================
  // UI CONFIGURATION
  // ==========================================
  const sheetProps = useMemo(
    () => ({
      index: 0, // Start collapsed
      snapPoints,
      onChange: handleSheetChanges,
      backdropComponent: () => null,
      backgroundComponent: GradientBackground,
      handleIndicatorStyle: [
        styles.handle,
        { backgroundColor: theme.colors.border },
      ],
      enablePanDownToClose: false,
      enableDynamicSizing: false,
      enableOverDrag: true,
      overDragResistanceFactor: 0.2,
      keyboardBehavior: 'fillParent' as const,
      keyboardBlurBehavior: 'restore' as const,
      enableHandlePanningGesture: true,
      enableContentPanningGesture: true,
      style: styles.bottomSheetContainer,
    }),
    [snapPoints, handleSheetChanges, theme.colors.border]
  );

  // ==========================================
  // RENDER
  // ==========================================
  if (!currentTrack) return null;

  return (
    <BottomSheet ref={bottomSheetRef} {...sheetProps}>
      <BottomSheetView style={styles.content}>
        <MediaPlayerContent />
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  // Container styles
  bottomSheetContainer: {
    marginBottom: 0,
  },
  content: {
    flex: 1,
  },

  // Handle styles
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
