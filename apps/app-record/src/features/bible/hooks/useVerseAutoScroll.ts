import React, { useEffect } from 'react';
import type { ScrollView } from 'react-native';

export const useVerseAutoScroll = (
  scrollRef: React.RefObject<ScrollView | null>,
  verseIdForScroll: string | null,
  versesLength: number,
  verseOffsets: React.MutableRefObject<Record<string, number>>
) => {
  useEffect(() => {
    if (!verseIdForScroll) return;
    if (!versesLength) return;

    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      attempts += 1;
      const offset = verseOffsets.current[verseIdForScroll];
      if (typeof offset === 'number') {
        scrollRef.current?.scrollTo({ y: Math.max(offset, 0), animated: true });
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [scrollRef, verseIdForScroll, versesLength, verseOffsets]);
};
