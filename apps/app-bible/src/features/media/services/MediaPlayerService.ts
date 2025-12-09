import TrackPlayer, {
  RepeatMode,
  Event,
  State,
} from 'react-native-track-player';
import { AppState } from 'react-native';
import { getPlaybackStore } from '../store/PlaybackStore';
import { getSessionStore } from '../store/SessionStore';
import { getQueueStore, type QueueItemRef } from '../store/QueueStore';
import { getVerseStore } from '../store/VerseStore';
import { getHistoryStore } from '../store/HistoryStore';
import { QueueManager } from './QueueManager';
import { trackPlayerService } from './TrackPlayerService';
import { progressTrackingService } from './ProgressTrackingService';
import { streamingService } from './StreamingService';
import { PerformanceMonitor } from './PerformanceMonitor';
import { verseDataService } from './VerseDataService';
import { sessionService } from './SessionService';
import { logger } from '@/shared/utils/logger';
import { queueOrchestrator } from './QueueOrchestrator';
import { queueWatcher } from './QueueWatcher';
import { playlistQueueService } from '@/features/playlists/services/PlaylistQueueService';
import type { VerseTiming as VerseTimingType } from './VerseDataService';
import type { VerseWithTiming as GlobalVerseWithTiming } from '../types';
import type { PlaylistItemQueueRef } from '@/features/playlists/types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

import type { BibleTrack, ChapterMediaOptions } from '../types';
import type { PlaylistItem } from '@/features/playlists/types';
import {
  loadInitialCurrentTrack,
  syncCurrentTrack,
} from '../utils/trackSyncUtils';

/**
 * Refactored MediaPlayerService - now integrates with Zustand store
 * Consolidates event management and coordinates with store for state updates
 */
export class MediaPlayerService {
  private isInitialized = false;
  private performanceMonitor = PerformanceMonitor.getInstance();
  private optimizedQueueManager = QueueManager.getInstance();
  private appStateSubscription: { remove: () => void } | null = null;

  // Track change coordination (now handled by state machine)
  private lastTrackId: string | null = null;
  private finalizedSet = new Set<string>();

