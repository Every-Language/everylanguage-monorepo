import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';

export interface RecordModalFooterProps {
  isRecording: boolean;
  isPaused: boolean;
  hasSegments: boolean;
  onCancel: () => void;
  onPause: () => void;
  onSave: () => void;
}

/**
 * Record Modal Footer Component
 *
 * Contains recording control buttons
 */
export const RecordModalFooter: React.FC<RecordModalFooterProps> = ({
  isRecording,
  isPaused,
  hasSegments,
  onCancel,
  onPause,
  onSave,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}>
      <View style={styles.footerButtons}>
        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onCancel}
          accessibilityLabel='Cancel'>
          <View
            style={[
              styles.footerButtonCircle,
              { backgroundColor: theme.colors.error },
            ]}>
            <Ionicons name='close' size={20} color={theme.colors.textInverse} />
          </View>
          <Text
            style={[styles.footerButtonLabel, { color: theme.colors.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        {/* Pause Button - Only show when recording */}
        {isRecording && (
          <TouchableOpacity
            style={styles.footerButton}
            onPress={onPause}
            accessibilityLabel={isPaused ? 'Resume' : 'Pause'}>
            <View
              style={[
                styles.footerButtonCircle,
                { backgroundColor: theme.colors.accent },
              ]}>
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={20}
                color={theme.colors.textInverse}
              />
            </View>
            <Text
              style={[styles.footerButtonLabel, { color: theme.colors.text }]}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Stop/Save Button */}
        <TouchableOpacity
          style={styles.footerButton}
          onPress={onSave}
          accessibilityLabel={
            isRecording
              ? 'Stop recording'
              : hasSegments
                ? 'Save segments'
                : 'Start recording'
          }>
          <View
            style={[
              styles.footerButtonCircle,
              { backgroundColor: theme.colors.accent },
            ]}>
            <Ionicons
              name={isRecording ? 'stop' : hasSegments ? 'checkmark' : 'mic'}
              size={20}
              color={theme.colors.textInverse}
            />
          </View>
          <Text
            style={[styles.footerButtonLabel, { color: theme.colors.text }]}>
            {isRecording ? 'Stop' : hasSegments ? 'Save' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 16,
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  footerButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
