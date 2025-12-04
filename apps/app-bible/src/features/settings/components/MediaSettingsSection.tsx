import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useAutoOpenOnPlay, useSettingsActions } from '../store/settingsStore';
import { SettingsToggle } from './SettingsToggle';

/**
 * Media settings section component
 */
export const MediaSettingsSection: React.FC = () => {
  const { theme } = useTheme();
  const autoOpenOnPlay = useAutoOpenOnPlay();
  const { updateMediaSettings } = useSettingsActions();

  const handleAutoOpenToggle = (value: boolean) => {
    updateMediaSettings({ autoOpenOnPlay: value });
  };

  const styles = StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    sectionContent: {
      paddingHorizontal: 16,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Media Player</Text>
      <View style={styles.sectionContent}>
        <SettingsToggle
          title='Auto-open Media Player'
          description='Automatically expand the media player when playing chapters from outside the player'
          value={autoOpenOnPlay}
          onValueChange={handleAutoOpenToggle}
          testID='auto-open-toggle'
        />
      </View>
    </View>
  );
};
