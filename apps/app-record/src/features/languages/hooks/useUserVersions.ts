import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../shared/utils/logger';
import { AudioVersion, TextVersion } from '../types/entities';
// userVersionsService is accessed inside the store; not needed directly here
import { useVersionsStore } from '../store/versionsStore';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface UseUserVersionsReturn {
  // State
  savedAudioVersions: AudioVersion[];
  savedTextVersions: TextVersion[];
  currentAudioVersion: AudioVersion | null;
  currentTextVersion: TextVersion | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  addSavedVersion: (
    version: AudioVersion | TextVersion,
    type: 'audio' | 'text'
  ) => Promise<void>;
  removeSavedVersion: (
    versionId: string,
    type: 'audio' | 'text'
  ) => Promise<void>;
  setCurrentAudioVersion: (version: AudioVersion | null) => Promise<void>;
  setCurrentTextVersion: (version: TextVersion | null) => Promise<void>;
  isVersionSaved: (versionId: string, type: 'audio' | 'text') => boolean;
  refreshVersions: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user saved versions and current selections with PowerSync real-time updates
 */
export const useUserVersions = (_options?: {
  realtime?: boolean;
}): UseUserVersionsReturn => {
  const {
    savedAudioVersions,
    savedTextVersions,
    currentAudioVersion,
    currentTextVersion,
    isReady,
    error: storeError,
    addSavedVersion: addSavedVersionInStore,
    removeSavedVersion: removeSavedVersionInStore,
    isVersionSaved: isVersionSavedInStore,
    refresh: refreshStore,
    setCurrentAudioVersion: setCurrentAudioVersionInStore,
    setCurrentTextVersion: setCurrentTextVersionInStore,
    clearError: clearErrorInStore,
  } = useVersionsStore();

  const [isLoading, setIsLoading] = useState(!isReady);
  const [error, setError] = useState<string | null>(storeError);

  // Load initial data via store
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await refreshStore();
    } catch (err) {
      logger.error(ENABLE_LOGGING, 'Error loading user versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [refreshStore]);

  // Load once on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Add saved version
  const addSavedVersion = useCallback(
    async (version: AudioVersion | TextVersion, type: 'audio' | 'text') => {
      try {
        setError(null);
        await addSavedVersionInStore(version, type);
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Error adding saved version:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to add version'
        );
        throw error;
      }
    },
    [addSavedVersionInStore]
  );

  // Remove saved version
  const removeSavedVersion = useCallback(
    async (versionId: string, type: 'audio' | 'text') => {
      try {
        setError(null);
        await removeSavedVersionInStore(versionId, type);
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Error removing saved version:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to remove version'
        );
        throw error;
      }
    },
    [removeSavedVersionInStore]
  );

  // Check if version is saved (optimized for UI state)
  const isVersionSavedCheck = useCallback(
    (versionId: string, type: 'audio' | 'text'): boolean => {
      return isVersionSavedInStore(versionId, type);
    },
    [isVersionSavedInStore]
  );

  // Set current audio version
  const setCurrentAudioVersion = useCallback(
    async (version: AudioVersion | null) => {
      try {
        setError(null);

        // If the version is not saved yet, save it first
        if (version && !isVersionSavedCheck(version.id, 'audio')) {
          await addSavedVersionInStore(version, 'audio');
        }

        await setCurrentAudioVersionInStore(version);
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Error setting current audio version:',
          error
        );
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to set current audio version'
        );
        throw error;
      }
    },
    [isVersionSavedCheck, addSavedVersionInStore, setCurrentAudioVersionInStore]
  );

  // Set current text version
  const setCurrentTextVersion = useCallback(
    async (version: TextVersion | null) => {
      try {
        setError(null);

        // If the version is not saved yet, save it first
        if (version && !isVersionSavedCheck(version.id, 'text')) {
          await addSavedVersionInStore(version, 'text');
        }

        await setCurrentTextVersionInStore(version);
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Error setting current text version:',
          error
        );
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to set current text version'
        );
        throw error;
      }
    },
    [isVersionSavedCheck, addSavedVersionInStore, setCurrentTextVersionInStore]
  );

  // Refresh versions manually
  const refreshVersions = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    clearErrorInStore();
  }, [clearErrorInStore]);

  return {
    // State
    savedAudioVersions,
    savedTextVersions,
    currentAudioVersion,
    currentTextVersion,
    isLoading: isLoading || !isReady,
    error: error ?? storeError,

    // Actions
    addSavedVersion,
    removeSavedVersion,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    isVersionSaved: isVersionSavedCheck,
    refreshVersions,
    clearError,
  };
};
