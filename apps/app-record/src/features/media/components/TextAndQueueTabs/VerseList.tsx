import React, { useMemo } from 'react';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useCurrentTrack } from '../../store/PlaybackStore';
import { useProgress as useTrackProgress } from 'react-native-track-player';
import { VerseItem } from './VerseItem';
import type { VerseRow, VerseTiming } from '../../services/VerseDataService';
import type { BibleTrack } from '../../types/track-player';

interface VerseListProps {
  verses: VerseRow[];
  verseTimings: VerseTiming[];
  onVersePress: (verse: VerseRow) => Promise<void>;
  currentTrack?: BibleTrack | null;
}

export const VerseList: React.FC<VerseListProps> = React.memo(
  function VerseList({
    verses,
    verseTimings,
    onVersePress,
    currentTrack: currentTrackProp,
  }) {
    const currentTrackFromHook = useCurrentTrack();
    // Use prop if provided, fallback to hook
    const currentTrack = currentTrackProp ?? currentTrackFromHook;
    const { position } = useTrackProgress();

    // Precompute O(1) lookup maps for verse timings and absolute verse timings on track
    const verseTimingById = useMemo(() => {
      const map = new Map<string, VerseTiming>();
      for (let i = 0; i < verseTimings.length; i++) {
        const t = verseTimings[i];
        if (t && typeof t.verse_id === 'string') map.set(t.verse_id, t);
      }
      return map;
    }, [verseTimings]);

    const absoluteTimingById = useMemo(() => {
      const map = new Map<
        string,
        { absoluteStartTime: number; durationSeconds: number }
      >();
      const verses = currentTrack?.verses ?? [];
      for (let i = 0; i < verses.length; i++) {
        const v = verses[i];
        if (
          v &&
          typeof v.verseId === 'string' &&
          typeof v.absoluteStartTime === 'number' &&
          typeof v.durationSeconds === 'number'
        ) {
          map.set(v.verseId, {
            absoluteStartTime: v.absoluteStartTime,
            durationSeconds: v.durationSeconds,
          });
        }
      }
      return map;
    }, [currentTrack?.verses]);

    const renderVerseItem = ({ item }: { item: VerseRow }) => {
      // O(1) lookup via maps
      const timing = verseTimingById.get(item.id);
      const fallbackTiming = absoluteTimingById.get(item.id);
      const start = timing?.start ?? fallbackTiming?.absoluteStartTime ?? null;
      const end =
        timing?.end ??
        (fallbackTiming
          ? fallbackTiming.absoluteStartTime + fallbackTiming.durationSeconds
          : null);
      const isActive =
        start !== null && end !== null
          ? position >= start && position < end
          : false;

      return (
        <VerseItem
          verse={item}
          isActive={isActive}
          chapterId={currentTrack?.chapterId ?? ''}
          onPress={() => onVersePress(item)}
          currentTrack={currentTrack}
        />
      );
    };

    return (
      <BottomSheetFlatList
        data={verses}
        // Use verse number to keep row identity stable across chapters
        keyExtractor={(item: VerseRow) => String(item.number)}
        removeClippedSubviews={false}
        renderItem={renderVerseItem}
      />
    );
  }
);
