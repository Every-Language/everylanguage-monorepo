import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks';
import { AppTabs } from './AppTabs';
import { MediaPlayerSheet } from '@/features/media/components';
import { useCurrentTrack } from '@/features/media';

export const AppShell: React.FC = () => {
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();

  return (
    <View style={[styles.flex1, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex1}>
        <AppTabs />
      </SafeAreaView>
      {currentTrack ? <MediaPlayerSheet /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
