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
import { RecordingService, type TempSegment } from '../services';
// TODO: Use useRecordingConfig when implementing actual recording
// import { useRecordingConfig } from '../hooks';

export interface RecordModalProps {
  visible: boolean;
  sequenceId: string;
  projectId: string;
  onClose: () => void;
  onSegmentsInserted?: () => void;
}

/**
 * Record Modal Component
 *
 * Modal for recording audio with live waveform and real-time segment generation.
 * Uses @siteed/expo-audio-studio for recording and threshold detection.
 */
export const RecordModal: React.FC<RecordModalProps> = ({
  visible,
  sequenceId,
  projectId,
  onClose,
  onSegmentsInserted,
}) => {
  const { theme } = useTheme();
  // TODO: Use config when implementing actual recording
  // const { config } = useRecordingConfig();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [tempSegments, setTempSegments] = useState<TempSegment[]>([]);
  const [recordingMode, setRecordingMode] = useState<'recording' | 'edit'>(
    'recording'
  );
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const loadTempSegments = async (): Promise<void> => {
    try {
      // Load segments based on current mode
      const statusFilter =
        recordingMode === 'recording' && isRecording
          ? 'recording'
          : recordingMode === 'edit'
            ? 'completed'
            : undefined;
      const segments = await RecordingService.getTempSegments(
        sequenceId,
        statusFilter
      );
      setTempSegments(segments);

      // If we have completed segments and we're in recording mode but not recording,
      // switch to edit mode
      if (
        segments.length > 0 &&
        recordingMode === 'recording' &&
        !isRecording &&
        segments.some(s => s.recording_status === 'completed')
      ) {
        setRecordingMode('edit');
      }
    } catch (error) {
      // TODO: Use logger instead of console
      // eslint-disable-next-line no-console
      console.error('Failed to load temp segments:', error);
    }
  };

  // Load temp segments when modal opens
  useEffect(() => {
    if (visible) {
      // Reset to recording mode when modal opens
      setRecordingMode('recording');
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);
      // Initialize empty waveform
      setWaveformData(Array.from({ length: 100 }, () => 0));
      loadTempSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sequenceId]);

  // Simulate waveform updates when recording
  useEffect(() => {
    if (!isRecording || isPaused) {
      return;
    }

    const interval = setInterval(() => {
      // Generate mock waveform data
      const newData = Array.from(
        { length: 100 },
        () => Math.random() * 0.8 + 0.1
      );
      setWaveformData(newData);
      // Update audio level for VU meter (0-1 range, convert to dB)
      setAudioLevel(Math.random() * 0.6 + 0.2);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleStartRecording = async (): Promise<void> => {
    // TODO: Implement actual recording with @siteed/expo-audio-studio
    // - Use useAudioRecorder hook
    // - Monitor audio levels for threshold detection
    // - Create segments when thresholds are crossed
    setIsRecording(true);
    setIsPaused(false);
    setRecordingMode('recording');
    // Reload segments to show any that are being recorded
    await loadTempSegments();
  };

  const handleSave = async (): Promise<void> => {
    const wasRecording = isRecording;

    if (wasRecording) {
      // Stop recording first
      setIsRecording(false);
      setIsPaused(false);
      setRecordingMode('edit');
    }

    // Get completed segments (reload after stopping to ensure we have latest)
    const allSegments = await RecordingService.getTempSegments(
      sequenceId,
      'completed'
    );
    const completedSegments = allSegments.filter(
      s => s.recording_status === 'completed' && s.is_hidden === 0
    );

    // Update local state
    setTempSegments(allSegments);

    if (completedSegments.length > 0) {
      // Insert segments into the segments list
      await handleInsert();
    } else if (!wasRecording && allSegments.length === 0) {
      // Start recording if no segments yet and wasn't recording
      await handleStartRecording();
    }
  };

  const handlePauseRecording = async (): Promise<void> => {
    // TODO: Pause recording
    setIsPaused(!isPaused);
  };

  const handleInsert = async (): Promise<void> => {
    // TODO: Get user ID from auth
    const userId = null;
    try {
      await RecordingService.insertSegments(
        sequenceId,
        projectId,
        null, // Insert at beginning for now
        userId
      );
      if (onSegmentsInserted) {
        onSegmentsInserted();
      }
      onClose();
    } catch (error) {
      // TODO: Use logger instead of console
      // eslint-disable-next-line no-console
      console.error('Failed to insert segments:', error);
    }
  };

  const handleToggleHide = async (
    segmentId: string,
    isHidden: number
  ): Promise<void> => {
    try {
      await RecordingService.updateTempSegment(segmentId, {
        is_hidden: isHidden === 0 ? 1 : 0,
      });
      await loadTempSegments();
    } catch (error) {
      // TODO: Use logger instead of console
      // eslint-disable-next-line no-console
      console.error('Failed to toggle hide:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert audio level (0-1) to dB for VU meter
  const getAudioLevelDb = (level: number): number => {
    // Convert linear 0-1 to approximate dB scale (-34 to 0)
    // Using a logarithmic approximation
    if (level === 0) return -34;
    return Math.max(-34, 20 * Math.log10(level));
  };

  const audioLevelDb = getAudioLevelDb(audioLevel);

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
            Record
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {/* Waveform - Always visible */}
          <View style={styles.waveformContainer}>
            <View
              style={[
                styles.waveformWrapper,
                { backgroundColor: theme.colors.surface },
              ]}>
              {/* Waveform visualization */}
              <View style={styles.waveform}>
                <View style={styles.waveformBars}>
                  {waveformData.map((value, index) => (
                    <View
                      key={index}
                      style={[
                        styles.waveformBar,
                        {
                          height: `${Math.max(2, value * 100)}%`,
                          backgroundColor:
                            isRecording && !isPaused
                              ? '#FF3B30' // Red when recording
                              : theme.colors.textSecondary,
                          opacity: isRecording && !isPaused ? 1 : 0.3,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* VU Meter */}
              <View style={styles.vuMeter}>
                <View style={styles.vuMeterScale}>
                  <Text
                    style={[
                      styles.vuMeterLabel,
                      { color: theme.colors.textSecondary },
                    ]}>
                    0
                  </Text>
                  <Text
                    style={[
                      styles.vuMeterLabel,
                      { color: theme.colors.textSecondary },
                    ]}>
                    -12
                  </Text>
                  <Text
                    style={[
                      styles.vuMeterLabel,
                      { color: theme.colors.textSecondary },
                    ]}>
                    -24
                  </Text>
                  <Text
                    style={[
                      styles.vuMeterLabel,
                      { color: theme.colors.textSecondary },
                    ]}>
                    -34
                  </Text>
                </View>
                <View
                  style={[
                    styles.vuMeterBar,
                    { backgroundColor: theme.colors.border },
                  ]}>
                  {isRecording && !isPaused && audioLevel > 0 && (
                    <View
                      style={[
                        styles.vuMeterFill,
                        {
                          height: `${Math.max(0, Math.min(100, ((audioLevelDb + 34) / 34) * 100))}%`,
                          backgroundColor:
                            audioLevelDb > -12 ? '#FF3B30' : '#34C759', // Red above -12dB, green below
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Segments List */}
          <View style={styles.segmentsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Segments ({tempSegments.length})
            </Text>
            {tempSegments.map(segment => {
              const isHidden = segment.is_hidden === 1;
              return (
                <View
                  key={segment.id}
                  style={[
                    styles.segmentItem,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: isHidden ? 0.5 : 1,
                    },
                  ]}>
                  <View style={styles.segmentInfo}>
                    <Text
                      style={[
                        styles.segmentIndex,
                        { color: theme.colors.text },
                      ]}>
                      #{segment.segment_index - 10000 + 1}
                    </Text>
                    <Text
                      style={[
                        styles.segmentDuration,
                        { color: theme.colors.text },
                      ]}>
                      {formatDuration(segment.duration_seconds)}
                    </Text>
                    <Text
                      style={[
                        styles.segmentLevel,
                        { color: theme.colors.textSecondary },
                      ]}>
                      Level: {segment.audio_level.toFixed(2)}
                    </Text>
                  </View>
                  {recordingMode === 'edit' && (
                    <TouchableOpacity
                      style={[
                        styles.hideButton,
                        {
                          backgroundColor: isHidden
                            ? theme.colors.accent
                            : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() =>
                        handleToggleHide(segment.id, segment.is_hidden)
                      }>
                      <Ionicons
                        name={isHidden ? 'eye' : 'eye-off'}
                        size={18}
                        color={
                          isHidden
                            ? theme.colors.textInverse
                            : theme.colors.text
                        }
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {tempSegments.length === 0 && (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}>
                No segments yet. Start recording to generate segments.
              </Text>
            )}
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
          <View style={styles.footerButtons}>
            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.footerButton}
              onPress={onClose}
              accessibilityLabel='Cancel'>
              <View
                style={[
                  styles.footerButtonCircle,
                  { backgroundColor: theme.colors.error },
                ]}>
                <Ionicons
                  name='close'
                  size={20}
                  color={theme.colors.textInverse}
                />
              </View>
              <Text
                style={[
                  styles.footerButtonLabel,
                  { color: theme.colors.text },
                ]}>
                Cancel
              </Text>
            </TouchableOpacity>

            {/* Pause Button - Only show when recording */}
            {isRecording && (
              <TouchableOpacity
                style={styles.footerButton}
                onPress={handlePauseRecording}
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
                  style={[
                    styles.footerButtonLabel,
                    { color: theme.colors.text },
                  ]}>
                  {isPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleSave}
              accessibilityLabel={
                isRecording
                  ? 'Stop and Save'
                  : tempSegments.length > 0
                    ? 'Save segments'
                    : 'Start recording'
              }>
              <View
                style={[
                  styles.footerButtonCircle,
                  { backgroundColor: theme.colors.accent },
                ]}>
                <Ionicons
                  name={
                    isRecording
                      ? 'stop'
                      : tempSegments.length > 0
                        ? 'checkmark'
                        : 'mic'
                  }
                  size={20}
                  color={theme.colors.textInverse}
                />
              </View>
              <Text
                style={[
                  styles.footerButtonLabel,
                  { color: theme.colors.text },
                ]}>
                {isRecording
                  ? 'Save'
                  : tempSegments.length > 0
                    ? 'Save'
                    : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
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
  waveformWrapper: {
    flexDirection: 'row',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    gap: 12,
  },
  waveform: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
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
    borderRadius: 1,
  },
  vuMeter: {
    width: 40,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  vuMeterScale: {
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 4,
  },
  vuMeterLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  vuMeterBar: {
    width: 20,
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  vuMeterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 10,
  },
  segmentsContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  segmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segmentIndex: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentLevel: {
    fontSize: 12,
  },
  hideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
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
