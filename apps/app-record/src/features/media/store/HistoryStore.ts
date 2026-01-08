import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';

import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// ==========================================
// History Store State Interface
// ==========================================

export interface HistoryState {
  // In-memory navigation history stacks (not persisted)
  playedBackStack: string[]; // older → newer (top at end)
  playedForwardStack: string[]; // newer → older (top at end)

  // UI transition direction for track change animations (non-persisted)
  transitionDirection: 'forward' | 'backward';
}

export interface HistoryActions {
  // In-memory navigation history controls
  pushToBackStack: (trackId: string) => void;
  clearForwardStack: () => void;
  goBackInHistory: () => string | null;
  goForwardInHistory: () => string | null;
  clearHistoryStacks: () => void;

  // UI transition direction controls
  setForwardTransition: () => void;
  setBackwardTransition: () => void;
}

export type HistoryStore = HistoryState & HistoryActions;

// ==========================================
// Initial State
// ==========================================

const initialHistoryState: HistoryState = {
  // History stacks
  playedBackStack: [],
  playedForwardStack: [],

  // Default to forward animations
  transitionDirection: 'forward',
};

// ==========================================
// Create Store with Middleware
// ==========================================

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    (set, get) => ({
      ...initialHistoryState,

      // ==========================================
      // Navigation History Implementation
      // ==========================================

      pushToBackStack: (trackId: string) => {
        set(
          state => {
            const last =
              state.playedBackStack[state.playedBackStack.length - 1];
            if (last === trackId) return {} as Partial<HistoryState>;
            return { playedBackStack: [...state.playedBackStack, trackId] };
          },
          undefined,
          'history/pushBack'
        );
        logger.debug(
          ENABLE_LOGGING,
          `[HistoryStore] Pushed track to back stack: ${trackId}`
        );
      },

      clearForwardStack: () => {
        set({ playedForwardStack: [] }, undefined, 'history/clearForward');
        logger.debug(ENABLE_LOGGING, '[HistoryStore] Cleared forward stack');
      },

      goBackInHistory: () => {
        const state = get();
        const hasBack = state.playedBackStack.length > 0;

        // We need to get the current track from the media store
        // This is a cross-store dependency that we'll handle via services
        if (!hasBack) return null;

        // Skip any duplicates equal to currentId (handled by service)
        let idx = state.playedBackStack.length - 1;
        while (idx >= 0 && state.playedBackStack[idx] === 'current') idx--;
        if (idx < 0) return null;

        const nextId = state.playedBackStack[idx] ?? null;
        set(
          s => ({
            playedBackStack: s.playedBackStack.slice(0, idx),
            playedForwardStack: [...s.playedForwardStack, 'current'], // Will be replaced by service
          }),
          undefined,
          'history/goBack'
        );

        logger.debug(
          ENABLE_LOGGING,
          `[HistoryStore] Going back in history to: ${nextId}`
        );
        return nextId;
      },

      goForwardInHistory: () => {
        const state = get();
        const hasForward = state.playedForwardStack.length > 0;

        if (!hasForward) return null;

        const nextId =
          state.playedForwardStack[state.playedForwardStack.length - 1] ?? null;
        if (!nextId) return null;

        set(
          s => ({
            playedForwardStack: s.playedForwardStack.slice(0, -1),
            playedBackStack: [...s.playedBackStack, 'current'], // Will be replaced by service
          }),
          undefined,
          'history/goForward'
        );

        logger.debug(
          ENABLE_LOGGING,
          `[HistoryStore] Going forward in history to: ${nextId}`
        );
        return nextId;
      },

      clearHistoryStacks: () => {
        set(
          {
            playedBackStack: [],
            playedForwardStack: [],
          },
          undefined,
          'history/clearAll'
        );
        logger.info(
          ENABLE_LOGGING,
          '[HistoryStore] Cleared all history stacks'
        );
      },

      // ==========================================
      // Transition Direction Implementation
      // ==========================================

      setForwardTransition: () => {
        set(
          { transitionDirection: 'forward' },
          undefined,
          'history/transition/forward'
        );
      },

      setBackwardTransition: () => {
        set(
          { transitionDirection: 'backward' },
          undefined,
          'history/transition/backward'
        );
      },
    }),
    {
      name: 'HistoryStore',
      enabled: __DEV__, // Only enable devtools in development
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

// History state
export const useHistoryState = () => {
  const playedBackStack = useHistoryStore(state => state.playedBackStack);
  const playedForwardStack = useHistoryStore(state => state.playedForwardStack);
  const transitionDirection = useHistoryStore(
    state => state.transitionDirection
  );

  return {
    playedBackStack,
    playedForwardStack,
    transitionDirection,
    canGoBack: playedBackStack.length > 0,
    canGoForward: playedForwardStack.length > 0,
  };
};

// Individual history selectors
export const usePlayedBackStack = () => {
  return useHistoryStore(state => state.playedBackStack);
};

export const usePlayedForwardStack = () => {
  return useHistoryStore(state => state.playedForwardStack);
};

export const useTransitionDirection = () => {
  return useHistoryStore(state => state.transitionDirection);
};

// History navigation capabilities
export const useHistoryNavigation = () => {
  const playedBackStack = useHistoryStore(state => state.playedBackStack);
  const playedForwardStack = useHistoryStore(state => state.playedForwardStack);

  return {
    canGoBack: playedBackStack.length > 0,
    canGoForward: playedForwardStack.length > 0,
  };
};

// ==========================================
// Store Instance Access (for services)
// ==========================================

export const getHistoryStore = () => useHistoryStore.getState();
export const subscribeToHistoryStore = useHistoryStore.subscribe;
