import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { BottomSheetSectionList } from '@gorhom/bottom-sheet';
import { QueueCard } from './QueueCard';
import type { DisplayQueueItem } from '../../store/QueueStore';

// @ts-expect-error - Icon type definitions not available
import Icon from 'react-native-vector-icons/Ionicons';

interface QueueListProps {
  displayQueue: DisplayQueueItem[];
  onPlayTrack: (track: DisplayQueueItem) => Promise<void>;
  onRemoveFromQueue: (track: DisplayQueueItem) => Promise<void>;
  onClearQueue: () => Promise<void>;
}

export const QueueList: React.FC<QueueListProps> = React.memo(
  function QueueList({
    displayQueue,
    onPlayTrack,
    onRemoveFromQueue,
    onClearQueue,
  }) {
    const { theme } = useTheme();
    const { t } = useLocalization();

    const manualTracks = useMemo(
      () => displayQueue.filter((t: DisplayQueueItem) => t.isManual),
      [displayQueue]
    );
    const autoplayTracks = useMemo(
      () => displayQueue.filter((t: DisplayQueueItem) => !t.isManual),
      [displayQueue]
    );

    // Virtualized sections for BottomSheetSectionList
    const queueSections = useMemo(() => {
      const sections: Array<{
        key: 'manual' | 'autoplay';
        title: string;
        data: DisplayQueueItem[];
      }> = [];
      if (manualTracks.length > 0) {
        sections.push({
          key: 'manual',
          title: t('queue.queueSectionTitle', { count: manualTracks.length }),
          data: manualTracks,
        });
      }
      if (autoplayTracks.length > 0) {
        sections.push({
          key: 'autoplay',
          title: t('queue.autoplaySectionTitle', {
            count: autoplayTracks.length,
          }),
          data: autoplayTracks,
        });
      }
      return sections;
    }, [manualTracks, autoplayTracks, t]);

    const renderQueueCard = ({ item }: { item: DisplayQueueItem }) => (
      <QueueCard
        track={item}
        onPlayTrack={onPlayTrack}
        onRemoveFromQueue={onRemoveFromQueue}
      />
    );

    const renderSectionHeader = ({
      section,
    }: {
      section: { key: string; title: string };
    }) => (
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>
          {section.title}
        </Text>
        {section.key === 'manual' && (
          <TouchableOpacity
            onPress={onClearQueue}
            style={[
              styles.clearButton,
              { backgroundColor: theme.colors.error + '1A' },
            ]}>
            <Text
              style={[styles.clearButtonText, { color: theme.colors.error }]}>
              {t('queue.clear')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );

    const ListEmptyComponent = (
      <View style={styles.emptyState}>
        <Icon
          name='musical-notes-outline'
          size={48}
          color={theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.emptyStateText,
            { color: theme.colors.textSecondary },
          ]}>
          {t('queue.empty')}
        </Text>
        <Text
          style={[
            styles.emptyStateSubtext,
            { color: theme.colors.textSecondary },
          ]}>
          {t('queue.emptySubtext')}
        </Text>
      </View>
    );

    return (
      <BottomSheetSectionList
        sections={queueSections}
        keyExtractor={(item: DisplayQueueItem) =>
          `${item.id}-${item.queueIndex}`
        }
        renderItem={renderQueueCard}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        removeClippedSubviews={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListEmptyComponent={ListEmptyComponent}
      />
    );
  }
);

const styles = StyleSheet.create({
  // Queue tab styles
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
