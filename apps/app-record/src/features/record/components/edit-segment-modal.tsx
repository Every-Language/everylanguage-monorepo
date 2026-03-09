import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
// TODO: Use FilePathService when implementing trimAudio
// import { FilePathService } from '../services';
import type { Segment } from '../types';

export interface EditSegmentModalProps {
  visible: boolean;
  segment: Segment | null;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * Edit Segment Modal Component
 *
 * Modal for editing a segment with waveform clipping.
 * Allows trimming audio by dragging handles on waveform ends.
 */
export const EditSegmentModal: React.FC<EditSegmentModalProps> = ({
  visible,
  segment,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [clipStart, setClipStart] = useState(0); // Percentage (0-100)
  const [clipEnd, setClipEnd] = useState(100); // Percentage (0-100)
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState(0); // Duration in seconds (loaded from audio file)

  const loadWaveform = async (): Promise<void> => {
    if (!segment) return;

    try {
      // TODO: Use extractPreview() from @siteed/expo-audio-studio to generate waveform
      // Also get duration from the audio file
      // For now, generate mock data
      const mockWaveform = Array.from({ length: 100 }, () => Math.random());
      setWaveformData(mockWaveform);
      // TODO: Get actual duration from audio file
      setDuration(30); // Placeholder duration
    } catch (error) {
      // TODO: Use logger instead of console
      // eslint-disable-next-line no-console
      console.error('Failed to load waveform:', error);
    }
  };

  useEffect(() => {
    if (visible && segment) {
      // Reset clipping when modal opens
      setClipStart(0);
      setClipEnd(100);
      loadWaveform();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, segment]);

  const handlePlay = async (): Promise<void> => {
    if (!segment) return;

    // TODO: Play segment with clipped ends using @siteed/expo-audio-studio
    // Calculate actual start/end times from clipStart and clipEnd percentages
    setIsPlaying(!isPlaying);
  };

  const handleSave = async (): Promise<void> => {
    if (!segment) return;

    try {
      // TODO: Get absolute path for segment file when implementing trimAudio
      // const relativePath = segment.object_key || '';
      // const absolutePath = FilePathService.getAbsolutePath(relativePath);

      // Calculate actual times in milliseconds
      // TODO: Use startTimeMs and endTimeMs when implementing trimAudio
      // const durationMs = duration * 1000;
      // const startTimeMs = (clipStart / 100) * durationMs;
      // const endTimeMs = (clipEnd / 100) * durationMs;

      // TODO: Use trimAudio() from @siteed/expo-audio-studio
      // const trimmedAudio = await trimAudio({
      //   fileUri: absolutePath,
      //   startTimeMs,
      //   endTimeMs,
      //   outputFormat: { format: 'm4a' }
      // });

      // TODO: Overwrite original file and update segment metadata

      if (onSave) {
        onSave();
      }
      onClose();
    } catch (error) {
      // TODO: Use logger instead of console
      // eslint-disable-next-line no-console
      console.error('Failed to save trimmed segment:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!segment) {
    return null;
  }

  const clippedStartTime = (clipStart / 100) * duration;
  const clippedEndTime = (clipEnd / 100) * duration;
  const clippedDuration = clippedEndTime - clippedStartTime;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}>
      <SafeAreaView
        {...(Platform.OS === 'ios'
          ? { edges: ['bottom', 'left', 'right'] as const }
          : {})}
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.closeButton,
              { backgroundColor: theme.colors.error },
            ]}
            onPress={onClose}
            accessibilityLabel='Close'>
            <Ionicons name='close' size={20} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Edit Segment
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {/* Waveform */}
          <View style={styles.waveformContainer}>
            <View
              style={[
                styles.waveform,
                { backgroundColor: theme.colors.surface },
              ]}>
              {/* Waveform visualization */}
              <View style={styles.waveformBars}>
                {waveformData.map((value, index) => {
                  const isClipped =
                    index < (clipStart / 100) * waveformData.length ||
                    index > (clipEnd / 100) * waveformData.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.waveformBar,
                        isClipped
                          ? styles.waveformBarClipped
                          : styles.waveformBarNormal,
                        {
                          flex: value,
                          backgroundColor: isClipped
                            ? theme.colors.textSecondary
                            : theme.colors.accent,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Clipping handles */}
              <View
                style={[
                  styles.clipHandle,
                  styles.clipHandleStart,
                  {
                    left: `${clipStart}%`,
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              />
              <View
                style={[
                  styles.clipHandle,
                  styles.clipHandleEnd,
                  {
                    left: `${clipEnd}%`,
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              />
            </View>

            {/* Time labels */}
            <View style={styles.timeLabels}>
              <Text
                style={[
                  styles.timeLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                {formatTime(clippedStartTime)}
              </Text>
              <Text
                style={[
                  styles.timeLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                {formatTime(clippedEndTime)}
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Original Duration:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {formatTime(duration)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Clipped Duration:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {formatTime(clippedDuration)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Controls */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.playButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={handlePlay}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={theme.colors.text}
            />
            <Text style={[styles.playButtonText, { color: theme.colors.text }]}>
              {isPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.colors.accent,
              },
            ]}
            onPress={handleSave}
            accessibilityLabel='Save trimmed segment'>
            <Text
              style={[
                styles.saveButtonText,
                { color: theme.colors.textInverse },
              ]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  waveformContainer: {
    marginBottom: 24,
  },
  waveform: {
    height: 200,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  waveformBar: {
    flex: 1,
    marginHorizontal: 1,
    minHeight: 2,
  },
  waveformBarClipped: {
    opacity: 0.3,
  },
  waveformBarNormal: {
    opacity: 1,
  },
  clipHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 10,
  },
  clipHandleStart: {
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  clipHandleEnd: {
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeLabel: {
    fontSize: 12,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  playButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
