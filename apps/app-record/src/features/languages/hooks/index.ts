// Centralized store API (single source of truth)
export {
  useVersionsStore,
  initializeVersionsStore,
} from '../store/versionsStore';

export { useLanguageSearch } from './useLanguageSearch';
export type { UseLanguageSearchReturn } from './useLanguageSearch';
export { useVersionCompleteness } from './useVersionCompleteness';

// Legacy wrapper hooks for backward compatibility (deprecated)
import { useCallback } from 'react';
import { useVersionsStore } from '../store/versionsStore';
import type { AudioVersion, TextVersion } from '../types/entities';

// Simple wrapper hook for current versions using the centralized store
export const useCurrentVersions = () => {
  const {
    currentAudioVersion,
    currentTextVersion,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    isReady,
    error,
  } = useVersionsStore();

  const setAudioVersion = useCallback(
    (version: AudioVersion | null) => {
      void setCurrentAudioVersion(version);
    },
    [setCurrentAudioVersion]
  );

  const setTextVersion = useCallback(
    (version: TextVersion | null) => {
      void setCurrentTextVersion(version);
    },
    [setCurrentTextVersion]
  );

  return {
    currentAudioVersion,
    currentTextVersion,
    isLoading: !isReady,
    error,
    setAudioVersion,
    setTextVersion,
  };
};

// Simple wrapper hook for saved versions using the centralized store
export const useSavedVersions = () => {
  const {
    savedAudioVersions,
    savedTextVersions,
    addSavedVersion,
    removeSavedVersion,
    isVersionSaved,
    refresh,
    isReady,
    error,
  } = useVersionsStore();

  const addVersion = useCallback(
    async (version: AudioVersion | TextVersion, type: 'audio' | 'text') => {
      await addSavedVersion(version, type);
    },
    [addSavedVersion]
  );

  const removeVersion = useCallback(
    async (versionId: string, type: 'audio' | 'text') => {
      await removeSavedVersion(versionId, type);
    },
    [removeSavedVersion]
  );

  return {
    savedAudioVersions,
    savedTextVersions,
    isLoading: !isReady,
    error,
    addVersion,
    removeVersion,
    isVersionSaved,
    refresh,
  };
};

// Deprecated: useUserVersions has been replaced by useVersionsStore.
// Please migrate imports to use the store directly.
