import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// ==========================================
// Session Store State Interface
// ==========================================

export interface SessionState {
  // Session management
  sessionTimestamp: number;

  // Persisted coarse checkpoint for session restore
  lastCheckpointPosition: number;
}

export interface SessionActions {
  // Session management actions
  updateSessionTimestamp: () => void;
  setLastCheckpointPosition: (position: number) => void;

  // Session validation
  isSessionExpired: () => boolean;
  clearExpiredSession: () => void;
}

export type SessionStore = SessionState & SessionActions;

// ==========================================
// Initial State
// ==========================================

const initialState: SessionState = {
  // Session management
  sessionTimestamp: Date.now(),

  // Persisted coarse checkpoint for restore
  lastCheckpointPosition: 0,
};

// ==========================================
// Create Store with Middleware
// ==========================================

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==========================================
        // Session Management Implementation
        // ==========================================

        updateSessionTimestamp: () => {
          set(
            { sessionTimestamp: Date.now() },
            undefined,
            'session/updateTimestamp'
          );
        },

        setLastCheckpointPosition: (position: number) => {
          set(
            { lastCheckpointPosition: Math.max(0, position) },
            undefined,
            'session/setLastCheckpointPosition'
          );
        },

        isSessionExpired: () => {
          const state = get();
          const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
          const sessionAge = Date.now() - state.sessionTimestamp;
          return sessionAge > MAX_SESSION_AGE;
        },

        clearExpiredSession: () => {
          const state = get();
          if (state.isSessionExpired()) {
            logger.info(
              ENABLE_LOGGING,
              '[SessionStore] ✨ Session expired, clearing stored state'
            );
            // Clear expired session data while keeping preferences
            set(
              {
                sessionTimestamp: Date.now(),
                lastCheckpointPosition: 0,
              },
              undefined,
              'session/clearExpired'
            );
          }
        },
      }),
      {
        name: 'session-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: state => {
          // Only persist essential session data
          const persistData = {
            sessionTimestamp: state.sessionTimestamp,
            lastCheckpointPosition: state.lastCheckpointPosition,
          };

          return persistData;
        },
        version: 1,
        migrate: (persistedState: unknown, version: number) => {
          if (version === 0) {
            logger.info(
              ENABLE_LOGGING,
              '[SessionStore] Migrating persisted state from version 0 to 1'
            );
          }
          return persistedState;
        },
        // Add session expiry check on rehydration
        onRehydrateStorage: () => state => {
          if (state && state.sessionTimestamp) {
            const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
            const sessionAge = Date.now() - state.sessionTimestamp;

            if (sessionAge > MAX_SESSION_AGE) {
              logger.info(
                ENABLE_LOGGING,
                '[SessionStore] ✨ Session expired, clearing stored state'
              );
              // Clear expired session data while keeping preferences
              state.lastCheckpointPosition = 0;
            } else {
              logger.info(
                ENABLE_LOGGING,
                `[SessionStore] ✅ Session restored (${Math.round(sessionAge / 1000 / 60)} minutes old)`,
                {
                  lastCheckpointPosition: state.lastCheckpointPosition,
                }
              );
            }
          }
        },
      }
    ),
    {
      name: 'SessionStore',
      enabled: __DEV__, // Only enable devtools in development
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

// Session state
export const useSessionState = () => {
  const sessionTimestamp = useSessionStore(state => state.sessionTimestamp);
  const lastCheckpointPosition = useSessionStore(
    state => state.lastCheckpointPosition
  );

  return {
    sessionTimestamp,
    lastCheckpointPosition,
  };
};

// Session actions
export const useSessionActions = () => {
  const updateSessionTimestamp = useSessionStore(
    state => state.updateSessionTimestamp
  );
  const setLastCheckpointPosition = useSessionStore(
    state => state.setLastCheckpointPosition
  );
  const isSessionExpired = useSessionStore(state => state.isSessionExpired);
  const clearExpiredSession = useSessionStore(
    state => state.clearExpiredSession
  );

  return {
    updateSessionTimestamp,
    setLastCheckpointPosition,
    isSessionExpired,
    clearExpiredSession,
  };
};

// ==========================================
// Store Instance Access (for services)
// ==========================================

export const getSessionStore = () => useSessionStore.getState();
export const subscribeToSessionStore = useSessionStore.subscribe;
