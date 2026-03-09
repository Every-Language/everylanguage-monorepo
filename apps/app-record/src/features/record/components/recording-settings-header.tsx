import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

export interface RecordingSettingsHeaderProps {
  onClose: () => void;
}

/**
 * Recording Settings Modal Header Component
 */
export const RecordingSettingsHeader: React.FC<
  RecordingSettingsHeaderProps
> = ({ onClose }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}>
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: theme.colors.error }]}
        onPress={onClose}
        accessibilityLabel='Close'>
        <Ionicons name='close' size={20} color={theme.colors.textInverse} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        Recording Settings
      </Text>
      <View style={styles.headerRight} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 28,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
