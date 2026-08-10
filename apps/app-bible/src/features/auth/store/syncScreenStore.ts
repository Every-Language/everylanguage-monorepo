import { create } from 'zustand';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface SyncState {
  phase:
    | 'clearing'
    | 'connecting'
    | 'syncing'
    | 'logging'
    | 'complete'
    | 'error';
  message: string;
  progress: number; // 0-1
  error?: string;
  networkStatus: 'connected' | 'disconnected' | 'checking';
  canRetry: boolean;
  canContinueOffline: boolean;
  hasVersions: boolean;
  canSkipOnboarding: boolean;
  hasUserDataFromServer?: boolean;
  hasSavedVersions: boolean;
  versionCheckRun?: boolean;
}

export interface SyncScreenState {
  syncState: SyncState;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface SyncScreenActions {
  startSync: () => void;
  updateSyncState: (updates: Partial<SyncState>) => void;
  setError: (error: string) => void;
  retrySync: () => void;
  continueOffline: () => void;
  resetRetryCount: () => void;
  completeSync: (versionInfo?: {
    hasVersions: boolean;
    canSkipOnboarding: boolean;
    hasUserDataFromServer?: boolean;
    hasSavedVersions?: boolean;
    versionCheckRun?: boolean;
  }) => void;
}

export type SyncScreenStore = SyncScreenState & SyncScreenActions;

const initialSyncState: SyncState = {
  phase: 'clearing',
  message: 'Starting fresh...',
  progress: 0,
  networkStatus: 'checking',
  canRetry: false,
  canContinueOffline: false,
  hasVersions: false,
  canSkipOnboarding: false,
  hasUserDataFromServer: false,
  hasSavedVersions: false,
  versionCheckRun: false,
};

export const useSyncScreenStore = create<SyncScreenStore>()((set, get) => ({
  // Initial state
  syncState: initialSyncState,
  isRetrying: false,
  retryCount: 0,
  maxRetries: 3,

  // Actions
  startSync: () => {
    logger.info(ENABLE_LOGGING, 'SyncScreenStore: Starting sync process');
    set({
      syncState: {
        ...initialSyncState,
        phase: 'clearing',
        message: 'Starting fresh...',
        progress: 0.1,
      },
      isRetrying: false,
    });
  },

  updateSyncState: updates => {
    const currentState = get().syncState;
    const newState = { ...currentState, ...updates };

    logger.info(ENABLE_LOGGING, 'SyncScreenStore: Updating sync state:', {
      phase: newState.phase,
      progress: newState.progress,
      message: newState.message,
    });

    set({ syncState: newState });
  },

  setError: error => {
    const { retryCount, maxRetries } = get();
    logger.error(ENABLE_LOGGING, 'SyncScreenStore: Setting error:', error);

    set({
      syncState: {
        ...get().syncState,
        phase: 'error',
        error,
        canRetry: retryCount < maxRetries,
        canContinueOffline: true,
      },
    });
  },

  retrySync: () => {
    const { retryCount, maxRetries } = get();

    if (retryCount < maxRetries) {
      logger.info(
        ENABLE_LOGGING,
        `SyncScreenStore: Retrying sync (attempt ${retryCount + 1}/${maxRetries})`
      );

      set({
        isRetrying: true,
        retryCount: retryCount + 1,
        syncState: {
          phase: 'clearing',
          message: 'Retrying...',
          progress: 0,
          networkStatus: 'checking',
          canRetry: false,
          canContinueOffline: false,
          hasVersions: false,
          canSkipOnboarding: false,
          hasUserDataFromServer: false,
          hasSavedVersions: false,
          versionCheckRun: false,
        },
      });
    } else {
      logger.warn(ENABLE_LOGGING, 'SyncScreenStore: Max retries exceeded');
    }
  },

  continueOffline: () => {
    logger.info(ENABLE_LOGGING, 'SyncScreenStore: Continuing offline');

    set({
      syncState: {
        phase: 'complete',
        message: 'Continuing offline...',
        progress: 1,
        networkStatus: 'disconnected',
        canRetry: false,
        canContinueOffline: false,
        hasVersions: false,
        canSkipOnboarding: false,
        hasUserDataFromServer: false,
        hasSavedVersions: false,
        versionCheckRun: false,
      },
    });
  },

  resetRetryCount: () => {
    logger.info(ENABLE_LOGGING, 'SyncScreenStore: Resetting retry count');
    set({ retryCount: 0 });
  },

  completeSync: (versionInfo?: {
    hasVersions: boolean;
    canSkipOnboarding: boolean;
    hasUserDataFromServer?: boolean;
    hasSavedVersions?: boolean;
    versionCheckRun?: boolean;
  }) => {
    logger.info(ENABLE_LOGGING, 'SyncScreenStore: Sync completed successfully');

    set({
      syncState: {
        phase: 'complete',
        message: 'Welcome back!',
        progress: 1,
        networkStatus: 'connected',
        canRetry: false,
        canContinueOffline: false,
        hasVersions: versionInfo?.hasVersions || false,
        canSkipOnboarding: versionInfo?.canSkipOnboarding || false,
        hasUserDataFromServer: versionInfo?.hasUserDataFromServer ?? false,
        hasSavedVersions: versionInfo?.hasSavedVersions ?? false,
        versionCheckRun: versionInfo?.versionCheckRun ?? false,
      },
    });
  },
}));
