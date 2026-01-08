import React from 'react';
import {
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { useHistoryStore } from '@/features/media/store/HistoryStore';

export const useTrackSlideAnimation = () => {
  const direction = useHistoryStore(state => state.transitionDirection);

  return React.useMemo(() => {
    if (direction === 'backward') {
      return {
        entering: SlideInLeft.duration(200),
        exiting: SlideOutRight.duration(200),
      } as const;
    }
    return {
      entering: SlideInRight.duration(200),
      exiting: SlideOutLeft.duration(200),
    } as const;
  }, [direction]);
};