  /**
   * Initialize the media player service and all dependent services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info(ENABLE_LOGGING, 'MediaPlayerService already initialized');
      return;
    }

    try {
      logger.info(ENABLE_LOGGING, 'Initializing MediaPlayerService...');

      // Initialize TrackPlayer core
      await trackPlayerService.initialize();

      // Set up TrackPlayer event listeners (integrated from EventManagementService)
      this.setupEventListeners();

      // Load initial current track
      const playbackStore = getPlaybackStore();
      await loadInitialCurrentTrack(playbackStore.setCurrentTrack);

      // Initialize VerseDataService for automatic verse loading
      // Note: VerseDataService sets up store subscriptions in constructor
      verseDataService.loadVerseDataForCurrentTrack().catch(error => {
        logger.warn(
          ENABLE_LOGGING,
          'Initial verse data loading failed (non-fatal):',
          error
        );
      });

      // Configure initial settings
      try {
        await Promise.race([
          TrackPlayer.setRepeatMode(RepeatMode.Off),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RepeatMode timeout')), 5000)
          ),
        ]);
      } catch (error) {
        logger.warn(
          ENABLE_LOGGING,
          'RepeatMode configuration failed (non-fatal):',
          error
        );
      }

      // Always open paused on app launch
      try {
        await TrackPlayer.pause();
      } catch (e) {
        logger.debug(ENABLE_LOGGING, 'Pause on init ignored:', e);
      }

      // AppState: flush progress when backgrounding + sync track when foregrounding
      this.appStateSubscription = AppState.addEventListener(
        'change',
        async state => {
          if (state === 'background' || state === 'inactive') {
            progressTrackingService
              .flushProgress()
              .then(async () => {
                try {
                  const { position } = await TrackPlayer.getProgress();
                  getSessionStore().setLastCheckpointPosition(position);
                } catch (e) {
                  logger.debug(
                    ENABLE_LOGGING,
                    '[MediaPlayerService] Checkpoint update ignored',
                    e
                  );
                }
              })
              .catch(e => {
                logger.debug(
                  ENABLE_LOGGING,
                  '[MediaPlayerService] flushProgress checkpoint ignore',
                  e
                );
              });
          } else if (state === 'active') {
            // Sync current track when app comes to foreground
            try {
              await syncCurrentTrack(
                playbackStore.setCurrentTrack,
                playbackStore.currentTrack
              );
            } catch (e) {
              logger.debug(
                ENABLE_LOGGING,
                '[MediaPlayerService] App state sync ignored',
                e
              );
            }
          }
        }
      );

      // Attempt session restore shortly after hydration
      setTimeout(() => {
        sessionService.restoreSession().catch((error: Error) => {
          logger.warn(
            ENABLE_LOGGING,
            '[MediaPlayerService] Session restore failed (non-fatal):',
            error
          );
        });
      }, 300);

      // Apply saved playback rate
      try {
        const rate = getPlaybackStore().playbackRate ?? 1;
        await TrackPlayer.setRate(rate as number);
        logger.debug(
          ENABLE_LOGGING,
          '[MediaPlayerService] Applying playback rate on init:',
          rate
        );
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          '[MediaPlayerService] Failed to apply playback rate on init:',
          e
        );
      }

      // Start queue watcher for incremental loading
      await queueWatcher.startWatching();

      this.isInitialized = true;
      logger.info(
        ENABLE_LOGGING,
        'MediaPlayerService initialized successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to initialize MediaPlayerService:',
        error
      );
      throw error;
    }
  }

  /**
   * Set up TrackPlayer event listeners (consolidated from EventManagementService)
   */
  private setupEventListeners(): void {
    const playbackStore = getPlaybackStore();

    // Playback state changes
    TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
      const isPlaying = state === State.Playing;
      const isLoading = state === State.Loading || state === State.Buffering;
      const isPaused = state === State.Paused;

      playbackStore.setPlaybackState({ isPlaying, isLoading, isPaused });

      // Start/stop progress tracking based on playback state
      if (isPlaying) {
        progressTrackingService.startProgressSaving();

        // Trigger auto-open expansion when audio starts playing
        this.triggerAutoOpenOnPlaybackStart();
      } else {
        progressTrackingService.stopProgressSaving();
      }
    });

    // Progress updates (throttled for performance)
    let lastProgressEmit = 0;
    const PROGRESS_THROTTLE = 500; // 500ms throttle for performance

    TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      ({ position, buffered, duration }) => {
        const now = Date.now();

        // Check if we need to stop playback at verse range end
        this.checkVerseRangeEnd(position);

        // Throttle progress emissions for better performance
        if (now - lastProgressEmit >= PROGRESS_THROTTLE) {
          // RNTP may report duration=0 for streams; fallback to track.duration when available
          const trackDuration =
            (playbackStore.currentTrack?.duration as number) || 0;
          const effectiveDuration =
            duration && duration > 0 ? duration : trackDuration;
          playbackStore.updateProgress({
            position,
            duration: effectiveDuration,
            bufferedPosition: buffered,
          });
          lastProgressEmit = now;
        }
      }
    );

    // Track changes using QueueWatcher for simplified coordination
    TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async ({ track }) => {
        try {
          const newTrackId = (track as BibleTrack)?.id || null;
          const prevTrackId = this.lastTrackId;
          this.lastTrackId = newTrackId;

          logger.debug(
            ENABLE_LOGGING,
            '[MediaPlayerService] Track change event received',
            { newTrackId, prevTrackId, trackTitle: track?.title }
          );

          await queueWatcher.handleTrackChange(newTrackId, prevTrackId);
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            '❌ Track change event processing failed:',
            error
          );
        }
      }
    );

    // Remove duplicate track-changed finalization listener (now handled in ActiveTrackChanged)

    // Playback errors
    TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
      const error = {
        type: 'decode_error' as const,
        message: `Playback error: ${code} - ${message}`,
        timestamp: new Date(),
      };

      playbackStore.setError(error);
      logger.error(ENABLE_LOGGING, 'Playback error:', error);
    });

    // Remote control events (for background playback)
    TrackPlayer.addEventListener(Event.RemotePause, () => {
      logger.info(ENABLE_LOGGING, 'Remote pause event received');
      TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      logger.info(ENABLE_LOGGING, 'Remote play event received');
      TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      logger.info(ENABLE_LOGGING, 'Remote next event received');
      TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      logger.info(ENABLE_LOGGING, 'Remote previous event received');
      TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
      logger.info(ENABLE_LOGGING, 'Remote stop event received');
      TrackPlayer.pause();
      TrackPlayer.seekTo(0);
    });

    // Queue ended
    TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async ({ track, position }) => {
        const lastId = this.lastTrackId;
        if (lastId && !this.finalizedSet.has(lastId)) {
          const duration =
            (track as unknown as BibleTrack | undefined)?.duration ?? 0;
          progressTrackingService
            .saveFinalProgress(lastId, position ?? 0, duration, true)
            .catch(() => {});
          this.finalizedSet.add(lastId);
        }

        // Check if we've actually reached the end of the playlist
        try {
          const { getQueueStore } = await import('../store/QueueStore');
          const store = getQueueStore();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          // If we're at the end and there are no more tracks in metadataQueue, pause playback
          if (currentIndex !== null && currentIndex !== undefined) {
            const hasMoreTracks =
              store.metadataQueue[currentIndex + 1] !== undefined;

            if (!hasMoreTracks) {
              logger.info(
                ENABLE_LOGGING,
                '[MediaPlayerService] Reached end of playlist - pausing playback'
              );
              await TrackPlayer.pause();
            } else {
              logger.debug(
                ENABLE_LOGGING,
                '[MediaPlayerService] Queue ended but more tracks available - continuing'
              );
            }
          }
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            '[MediaPlayerService] Error handling queue end:',
            error
          );
        }
      }
    );

    logger.info(ENABLE_LOGGING, 'TrackPlayer event listeners set up');
  }

  /** Set playback rate and apply to RNTP */
  async setPlaybackRate(rate: 0.5 | 1 | 1.25 | 1.5 | 2): Promise<void> {
    try {
      await TrackPlayer.setRate(rate);
      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] Playback rate set:',
        rate
      );
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        '[MediaPlayerService] Failed to set playback rate:',
        e
      );
      throw e;
    }
  }

  /**
   * Play a chapter with optimized queue management for instant playback
   */
  async playChapter(
    chapterId: string,
    _options: ChapterMediaOptions = {}
  ): Promise<void> {
    const startTime = this.performanceMonitor.startTiming('playLatency');

    try {
      logger.info(
        ENABLE_LOGGING,
        `[MediaPlayerService] 🚀 Playing chapter: ${chapterId}`
      );

      // Check if track can be played immediately from current queue
      if (this.optimizedQueueManager.canPlayImmediately(chapterId)) {
        logger.info(
          ENABLE_LOGGING,
          '[MediaPlayerService] ⚡ Playing from existing queue (instant)'
        );
        await this.playFromExistingQueue(chapterId);
        return;
      }

      // Build large metadata queue for full book experience
      const queueParams = {
        startChapterId: chapterId,
        maxTracks: 200, // Support full books (Psalms = 150 chapters)
      };

      // Phase 1: Start queue building (metadata + initial window)
      const queuePromise = this.optimizedQueueManager.buildQueue(queueParams);

      // Phase 2: Check if first track becomes available quickly (non-fatal timeout)
      const quickPlayAttempt = this.waitForQuickPlay(chapterId, 4000);
      try {
        await Promise.race([queuePromise, quickPlayAttempt]);
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          '[MediaPlayerService] ⏰ Quick play timeout; falling back to full queue',
          e
        );
      }

      // If quick play succeeded or becomes ready shortly, proceed
      if (this.optimizedQueueManager.canPlayImmediately(chapterId)) {
        await TrackPlayer.play();
        logger.info(
          ENABLE_LOGGING,
          '[MediaPlayerService] ⚡ Quick play/queue ready'
        );
      } else {
        // Metadata may complete before first track is built; poll briefly
        await this.waitForQuickPlay(chapterId, 4000).catch(() => {});
        if (this.optimizedQueueManager.canPlayImmediately(chapterId)) {
          await TrackPlayer.play();
          logger.info(
            ENABLE_LOGGING,
            '[MediaPlayerService] ⚡ Quick play/queue ready (delayed)'
          );
        } else {
          logger.info(
            ENABLE_LOGGING,
            '[MediaPlayerService] ℹ️ Quick play not ready yet; will start once first track is built'
          );
        }
      }

      // Start progress tracking
      progressTrackingService.startProgressSaving();

      logger.info(ENABLE_LOGGING, `[MediaPlayerService] ✅ Chapter playing`);
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `[MediaPlayerService] ❌ Error playing chapter ${chapterId}:`,
        error
      );
      throw error;
    } finally {
      this.performanceMonitor.endTiming('playLatency', startTime);
    }
  }

  /**
   * Wait for track to become available for quick play
   */
  private async waitForQuickPlay(
    chapterId: string,
    timeout: number = 1000 // Cancel quickplay if it takes longer than 1 second
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = 25; // Check every 25ms for faster response
      let elapsed = 0;

      const check = () => {
        if (this.optimizedQueueManager.canPlayImmediately(chapterId)) {
          logger.debug(
            ENABLE_LOGGING,
            `[MediaPlayerService] ⚡ Track available after ${elapsed}ms`
          );
          resolve();
          return;
        }

        elapsed += checkInterval;
        if (elapsed >= timeout) {
          logger.warn(
            ENABLE_LOGGING,
            `[MediaPlayerService] ⏰ Quick play timeout after ${elapsed}ms`
          );
          reject(new Error('Quick play timeout'));
          return;
        }

        setTimeout(check, checkInterval);
      };

      check();
    });
  }

  /**
   * Play track from existing optimized queue
   */
  private async playFromExistingQueue(chapterId: string): Promise<void> {
    const queue = await TrackPlayer.getQueue();
    const trackIndex = queue.findIndex(
      track => track['chapterId'] === chapterId
    );

    if (trackIndex === -1) {
      throw new Error(`Track ${chapterId} not found in queue`);
    }

    if (trackIndex >= queue.length) {
      throw new Error(
        `Track index ${trackIndex} is out of bounds (queue length: ${queue.length})`
      );
    }

    // Skip to track and play
    await TrackPlayer.skip(trackIndex);
    await TrackPlayer.play();

    // Queue state updates now handled automatically by event-driven system
  }

  /**
   * Play chapter starting from a specific verse
   */
  async playChapterAtVerse(
    chapterId: string,
    verseId: string,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    await this.playChapter(chapterId, options);

    // Seek to verse after a short delay to ensure track is loaded
    setTimeout(() => {
      this.seekToVerse(verseId).catch(error => {
        logger.warn(
          ENABLE_LOGGING,
          `Failed to seek to verse ${verseId}:`,
          error
        );
      });
    }, 1000);
  }

  /**
   * Seek to an absolute playback position (seconds)
   */
  async seekTo(positionSeconds: number): Promise<void> {
    try {
      const position = Math.max(0, positionSeconds);
      await TrackPlayer.seekTo(position);
      const progress = await TrackPlayer.getProgress();
      getPlaybackStore().updateProgress({
        position: progress.position,
        duration: progress.duration,
        bufferedPosition: progress.buffered,
      });
      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] Seeked to position:',
        position
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, '[MediaPlayerService] Seek error:', error);
      throw error;
    }
  }

  /**
   * Seek to a specific verse in the current track
   */
  async seekToVerse(verseId: string): Promise<void> {
    try {
      const currentTrack = getPlaybackStore().currentTrack;
      if (!currentTrack) {
        throw new Error('No active track to seek in');
      }

      // Prefer absolute timings embedded on the loaded track (covers streaming and multi-file accurately)
      const absolute = (
        currentTrack.verses as GlobalVerseWithTiming[] | undefined
      )?.find(v => v.verseId === verseId);
      if (absolute && typeof absolute.absoluteStartTime === 'number') {
        await TrackPlayer.seekTo(absolute.absoluteStartTime);
        logger.info(
          ENABLE_LOGGING,
          `Seeked to verse ${verseId} at ${absolute.absoluteStartTime}s (track absolute)`
        );
        return;
      }

      // Fallback to store timings for the current chapter
      const { timings } = getVerseStore().getVerseData(currentTrack.chapterId);
      const verseTiming = (timings as VerseTimingType[]).find(
        t => t.verse_id === verseId
      );
      if (verseTiming) {
        await TrackPlayer.seekTo(verseTiming.start);
        logger.info(
          ENABLE_LOGGING,
          `Seeked to verse ${verseId} at ${verseTiming.start}s`
        );
        return;
      }

      // No timing available

      logger.warn(
        ENABLE_LOGGING,
        `Verse timing not available for verse ${verseId}`
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, `Error seeking to verse ${verseId}:`, error);
      throw error;
    }
  }

  /**
   * Jump to next verse start if available; else +5s
   */
  async nextVerse(): Promise<void> {
    const playbackStore = getPlaybackStore();
    const currentTrack = playbackStore.currentTrack;
    if (!currentTrack) return;
    try {
      const { position, duration } = await TrackPlayer.getProgress();
      const abs =
        (currentTrack.verses as GlobalVerseWithTiming[] | undefined) || [];
      const next = abs.find(v => v.absoluteStartTime > position + 0.01);
      if (next) {
        await TrackPlayer.seekTo(next.absoluteStartTime);
      } else {
        const newPos = Math.min(duration, position + 5);
        await TrackPlayer.seekTo(newPos);
      }
    } catch {
      const { position, duration } = await TrackPlayer.getProgress();
      const newPos = Math.min(duration, position + 5);
      await TrackPlayer.seekTo(newPos);
    }
  }

  /**
   * If within first 1s of current verse → go to previous verse start
   * else → go to current verse start. If no timings, seek -5s.
   */
  async previousVerse(): Promise<void> {
    const playbackStore = getPlaybackStore();
    const currentTrack = playbackStore.currentTrack;
    if (!currentTrack) return;
    try {
      const { position } = await TrackPlayer.getProgress();
      const compact = (
        (currentTrack.verses as GlobalVerseWithTiming[] | undefined) || []
      ).map(v => ({ verseId: v.verseId, start: v.absoluteStartTime }));
      if (!compact || compact.length === 0) {
        const back = Math.max(0, position - 5);
        await TrackPlayer.seekTo(back);
        return;
      }
      // Find current verse by last start <= position
      let currentIdx = 0;
      for (let i = 0; i < compact.length; i++) {
        const t = compact[i];
        if (t && t.start <= position + 0.01) currentIdx = i;
        else break;
      }
      const currentStart = compact[currentIdx]?.start ?? 0;
      const withinFirstSecond = position - currentStart <= 1.0;
      if (withinFirstSecond && currentIdx > 0) {
        await TrackPlayer.seekTo(compact[currentIdx - 1]!.start);
      } else {
        await TrackPlayer.seekTo(currentStart);
      }
    } catch {
      const { position } = await TrackPlayer.getProgress();
      const back = Math.max(0, position - 5);
      await TrackPlayer.seekTo(back);
    }
  }

  /**
   * Add track to queue (user-initiated) - Spotify-style "Add to Queue"
   */
  async addToQueue(
    chapterId: string,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        `[MediaPlayerService] ➕ Adding chapter ${chapterId} to queue`
      );

      // Delegate to OptimizedQueueManager for Spotify-style queue management
      await this.optimizedQueueManager.addToQueue(chapterId, options);

      logger.info(
        ENABLE_LOGGING,
        `[MediaPlayerService] ✅ Successfully added chapter to queue`
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `[MediaPlayerService] ❌ Error adding chapter to queue ${chapterId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Play a playlist item (verse range) - delegated to PlaylistQueueService
   */
  async playPlaylistItem(
    playlistItem: PlaylistItem,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    // Delegate to PlaylistQueueService
    await playlistQueueService.playPlaylistItem(playlistItem, options);
  }

  /**
   * Add playlist item to queue (Spotify-style "Add to Queue") - delegated to PlaylistQueueService
   */
  async addPlaylistItemToQueue(
    playlistItem: PlaylistItem,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    // Delegate to PlaylistQueueService
    await playlistQueueService.addPlaylistItemToQueue(playlistItem, options);
  }

  /**
   * Play playlist item from existing queue without replacing the queue
   */
  private async playPlaylistItemFromQueue(
    playlistItemRef: PlaylistItemQueueRef
  ): Promise<void> {
    try {
      logger.info(
        true,
        `[MediaPlayerService] 🎵 Playing playlist item from queue: ${playlistItemRef.startVerseId} - ${playlistItemRef.endVerseId}`
      );

      // Build the expected track ID (same format as QueueOrchestrator)
      const trackId = `playlist_item_${playlistItemRef.playlistItemId}_${playlistItemRef.startVerseId}_${playlistItemRef.endVerseId}`;

      // Find the track in the current queue
      const currentQueue = await TrackPlayer.getQueue();
      const trackIndex = currentQueue.findIndex(
        track => track['id'] === trackId
      );

      if (trackIndex >= 0 && trackIndex < currentQueue.length) {
        // Track exists in queue, skip to it
        await TrackPlayer.skip(trackIndex);
        logger.info(
          true,
          `[MediaPlayerService] ✅ Skipped to existing track at index ${trackIndex}`
        );
      } else {
        // Track not in queue, need to build and add it
        const { trackBuilder } = await import('./TrackBuilder');
        const options: ChapterMediaOptions = {};
        if (playlistItemRef.audioVersionId) {
          options.audioVersionId = playlistItemRef.audioVersionId;
        }
        if (playlistItemRef.textVersionId) {
          options.textVersionId = playlistItemRef.textVersionId;
        }

        const track = await trackBuilder.buildVerseRangeTrack(
          playlistItemRef.chapterId,
          playlistItemRef.startVerseId,
          playlistItemRef.endVerseId,
          options
        );

        if (!track) {
          throw new Error(
            `Failed to build track for playlist item: ${playlistItemRef.playlistItemId}`
          );
        }

        // Add track to queue and play it
        await TrackPlayer.add(track);
        const updatedQueue = await TrackPlayer.getQueue();
        const newIndex = updatedQueue.length - 1; // New track will be at the end

        if (newIndex >= 0 && newIndex < updatedQueue.length) {
          await TrackPlayer.skip(newIndex);

          // VERSE RANGE POSITIONING: If this is a verse range track (playlist item),
          // seek to the start of the verse range after the track is loaded and playing
          if (
            track.isVerseRange &&
            typeof track.verseRangeStartTime === 'number'
          ) {
            try {
              // Add a small delay to ensure the track is fully loaded
              setTimeout(async () => {
                await TrackPlayer.seekTo(track.verseRangeStartTime!);
                logger.info(
                  ENABLE_LOGGING,
                  `[MediaPlayerService] 🎯 Seeking to verse range start after track change: ${track.verseRangeStartTime}s`
                );
              }, 100);
            } catch (error) {
              logger.warn(
                ENABLE_LOGGING,
                `[MediaPlayerService] Failed to seek to verse range start:`,
                error
              );
            }
          }

          logger.info(
            ENABLE_LOGGING,
            `[MediaPlayerService] ✅ Added and playing new track at index ${newIndex}`
          );
        } else {
          throw new Error(
            `Failed to skip to new track: index ${newIndex} is out of bounds (queue length: ${updatedQueue.length})`
          );
        }
      }
    } catch (error) {
      logger.error(
        true,
        `[MediaPlayerService] ❌ Error playing playlist item from queue:`,
        error
      );
      throw error;
    }
  }

  /**
   * Play a specific track from the queue
   */
  async playTrackFromQueue(targetIndex: number): Promise<void> {
    try {
      const queue = await TrackPlayer.getQueue();
      const queueStore = getQueueStore();
      // UI transition: treat queue taps as forward by default
      getHistoryStore().setForwardTransition();
      logger.debug(
        ENABLE_LOGGING,
        '[UI] transition set to forward (skipToNext)'
      );
      const tappedMeta = queueStore.getTrackAtIndex(targetIndex);
      const tappedId = tappedMeta
        ? `chapter_${tappedMeta.chapterId}_${tappedMeta.audioVersionId}`
        : undefined;

      // Prefer id-based mapping to actual RNTP index to avoid window shifts
      const rnIndexById = tappedId
        ? queue.findIndex(t => t['id'] === tappedId)
        : -1;

      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] 🔎 playTrackFromQueue mapping',
        {
          targetIndex,
          rnIndexById,
          tappedId,
          rnHead: queue[0]?.['id'],
          rnLen: queue.length,
        }
      );

      if (rnIndexById >= 0 && rnIndexById < queue.length) {
        await TrackPlayer.skip(rnIndexById);
        logger.info(
          ENABLE_LOGGING,
          `[MediaPlayerService] 🎯 Skipped by id at RNTP index ${rnIndexById}`
        );
        return;
      }

      // If not found, move sliding window around target and retry once
      if (tappedMeta) {
        getQueueStore().setCurrentIndex(targetIndex);
        await queueOrchestrator.ensureWindow();
        const queueAfter = await TrackPlayer.getQueue();
        const rnIndexAfter = tappedId
          ? queueAfter.findIndex(t => t['id'] === tappedId)
          : -1;
        logger.info(
          ENABLE_LOGGING,
          '[MediaPlayerService] 🔁 Remap after ensureWindow',
          {
            rnIndexAfter,
            rnHead: queueAfter[0]?.['id'],
            rnLen: queueAfter.length,
          }
        );
        if (rnIndexAfter >= 0) {
          await TrackPlayer.skip(rnIndexAfter);
          logger.info(
            ENABLE_LOGGING,
            `[MediaPlayerService] 🎯 Skipped after ensure at RNTP index ${rnIndexAfter}`
          );
          return;
        }
      }

      // Fallback: play by chapterId
      if (tappedMeta) {
        await this.playFromExistingQueue(tappedMeta.chapterId);
        return;
      }

      throw new Error('Target queue item no longer exists');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error playing track from queue:', error);
      throw error;
    }
  }

  /**
   * Skip to next track in queue
   */
  async skipToNext(): Promise<boolean> {
    const startTime = this.performanceMonitor.startTiming('trackSwitch');

    try {
      // UI transition: forward by default on next
      getHistoryStore().setForwardTransition();

      // Check for playlist items first (higher priority than manual queue)
      // TODO
      const store = getQueueStore();
      const playbackStore = getPlaybackStore();
      if (store.playlistItemQueue.length > 0) {
        logger.info(
          true,
          '[MediaPlayerService] 🎵 Found playlist items, checking for next item'
        );

        // Get the current track to determine which playlist item we're on
        const currentTrack = playbackStore.currentTrack;
        if (currentTrack?.isVerseRange) {
          logger.info(
            true,
            `[MediaPlayerService] 🔍 Current track ID: ${currentTrack.id}`
          );
          logger.info(
            true,
            `[MediaPlayerService] 🔍 Playlist items in queue: ${store.playlistItemQueue.length}`
          );

          // Get current queue index to determine which playlist item we're on
          const currentQueueIndex = await TrackPlayer.getActiveTrackIndex();
          logger.info(
            true,
            `[MediaPlayerService] 🔍 Current queue index: ${currentQueueIndex}`
          );

          // Find the current playlist item index by matching verse range pattern
          // Since the current track has verse_range format, we need to match by verse range
          const currentItemIndex = store.playlistItemQueue.findIndex(item => {
            // Extract verse range from current track ID (verse_range_gen-1-1_gen-1-12_gen-1)
            // and compare with playlist item verse range
            const verseRangePattern = `${item.startVerseId}_${item.endVerseId}`;
            const matches = currentTrack.id.includes(verseRangePattern);
            logger.info(
              true,
              `[MediaPlayerService] 🔍 Comparing: ${currentTrack.id} includes ${verseRangePattern} -> ${matches}`
            );
            return matches;
          });

          logger.info(
            true,
            `[MediaPlayerService] 🔍 Current item index: ${currentItemIndex}`
          );

          // Check if we have a next playlist item to play
          if (
            currentItemIndex >= 0 &&
            currentItemIndex < store.playlistItemQueue.length - 1
          ) {
            // Play the next playlist item
            const nextItemRef = store.playlistItemQueue[currentItemIndex + 1];
            if (nextItemRef) {
              logger.info(
                true,
                `[MediaPlayerService] ▶️ Playing next playlist item: ${nextItemRef.startVerseId} - ${nextItemRef.endVerseId}`
              );

              // Use a more direct approach: skip to the next track in the current queue
              // The QueueOrchestrator should have already built the tracks in the correct order
              const currentQueue = await TrackPlayer.getQueue();
              const currentIndex = await TrackPlayer.getActiveTrackIndex();

              logger.info(
                true,
                `[MediaPlayerService] 🔍 Current queue has ${currentQueue.length} tracks, current index: ${currentIndex}`
              );

              // Look for the next playlist item track in the queue
              const nextTrackId = `playlist_item_${nextItemRef.playlistItemId}_${nextItemRef.startVerseId}_${nextItemRef.endVerseId}`;
              const nextTrackIndex = currentQueue.findIndex(
                track => track['id'] === nextTrackId
              );

              logger.info(
                true,
                `[MediaPlayerService] 🔍 Looking for track ID: ${nextTrackId}, found at index: ${nextTrackIndex}`
              );

              if (nextTrackIndex >= 0 && nextTrackIndex < currentQueue.length) {
                await TrackPlayer.skip(nextTrackIndex);
                logger.info(
                  true,
                  `[MediaPlayerService] ✅ Skipped to next playlist track at index ${nextTrackIndex}`
                );

                // Note: Verse range positioning is now handled in the PlaybackActiveTrackChanged event
                // to ensure proper timing after the track is fully loaded

                return true;
              } else {
                // If the track is not in the current queue, we need to rebuild the queue
                // This should not happen if the QueueOrchestrator is working correctly
                logger.warn(
                  true,
                  `[MediaPlayerService] ⚠️ Next playlist track not found in queue, rebuilding...`
                );
                await queueOrchestrator.ensureWindow();

                // Try again after rebuilding
                const newQueue = await TrackPlayer.getQueue();
                const newNextTrackIndex = newQueue.findIndex(
                  track => track['id'] === nextTrackId
                );

                if (
                  newNextTrackIndex >= 0 &&
                  newNextTrackIndex < newQueue.length
                ) {
                  await TrackPlayer.skip(newNextTrackIndex);
                  logger.info(
                    true,
                    `[MediaPlayerService] ✅ Skipped to next playlist track at index ${newNextTrackIndex} after rebuild`
                  );

                  // Note: Verse range positioning is now handled in the PlaybackActiveTrackChanged event
                  // to ensure proper timing after the track is fully loaded

                  return true;
                } else {
                  // Last resort: use the original method
                  logger.warn(
                    true,
                    `[MediaPlayerService] ⚠️ Track still not found after rebuild, using fallback method`
                  );
                  await this.playPlaylistItemFromQueue(nextItemRef);
                  return true;
                }
              }
            }
          } else {
            // No more playlist items, check if we should continue with manual queue
            logger.info(
              true,
              `[MediaPlayerService] ℹ️ No more playlist items, checking manual queue`
            );
          }
        }
      }

      // Prefer manual head when present (Spotify semantics)
      const manualHead = getQueueStore().manualQueue[0];
      if (manualHead) {
        const headId = `chapter_${manualHead.chapterId}_${manualHead.audioVersionId ?? ''}`;
        let queue = await TrackPlayer.getQueue();
        let idx = queue.findIndex(t => t['id'] === headId);
        if (idx === -1) {
          await queueOrchestrator.ensureWindow();
          queue = await TrackPlayer.getQueue();
          idx = queue.findIndex(t => t['id'] === headId);
        }
        if (idx >= 0 && idx < queue.length) {
          await TrackPlayer.skip(idx);
          logger.info(
            ENABLE_LOGGING,
            '[MediaPlayerService] ⏭️ Skipped to manual head',
            {
              headId,
              idx,
            }
          );
          return true;
        }
      }

      // Fallback to RNTP next
      const queue = await TrackPlayer.getQueue();
      const currentIndex = (await TrackPlayer.getActiveTrackIndex()) ?? 0;

      logger.debug(true, '[MediaPlayerService] 🔍 RNTP fallback check', {
        currentIndex,
        queueLength: queue.length,
        hasNext: currentIndex < queue.length - 1,
      });

      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        await TrackPlayer.skipToNext();
        logger.info(
          ENABLE_LOGGING,
          '[MediaPlayerService] ⏭️ Skipped to next track'
        );
        return true;
      }

      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] ℹ️ No next track available'
      );
      return false;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[MediaPlayerService] ❌ Error skipping to next track:',
        error
      );
      return false;
    } finally {
      this.performanceMonitor.endTiming('trackSwitch', startTime);
    }
  }

  /**
   * Skip to previous track or restart current track
   */
  async skipToPrevious(currentPosition: number): Promise<boolean> {
    const startTime = this.performanceMonitor.startTiming('trackSwitch');

    try {
      // Prefer explicit back stack navigation
      const playbackStore = getPlaybackStore();
      // UI transition: explicit backward on previous
      getHistoryStore().setBackwardTransition();
      logger.debug(
        ENABLE_LOGGING,
        '[UI] transition set to backward (skipToPrevious)'
      );
      logger.debug(ENABLE_LOGGING, '[History] ⏮️ skipToPrevious called', {
        currentPosition,
        currentId: playbackStore.currentTrack?.id,
        backLen: getHistoryStore().playedBackStack.length,
        fwdLen: getHistoryStore().playedForwardStack.length,
      });

      const backId = getHistoryStore().goBackInHistory();
      logger.debug(ENABLE_LOGGING, '[History] ⏮️ goBackInHistory result', {
        backId,
      });
      if (backId) {
        queueWatcher.setHistoryNavigating(true);
        try {
          const queue = await TrackPlayer.getQueue();
          const rntpIndex = queue.findIndex(
            t => (t as BibleTrack).id === backId
          );
          if (rntpIndex >= 0 && rntpIndex < queue.length) {
            await TrackPlayer.skip(rntpIndex);
            await TrackPlayer.play();
            logger.info(
              ENABLE_LOGGING,
              '[History] ⏮️ Skipped by id within RNTP queue',
              {
                rntpIndex,
                backId,
              }
            );
            logger.debug(
              ENABLE_LOGGING,
              '[History] stacks after RNTP id skip',
              {
                backLen: getHistoryStore().playedBackStack.length,
                fwdLen: getHistoryStore().playedForwardStack.length,
              }
            );
            return true;
          }
        } catch (e) {
          logger.debug(ENABLE_LOGGING, '[History] RNTP id skip failed', e);
        }

        // Fallback: play by chapter id derived from backId
        const parts = backId.replace(/^chapter_/, '').split('_');
        const chapterId = parts[0];
        if (chapterId) {
          await this.playChapter(chapterId, {});
          logger.info(
            ENABLE_LOGGING,
            '[History] ⏮️ Played chapter from backId fallback',
            {
              chapterId,
              backId,
            }
          );
          logger.debug(
            ENABLE_LOGGING,
            '[History] stacks after playChapter fallback',
            {
              backLen: getHistoryStore().playedBackStack.length,
              fwdLen: getHistoryStore().playedForwardStack.length,
            }
          );
          return true;
        }
        logger.warn(ENABLE_LOGGING, '[History] backId malformed, no action', {
          backId,
        });
      }

      // No history: standard behavior
      if (currentPosition > 5) {
        await TrackPlayer.seekTo(0);
        logger.info(
          ENABLE_LOGGING,
          '[MediaPlayerService] ⏮️ Restarted current track (>5s, no history)'
        );
        return true;
      }

      // Fall back to RNTP previous
      const queue = await TrackPlayer.getQueue();
      const currentIndex = (await TrackPlayer.getActiveTrackIndex()) ?? 0;

      logger.debug(
        true,
        '[MediaPlayerService] 🔍 RNTP previous fallback check',
        {
          currentIndex,
          queueLength: queue.length,
          hasPrevious: currentIndex > 0,
        }
      );

      if (currentIndex > 0 && currentIndex < queue.length) {
        await TrackPlayer.skipToPrevious();
        logger.info(
          ENABLE_LOGGING,
          '[MediaPlayerService] ⏮️ Skipped to previous track using RNTP navigation'
        );
        return true;
      }

      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] ℹ️ No previous track available'
      );
      return false;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[MediaPlayerService] ❌ Error skipping to previous track:',
        error
      );
      return false;
    } finally {
      this.performanceMonitor.endTiming('trackSwitch', startTime);
    }
  }

  /**
   * Basic playback controls
   */
  async play(): Promise<void> {
    try {
      await TrackPlayer.play();
      logger.info(ENABLE_LOGGING, 'Playback started');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error starting playback:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      await TrackPlayer.pause();
      logger.info(ENABLE_LOGGING, 'Playback paused');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error pausing playback:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await TrackPlayer.stop();
      // ✅ Track change event will handle setting currentTrack to null
      logger.info(ENABLE_LOGGING, 'Playback stopped');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error stopping playback:', error);
      throw error;
    }
  }

  /**
   * Get current playback information from store
   */
  getCurrentTrack(): BibleTrack | null {
    return getPlaybackStore().currentTrack;
  }

  /**
   * Get manual queue tracks
   */
  getManualQueue(): QueueItemRef[] {
    return this.optimizedQueueManager.getManualQueue();
  }

  /**
   * Remove track from manual queue
   */
  removeFromManualQueue(trackId: string): void {
    this.optimizedQueueManager.removeFromManualQueue(trackId);
  }

  /**
   * Clear all manual queue tracks
   */
  clearManualQueue(): void {
    this.optimizedQueueManager.clearManualQueue();
  }

  /**
   * Get playlist item queue tracks - delegated to PlaylistQueueService
   */
  getPlaylistItemQueue() {
    return playlistQueueService.getPlaylistItemQueue();
  }

  /**
   * Remove playlist item from queue - delegated to PlaylistQueueService
   */
  removePlaylistItemFromQueue(playlistItemId: string): void {
    playlistQueueService.removePlaylistItemFromQueue(playlistItemId);
  }

  /**
   * Clear all playlist item queue tracks - delegated to PlaylistQueueService
   */
  clearPlaylistItemQueue(): void {
    playlistQueueService.clearPlaylistItemQueue();
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): void {
    this.performanceMonitor.logReport();
  }

  /**
   * Check if any operations are consistently slow
   */
  checkPerformanceHealth(): { isHealthy: boolean; issues: string[] } {
    const issues: string[] = [];

    const operations = ['playLatency', 'trackSwitch', 'trackBuild'];
    operations.forEach(op => {
      if (this.performanceMonitor.isOperationSlow(op)) {
        issues.push(`${op} is consistently slow`);
      }
    });

    return {
      isHealthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if playback should advance to next item at verse range end
   */
  private async checkVerseRangeEnd(position: number): Promise<void> {
    const currentTrack = getPlaybackStore().currentTrack;

    // Only check for verse range tracks
    if (!currentTrack?.isVerseRange || !currentTrack.verseRangeEndTime) {
      return;
    }

    // If we've reached or passed the end of the verse range, advance to next item
    if (position >= currentTrack.verseRangeEndTime) {
      logger.info(
        true,
        `[MediaPlayerService] 🛑 Reached end of verse range at ${position}s, advancing to next item`
      );
      try {
        // Try to skip to next track in queue
        const hasNext = await this.skipToNext();
        if (hasNext) {
          logger.info(
            ENABLE_LOGGING,
            '[MediaPlayerService] ✅ Advanced to next playlist item'
          );
        } else {
          // No next item, pause playback
          await TrackPlayer.pause();
          logger.info(
            ENABLE_LOGGING,
            '[MediaPlayerService] ⏸️ No more items in queue, paused playback'
          );
        }
      } catch (error) {
        logger.warn(
          ENABLE_LOGGING,
          '[MediaPlayerService] Failed to advance to next item:',
          error
        );
        // Fallback: just pause
        try {
          await TrackPlayer.pause();
        } catch (pauseError) {
          logger.warn(
            ENABLE_LOGGING,
            '[MediaPlayerService] Failed to pause playback:',
            pauseError
          );
        }
      }
    }
  }

  /**
   * Cleanup method
   */
  async destroy(): Promise<void> {
    try {
      // Log final performance report
      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] 📊 Final Performance Report:'
      );
      this.performanceMonitor.logReport();

      // Track change coordination is now handled by state machine

      // Stop queue watcher
      queueWatcher.stopWatching();

      // Clean up services
      progressTrackingService.destroy();
      streamingService.destroy();
      verseDataService.destroy();

      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      // Reset store state
      getPlaybackStore().destroy();

      this.isInitialized = false;
      logger.info(
        ENABLE_LOGGING,
        '[MediaPlayerService] 🧹 MediaPlayerService destroyed'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[MediaPlayerService] ❌ Error destroying MediaPlayerService:',
        error
      );
    }
  }

  /**
   * Trigger auto-open expansion when audio starts playing
   * This is called from the playback state event listener
   */
  private async triggerAutoOpenOnPlaybackStart(): Promise<void> {
    try {
      const { triggerAutoOpenOnPlaybackStart } =
        await import('../utils/autoOpenHelper');
      await triggerAutoOpenOnPlaybackStart();
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '[MediaPlayerService] Failed to trigger auto-open on playback start:',
        error
      );
    }
  }
}

export const mediaPlayerService = new MediaPlayerService();
