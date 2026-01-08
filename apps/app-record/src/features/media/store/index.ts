// ==========================================
// New Focused Stores (Single Responsibility)
// ==========================================

// Core playback store - only handles playback state and controls
export {
  usePlaybackStore,
  useCurrentTrack,
  usePlaybackState,
  useProgress,
  useError,
  usePlaybackRate,
  usePlaybackActions,
  getPlaybackStore,
  subscribeToPlaybackStore,
  type PlaybackState,
  type PlaybackActions,
  type PlaybackStore,
} from './PlaybackStore';

// UI state store - only handles media player UI state
export {
  useMediaPlayerUIStore,
  useMediaPlayerExpanded,
  useMediaPlayerUIActions,
  getMediaPlayerUIStore,
  subscribeToMediaPlayerUIStore,
  type MediaPlayerUIState,
  type MediaPlayerUIActions,
  type MediaPlayerUIStore,
} from './MediaPlayerUIStore';

// Session management store - only handles session state and persistence
export {
  useSessionStore,
  useSessionState,
  useSessionActions,
  getSessionStore,
  subscribeToSessionStore,
  type SessionState,
  type SessionActions,
  type SessionStore,
} from './SessionStore';

// ==========================================
// Existing Specialized Stores
// ==========================================

// Queue management store
export {
  useQueueStore,
  useQueueState,
  useQueueTracks,
  useDisplayQueue,
  useCurrentQueueTrack,
  useQueueStats,
  getQueueStore,
  subscribeToQueueStore,
  type QueueState,
  type QueueActions,
  type QueueStore,
  type TrackMetadata,
  type DisplayQueueItem,
  type QueueItemRef,
  type PlaylistItemQueueRef,
} from './QueueStore';

// History navigation store
export {
  useHistoryStore,
  useHistoryState,
  usePlayedBackStack,
  usePlayedForwardStack,
  useTransitionDirection,
  useHistoryNavigation,
  getHistoryStore,
  subscribeToHistoryStore,
  type HistoryState,
  type HistoryActions,
  type HistoryStore,
} from './HistoryStore';

// Verse data store
export {
  useVerseStore,
  useVerseState,
  useVersesByChapter,
  useCurrentVerse,
  useHighlightedVerses,
  useVerseLoading,
  useVerseError,
  getVerseStore,
  subscribeToVerseStore,
  type VerseState,
  type VerseActions,
  type VerseStore,
  type VerseRow,
  type VerseTiming,
} from './VerseStore';

// Media settings store - moved to settings feature
export { useMediaSettingsStore } from '@/features/settings';
