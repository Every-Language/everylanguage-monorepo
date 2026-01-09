import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks';
import { AppTabs } from './AppTabs';
import { MediaPlayerSheet } from '@/features/media/components';
import { useCurrentTrack } from '@/features/media';
import { StandaloneTabBar } from './StandaloneTabBar';

export const AppShell: React.FC = () => {
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();

  return (
    <View style={[styles.flex1, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex1}>
        <AppTabs />
      </SafeAreaView>
      {currentTrack ? <MediaPlayerSheet /> : null}
      {/* Render tab bar after bottom sheet to ensure it's on top */}
      <StandaloneTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
