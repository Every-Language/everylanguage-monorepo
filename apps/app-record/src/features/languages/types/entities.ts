// Core Language Entity Types

// Runtime validation utilities for enum-like fields
export const LanguageEntityLevels = {
  FAMILY: 'family',
  LANGUAGE: 'language',
  DIALECT: 'dialect',
  MOTHER_TONGUE: 'mother_tongue',
} as const;

export type LanguageEntityLevel =
  (typeof LanguageEntityLevels)[keyof typeof LanguageEntityLevels];

// Utility functions for enum validation
export const isValidLanguageEntityLevel = (
  level: string
): level is LanguageEntityLevel => {
  return Object.values(LanguageEntityLevels).includes(
    level as LanguageEntityLevel
  );
};

export const normalizeLanguageEntityLevel = (level: string): string => {
  // Keep original value if it's valid, otherwise return as-is for display
  return isValidLanguageEntityLevel(level) ? level : level;
};

export interface LanguageEntity {
  id: string;
  name: string;
  level: LanguageEntityLevel;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  children: LanguageEntity[];
  isExpanded: boolean;
  hasChildren: boolean;

  // New availability fields
  hasAvailableVersions?: boolean;
  availableVersionCounts?: {
    audio: number;
    text: number;
  };
  lastAvailabilityCheck?: string;
}

// For hierarchical display
export interface LanguageHierarchyNode extends LanguageEntity {
  depth: number;
  path: string[]; // Array of parent IDs from root to current
  children: LanguageHierarchyNode[];
}

// Version Types
export interface AudioVersion {
  id: string; // audio_version.id
  name: string; // project.name
  languageEntityId: string; // project.target_language_entity_id
  languageName: string; // resolved from language_entity
  mediaFileCount: number; // count of associated media files
  totalDuration?: number; // sum of all media file durations
  createdAt: string;
  updatedAt: string;
}

export interface TextVersion {
  id: string; // text_version.id
  name: string; // project.name or text_version.name
  languageEntityId: string;
  languageName: string;
  source: 'project' | 'text_version'; // indicates which table this came from
  verseCount: number; // count of associated verse_texts
  createdAt: string;
  updatedAt: string;
}

// Union type for when we need to handle both
export type BibleVersion = AudioVersion | TextVersion;

// User Saved Versions
export interface UserSavedVersion {
  id: string;
  versionType: 'audio' | 'text';
  languageEntityId: string;
  languageName: string;
  versionId: string; // References AudioVersion.id or TextVersion.id
  versionName: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

// Input for adding a new saved version
export interface SavedVersionInput {
  versionType: 'audio' | 'text';
  languageEntityId: string;
  languageName: string;
  versionId: string;
  versionName: string;
}
