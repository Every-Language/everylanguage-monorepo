import type { Track } from 'react-native-track-player';

/**
 * Core media file information from database with download state
 */
export interface MediaFileWithDownload {
  // From media_files table
  id: string;
  chapterId: string;
  audioVersionId: string;
  languageEntityId: string;
  mediaType: string;
  fileSize: number;
  durationSeconds: number;
  uploadStatus: string;
  publishStatus: string;
  checkStatus: string;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  deletedAt?: string;
  isBibleAudio: boolean;
  startVerseId: string;
  endVerseId: string;
  objectKey: string;
  storageProvider: string;
  originalFilename: string;
  fileType: string;

  // From media_files_downloads table (local-only)
  localFilePath?: string;
  downloadStatus: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number; // 0.0 - 1.0
  downloadedBytes: number;
  fileSizeBytes: number;
  errorMessage?: string;
  priority: number;
  retryCount: number;
  lastAttemptAt?: string;
  downloadedAt?: string;
}

/**
 * Verse timing information from media_files_verses table
 */
export interface VerseWithTiming {
  id: string;
  mediaFileId: string;
  verseId: string;
  verseNumber: number; // Denormalized for convenience
  startTimeSeconds: number;
  durationSeconds: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  denormalizedAudioVersionId: string;

  // Computed fields for multi-file chapters
  absoluteStartTime: number; // Start time across all files in chapter
  absoluteEndTime: number; // End time across all files in chapter
}

/**
 * Verse text information for display
 */
export interface VerseText {
  id: string;
  verseId: string;
  textVersionId: string;
  verseText: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  deletedAt?: string;
  version: number;
  publishStatus: string;
}

/**
 * Complete chapter media information
 */
export interface ChapterMedia {
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  // Global order of the book in the canon (1-66)
  bookGlobalOrder?: number;

  // Media files for this chapter (ordered by start verse)
  mediaFiles: MediaFileWithDownload[];

  // All verses in this chapter with their timing information
  verses: VerseWithTiming[];

  // Computed totals
  totalDuration: number; // Total duration across all files
  totalFileSize: number; // Total file size across all files
  hasDownloadedFiles: boolean; // At least one file is downloaded
  hasStreamingAvailable: boolean; // At least one file can be streamed

  // Audio version context
  audioVersionId?: string | undefined;
  textVersionId?: string | undefined;
}

/**
 * RNTP-compatible track with our specific extensions
 */
export interface BibleTrack extends Track {
  // Required RNTP fields (Track interface)
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;

  // Our specific extensions
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  // Global order of the book in the canon (1-66)
  bookGlobalOrder?: number;
  audioVersionId?: string | undefined;
  textVersionId?: string | undefined;

  // Verse timing for seeking and highlighting
  verses: VerseWithTiming[];

  // Multi-file support
  mediaFiles: MediaFileWithDownload[];
  isMultiFile: boolean;

  // Metadata for UI
  subtitle: string; // e.g., "Chapter 1 • 31 verses"
  description?: string;

  // Verse range specific properties (for playlist items)
  verseRangeStartTime?: number;
  verseRangeEndTime?: number;
  isVerseRange?: boolean;
}

/**
 * Current verse information for highlighting
 */
export interface CurrentVerseInfo {
  verseId: string;
  verseNumber: number;
  chapterId: string;
  startTime: number;
  endTime: number;
  progress: number; // 0.0 - 1.0 progress through this verse
}

/**
 * Playback state specific to Bible audio
 */
export interface BiblePlaybackState {
  // Current track context
  currentChapterId?: string | undefined;
  currentVerse?: CurrentVerseInfo | undefined;

  // Basic playback state
  isPlaying: boolean;
  position: number;
  duration: number;
  bufferedPosition: number;

  // Verse highlighting
  highlightedVerses: string[]; // Array of verse IDs currently being played
  verseProgress: Record<string, number>; // verseId -> progress (0.0 - 1.0)

  // Multi-file handling
  currentFileIndex: number; // Which file in the chapter is playing
  fileTransitionInProgress: boolean;

  // Error states specific to our app
  streamingError?: string;
  downloadError?: string;
}

/**
 * Options for resolving chapter media
 */
export interface ChapterMediaOptions {
  audioVersionId?: string;
  preferOffline?: boolean; // Prefer local files over streaming
  includeVerseText?: boolean; // Include verse text for display
  textVersionId?: string; // For verse text
}

/**
 * Result from streaming URL resolution
 */
export interface StreamingUrlResult {
  url: string;
  mediaFileId: string;
  expiresAt?: Date;
  isLocal: boolean; // true if this is a local file path
}

/**
 * Progress tracking for multi-file chapters
 */
export interface ChapterProgress {
  chapterId: string;
  absolutePosition: number; // Position across all files in chapter
  absoluteDuration: number; // Total duration across all files
  currentFileIndex: number;
  currentFilePosition: number;
  bufferedPosition: number; // How much is buffered
}

/**
 * Queue item for future queue implementation
 */
export interface BibleQueueItem {
  id: string;
  chapterId: string;
  track: BibleTrack;
  addedAt: Date;
  fromVerseId?: string; // If playing from a specific verse
}

/**
 * Playback session for analytics
 */
export interface PlaybackSession {
  id: string;
  chapterId: string;
  audioVersionId?: string;
  startedAt: Date;
  endedAt?: Date;
  totalDuration: number;
  actualListenTime: number;
  completionPercentage: number;
  versesPlayed: string[]; // Array of verse IDs that were played
}

/**
 * Error types for better error handling
 */
export type BibleAudioError =
  | 'network_error'
  | 'file_not_found'
  | 'decode_error'
  | 'permission_denied'
  | 'stream_unavailable'
  | 'chapter_not_found'
  | 'audio_version_not_selected'
  | 'multiple_files_error'
  | 'verse_timing_error'
  | 'unknown_error';

/**
 * Error details for debugging
 */
export interface BibleAudioErrorDetails {
  type: BibleAudioError;
  message: string;
  chapterId?: string | undefined;
  mediaFileId?: string | undefined;
  verseId?: string | undefined;
  originalError?: unknown;
  timestamp: Date;
}

/**
 * Event listener types for MediaPlayerService
 */
export type PlaybackStateListener = (state: BiblePlaybackState) => void;
export type ProgressListener = (position: number, duration: number) => void;
export type VerseChangeListener = (
  verseId: string | null,
  verse: VerseWithTiming | null
) => void;
export type ErrorListener = (error: Error) => void;
