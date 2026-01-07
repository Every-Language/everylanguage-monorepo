import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';

import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// ==========================================
// Media Player UI Store State Interface
// ==========================================

export interface MediaPlayerUIState {
  // Media player UI state
  isExpanded: boolean;
}

export interface MediaPlayerUIActions {
  // Media player UI actions
  setExpanded: (expanded: boolean) => void;
}

export type MediaPlayerUIStore = MediaPlayerUIState & MediaPlayerUIActions;

// ==========================================
// Initial State
// ==========================================

const initialState: MediaPlayerUIState = {
  // Media player UI state
  isExpanded: false,
};

// ==========================================
// Create Store with Middleware
// ==========================================

export const useMediaPlayerUIStore = create<MediaPlayerUIStore>()(
  devtools(
    set => ({
      ...initialState,

      // ==========================================
      // Media Player UI Actions Implementation
      // ==========================================

      setExpanded: (expanded: boolean) => {
        set({ isExpanded: expanded }, undefined, 'mediaPlayerUI/setExpanded');
        logger.debug(
          ENABLE_LOGGING,
          '[MediaPlayerUIStore] Set expanded:',
          expanded
        );
      },
    }),
    {
      name: 'MediaPlayerUIStore',
      enabled: __DEV__, // Only enable devtools in development
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

// Media player UI state
export const useMediaPlayerExpanded = () =>
  useMediaPlayerUIStore(state => state.isExpanded);

// Media player UI actions
export const useMediaPlayerUIActions = () => {
  const setExpanded = useMediaPlayerUIStore(state => state.setExpanded);

  return {
    setExpanded,
  };
};

// ==========================================
// Store Instance Access (for services)
// ==========================================

export const getMediaPlayerUIStore = () => useMediaPlayerUIStore.getState();
export const subscribeToMediaPlayerUIStore = useMediaPlayerUIStore.subscribe;
