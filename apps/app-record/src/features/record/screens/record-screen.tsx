import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/ui';
import { useTheme } from '@/shared/hooks';
// TODO: Use useTranslation when implementing UI text
// import { useTranslation } from '@/shared/hooks';
import { useSequence, useSequenceChapterInfo, useSegments } from '../hooks';
import {
  MediaPlayer,
  RecordModal,
  EditSegmentModal,
  SegmentAudioPlayer,
  RecordingSettingsModal,
} from '../components';
import { DeleteAllSegmentsButton } from '../components/delete-all-segments-button';
import type { Segment } from '../hooks';

/**
 * Recording Screen
 *
 * Main screen for recording audio for a sequence.
 * Displays sequence info, existing segments, and record button.
 */
export const RecordScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sequenceId: string;
    projectId: string;
  }>();
  const sequenceId = params.sequenceId || '';
  const projectId = params.projectId || '';

  const { theme } = useTheme();
  // TODO: Use translation when implementing UI text
  // const { t } = useTranslation();
  const { sequence } = useSequence(sequenceId);
  const { chapterInfo } = useSequenceChapterInfo(sequenceId);
  const { segments } = useSegments(sequenceId);
  const [isRecordModalVisible, setIsRecordModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);

  const handleBack = (): void => {
    router.back();
  };

  const handleRecord = (): void => {
    setIsRecordModalVisible(true);
  };

  const handleSegmentsInserted = (): void => {
    // Segments will refresh automatically via useSegments hook
    setIsRecordModalVisible(false);
  };

  if (!sequence) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <AppHeader
          title='Recording'
          leftButton={{
            onPress: handleBack,
          }}
        />
        <View style={styles.content}>
          <Text style={[styles.error, { color: theme.colors.error }]}>
            Sequence not found
          </Text>
        </View>
      </View>
    );
  }

  const subtitle = chapterInfo
    ? `${chapterInfo.book_name} ${chapterInfo.chapter_number}`
    : sequence.name;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={sequence.name}
        leftButton={{
          onPress: handleBack,
        }}
        rightButtons={[
          {
            onPress: () => setIsSettingsModalVisible(true),
            icon: (
              <Ionicons
                name='settings-outline'
                size={32}
                color={theme.colors.accent}
              />
            ),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {/* Dev: Delete All Segments Button */}
        <DeleteAllSegmentsButton sequenceId={sequenceId} />

        {/* Media Player */}
        {segments && segments.length > 0 && (
          <MediaPlayer
            segments={segments}
            onSegmentChange={_segmentId => {
              // TODO: Handle segment change
            }}
          />
        )}

        {/* Segments List */}
        {segments && segments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Segments ({segments.length})
            </Text>
            {segments.map(segment => (
              <SegmentAudioPlayer
                key={segment.id}
                segment={segment}
                // onEdit={() => handleEditSegment(segment.id)}
                // onPlay={() => handlePlaySegment(segment.id)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {(!segments || segments.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons
              name='mic-outline'
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No segments recorded yet
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}>
              Tap the record button to start
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Record Button */}
      <View style={styles.recordButtonContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            {
              backgroundColor: theme.colors.accent,
              shadowColor: theme.colors.shadow,
            },
          ]}
          onPress={handleRecord}
          accessibilityLabel='Record audio'
          accessibilityRole='button'>
          <Ionicons name='mic' size={32} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Record Modal */}
      <RecordModal
        visible={isRecordModalVisible}
        sequenceId={sequenceId}
        projectId={projectId}
        onClose={() => setIsRecordModalVisible(false)}
        onSegmentsInserted={handleSegmentsInserted}
      />

      {/* Edit Segment Modal */}
      <EditSegmentModal
        visible={editingSegment !== null}
        segment={editingSegment}
        onClose={() => setEditingSegment(null)}
        onSave={() => {
          // Segments will refresh automatically via useSegments hook
          setEditingSegment(null);
        }}
      />

      {/* Recording Settings Modal */}
      <RecordingSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 100 + 32, // Space for record button
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for record button
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 8 + 108,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
