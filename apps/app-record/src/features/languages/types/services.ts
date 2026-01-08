import type { AudioVersion, TextVersion, SavedVersionInput } from './entities';

export interface UserVersionsServiceInterface {
  getSavedVersions(): Promise<{
    audio: AudioVersion[];
    text: TextVersion[];
  }>;
  addSavedVersion(input: SavedVersionInput): Promise<void>;
  removeSavedVersion(
    versionId: string,
    versionType: 'audio' | 'text'
  ): Promise<void>;
  isVersionSaved(
    versionId: string,
    versionType: 'audio' | 'text'
  ): Promise<boolean>;
  syncSavedVersions(): Promise<void>;
  getCurrentSelections(): Promise<{
    audio: AudioVersion | null;
    text: TextVersion | null;
  }>;
  saveCurrentSelections(
    audio: AudioVersion | null,
    text: TextVersion | null
  ): Promise<void>;
}

// Storage Types
export const STORAGE_KEYS = {
  CURRENT_AUDIO_VERSION: '@language_selection/current_audio_version',
  CURRENT_TEXT_VERSION: '@language_selection/current_text_version',
  LAST_LANGUAGE_SEARCH: '@language_selection/last_search',
  EXPANDED_NODES: '@language_selection/expanded_nodes',
  LANGUAGE_CACHE_TIMESTAMP: '@language_selection/cache_timestamp',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// For storing current selections in AsyncStorage
export interface StoredCurrentSelections {
  audioVersion: AudioVersion | null;
  textVersion: TextVersion | null;
  timestamp: string;
}
