import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useCurrentTrack, usePlaybackState } from '../../store/PlaybackStore';
import { usePlaybackActions } from '../../store/PlaybackStore';
import { useQueueStore, useDisplayQueue } from '../../store/QueueStore';
import { useVersesByChapter, useVerseStore } from '../../store/VerseStore';
import { logger } from '@/shared/utils/logger';
import { TabBar } from './TabBar';
import { VerseList } from './VerseList';
import { QueueList } from './QueueList';
import type { DisplayQueueItem } from '../../store/QueueStore';
import type { VerseRow } from '../../services/VerseDataService';

// Logging configuration for this module
const ENABLE_LOGGING = true;

type TabKey = 'text' | 'queue';

export const TextAndQueueTabs: React.FC = () => {
  // ==========================================
  // HOOKS & STATE
  // ==========================================
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlaybackState();
  const { play } = usePlaybackActions();
  const playTrackFromQueue = useQueueStore(state => state.playTrackFromQueue);
  const removeFromManualQueue = useQueueStore(
    state => state.removeFromManualQueue
  );
  const clearManualQueue = useQueueStore(state => state.clearManualQueue);
  const { seekToVerse } = useVerseStore();

  const { verses, verseTimings } = useVersesByChapter(currentTrack?.chapterId);
  const displayQueue = useDisplayQueue() as unknown as DisplayQueueItem[];

  const [tab, setTab] = useState<TabKey>('text');

  // Filter verses for verse range tracks (playlist items)
  const filteredVerses = useMemo(() => {
    if (!currentTrack?.isVerseRange || !currentTrack.verses) {
      return verses;
    }

    // Get verse IDs from the track's verse range
    const verseIds = currentTrack.verses.map(v => v.verseId).filter(Boolean);

    // Filter verses to only include those in the range
    return verses.filter(verse => verseIds.includes(verse.id));
  }, [verses, currentTrack?.isVerseRange, currentTrack?.verses]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const handleTabChange = useCallback((newTab: TabKey) => {
    setTab(newTab);
  }, []);

  const handleVersePress = useCallback(
    async (verse: VerseRow) => {
      try {
        await seekToVerse(verse.id);
        if (!isPlaying) {
          await play();
        }
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          '[TextAndQueueTabs] Error playing verse:',
          error
        );
      }
    },
    [seekToVerse, isPlaying, play]
  );

  const handlePlayTrack = useCallback(
    async (track: DisplayQueueItem) => {
      try {
        logger.info(
          ENABLE_LOGGING,
          `[TextAndQueueTabs] 🎵 Play from queue tap`,
          {
            title: track.title,
            queueIndex: track.queueIndex,
            isLoaded: track.isLoaded,
          }
        );

        await playTrackFromQueue(track.queueIndex);
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          `[TextAndQueueTabs] ❌ Error playing track from queue:`,
          error
        );
      }
    },
    [playTrackFromQueue]
  );

  const handleRemoveFromQueue = useCallback(
    async (track: DisplayQueueItem) => {
      try {
        if (track.isManual) {
          removeFromManualQueue(track.id);
          logger.info(
            ENABLE_LOGGING,
            `[TextAndQueueTabs] ➖ Removed manual track from queue: ${track.title}`
          );
        } else {
          logger.warn(
            ENABLE_LOGGING,
            `[TextAndQueueTabs] ⚠️ Cannot remove auto-generated track: ${track.title}`
          );
        }
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          '[TextAndQueueTabs] Failed to remove track from queue:',
          error
        );
      }
    },
    [removeFromManualQueue]
  );

  const handleClearQueue = useCallback(async () => {
    try {
      clearManualQueue();
      logger.info(ENABLE_LOGGING, '[TextAndQueueTabs] 🗑️ Cleared manual queue');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[TextAndQueueTabs] Error clearing manual queue:',
        error
      );
    }
  }, [clearManualQueue]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <View style={styles.wrapper}>
      <TabBar activeTab={tab} onTabChange={handleTabChange} />
      <View style={styles.content}>
        {tab === 'text' ? (
          <VerseList
            verses={filteredVerses}
            verseTimings={verseTimings}
            onVersePress={handleVersePress}
            currentTrack={currentTrack}
          />
        ) : (
          <QueueList
            displayQueue={displayQueue}
            onPlayTrack={handlePlayTrack}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 0,
  },
});
