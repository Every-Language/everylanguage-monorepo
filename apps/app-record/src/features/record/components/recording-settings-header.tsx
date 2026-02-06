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
      <View style={styles.headerLeft} />
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        Recording Settings
      </Text>
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: theme.colors.error }]}
        onPress={onClose}
        accessibilityLabel='Close'>
        <Ionicons name='close' size={20} color={theme.colors.textInverse} />
      </TouchableOpacity>
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
  headerLeft: {
    width: 28,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
