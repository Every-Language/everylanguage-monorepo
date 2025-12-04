import TrackPlayer, { State } from 'react-native-track-player';
import { getQueueStore } from '../store/QueueStore';
import type { TrackMetadata, QueueItemRef } from '../store/QueueStore';
import { trackBuilder } from './TrackBuilder';
import { trackCacheService } from './TrackCacheService';
import { streamingService } from './StreamingService';
import { logger } from '@/shared/utils/logger';
import type { BibleTrack } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Stateless orchestrator that derives and applies the RNTP playback window
 * from store state. Implements Spotify semantics and rebuild heuristics.
 */
export class QueueOrchestrator {
  private static instance: QueueOrchestrator;

  static getInstance(): QueueOrchestrator {
    if (!QueueOrchestrator.instance) {
      QueueOrchestrator.instance = new QueueOrchestrator();
    }
    return QueueOrchestrator.instance;
  }

  private readonly WINDOW_SIZE = 14;
  // Use shared cache service
  private lastManualLength: number = 0;
  private isEnsuring = false;
  private isRebuilding = false;

  private constructor() {}

  /**
   * Check if queue is currently being rebuilt
   */
  get isQueueRebuilding(): boolean {
    return this.isRebuilding;
  }

  /**
   * Build desired window, resolve tracks, and apply to RNTP with minimal or full rebuild.
   */
  async ensureWindow(): Promise<void> {
    if (this.isEnsuring || this.isRebuilding) {
      logger.debug(
        ENABLE_LOGGING,
        '[QueueOrchestrator] Skipping ensureWindow - already ensuring or rebuilding',
        { isEnsuring: this.isEnsuring, isRebuilding: this.isRebuilding }
      );
      return;
    }
    this.isEnsuring = true;
    // Media store is not needed for queue operations

    // Determine active track id and current RNTP queue
    const activeIndex = await TrackPlayer.getActiveTrackIndex();
    const currentQueue = await TrackPlayer.getQueue();
    const activeId =
      activeIndex !== null && activeIndex !== undefined
        ? (currentQueue[activeIndex]?.['id'] as string | undefined)
        : undefined;

    // Build desired ids with Spotify semantics
    const queueState = getQueueStore();
    const headMeta = queueState.metadataQueue[queueState.currentIndex];
    const headAutoplay = headMeta
      ? this.buildTrackId(headMeta.chapterId, headMeta.audioVersionId)
      : undefined;
    const manualIds = queueState.manualQueue.map((ref: QueueItemRef) =>
      this.buildTrackId(ref.chapterId, ref.audioVersionId)
    );
    const playlistItemIds = queueState.playlistItemQueue.map(
      ref =>
        `playlist_item_${ref.playlistItemId}_${ref.startVerseId}_${ref.endVerseId}`
    );

    const tailAutoplay = queueState.metadataQueue
      .slice(queueState.currentIndex + 1)
      .map((m: TrackMetadata) =>
        this.buildTrackId(m.chapterId, m.audioVersionId)
      );

    let desiredIds: string[] = [];
    const head = activeId ?? headAutoplay;
    desiredIds = [
      ...(head ? [head] : []),
      ...playlistItemIds.filter((id: string) => id !== head),
      ...manualIds.filter((id: string) => id !== head),
      ...tailAutoplay.filter((id: string) => id !== head),
    ];

    // Dedupe (manual-first) and clamp
    const seen = new Set<string>();
    desiredIds = desiredIds.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (desiredIds.length > this.WINDOW_SIZE) {
      desiredIds = desiredIds.slice(0, this.WINDOW_SIZE);
    }

    // Always pin the currently active track at the head to avoid jumps
    if (activeId) {
      if (desiredIds[0] !== activeId) {
        desiredIds = [activeId, ...desiredIds.filter(id => id !== activeId)];
        if (desiredIds.length > this.WINDOW_SIZE) {
          desiredIds = desiredIds.slice(0, this.WINDOW_SIZE);
        }
      }
    }

    // Log all desired IDs for debugging
    logger.debug(
      ENABLE_LOGGING,
      `[QueueOrchestrator] Desired IDs to resolve: [${desiredIds.map(id => `"${id}"`).join(', ')}]`
    );

    // Resolve tracks with small concurrency and cache
    const desiredTracks = await this.resolveDesiredTracks(desiredIds);

    // Read current RNTP queue
    const rntpQueue = currentQueue;

    const shouldRebuild = this.shouldClearAndRebuild({
      rntpQueue,
      desiredTracks,
      manualQueueLength: queueState.manualQueue.length,
      lastManualLength: this.lastManualLength,
    });

    // Debug signal for verification
    logger.info(ENABLE_LOGGING, '[QueueOrchestrator] ensureWindow', {
      currentIndex: queueState.currentIndex,
      manualLen: queueState.manualQueue.length,
      desiredLen: desiredTracks.length,
      rntpLen: rntpQueue.length,
      shouldRebuild,
    });

    if (shouldRebuild) {
      this.isRebuilding = true;
      try {
        logger.info(
          ENABLE_LOGGING,
          '[QueueOrchestrator] Starting queue rebuild'
        );

        // Store current playback state before reset
        const wasPlaying = (await TrackPlayer.getState()) === State.Playing;

        await TrackPlayer.reset();
        if (desiredTracks.length > 0) {
          await TrackPlayer.add(desiredTracks);
        }

        // Restore playback state if it was playing before
        if (wasPlaying && desiredTracks.length > 0) {
          await TrackPlayer.play();
          logger.debug(
            ENABLE_LOGGING,
            '[QueueOrchestrator] Restored playback after queue rebuild'
          );
        }

        // Queue operations completed successfully

        logger.info(
          ENABLE_LOGGING,
          '[QueueOrchestrator] Queue rebuild completed'
        );
      } finally {
        this.isRebuilding = false;
      }
    } else {
      // Minimal diff: ensure tail matches desired tail without touching head
      const desiredTail = desiredTracks.slice(1);
      const currentTail = rntpQueue.slice(1);
      const mismatch = this.countMismatches(currentTail, desiredTail);
      if (mismatch > 0 || currentTail.length !== desiredTail.length) {
        // Remove existing tail safely
        if (rntpQueue.length > 1) {
          const indices = Array.from(
            { length: rntpQueue.length - 1 },
            (_, i) => i + 1
          );
          await TrackPlayer.remove(indices);
        }
        if (desiredTail.length > 0) {
          await TrackPlayer.add(desiredTail);
        }
      }
    }

    // Update store window
    queueState.updateQueue({
      audioQueue: desiredTracks,
      windowStartIndex: queueState.currentIndex,
    });

    // Remember manual length for next heuristic comparison
    this.lastManualLength = queueState.manualQueue.length;

    // Preload next track opportunistically
    void streamingService.preloadNextTrack();
    this.isEnsuring = false;
  }

  // (Removed) Legacy builder kept previously for reference; current logic builds desiredIds inline in ensureWindow

  /** Resolve desired ids to BibleTrack using cache + builder with small concurrency. */
  private async resolveDesiredTracks(ids: string[]): Promise<BibleTrack[]> {
    const tracks: BibleTrack[] = [];

    // Helper to parse id back into chapterId and audioVersionId
    const parse = (
      id: string
    ): { chapterId: string; audioVersionId: string | undefined } => {
      // Handle verse range IDs (e.g., verse_range_gen-1-1_gen-1-12_gen-1)
      if (id.startsWith('verse_range_')) {
        const parts = id.replace(/^verse_range_/, '').split('_');
        if (parts.length >= 3 && parts[2]) {
          // Format: verse_range_${startVerseId}_${endVerseId}_${chapterId}
          const chapterId = parts[2];
          logger.debug(
            ENABLE_LOGGING,
            `[QueueOrchestrator] Parsed verse range ID: ${id} -> chapterId: ${chapterId}`
          );
          return { chapterId, audioVersionId: undefined };
        }
        // Fallback: return empty to skip this track
        logger.warn(
          ENABLE_LOGGING,
          `[QueueOrchestrator] Failed to parse verse range ID: ${id}`
        );
        return { chapterId: '', audioVersionId: undefined };
      }

      // Handle playlist item IDs differently
      if (id.startsWith('playlist_item_')) {
        // Robust parse: take last two underscores as start/end verse IDs
        const raw = id.slice('playlist_item_'.length);
        const last = raw.lastIndexOf('_');
        const secondLast = raw.lastIndexOf('_', last - 1);

        if (last === -1 || secondLast === -1) {
          logger.warn(
            ENABLE_LOGGING,
            `[QueueOrchestrator] Failed to parse playlist item ID (underscores): ${id}`
          );
          return { chapterId: '', audioVersionId: undefined };
        }

        const startVerseId = raw.slice(secondLast + 1, last);
        const verseParts = startVerseId.split('-');
        if (verseParts.length >= 3) {
          const chapterId = `${verseParts[0]}-${verseParts[1]}`;
          logger.debug(
            ENABLE_LOGGING,
            `[QueueOrchestrator] Parsed playlist item ID: ${id} -> chapterId: ${chapterId}`
          );
          return { chapterId, audioVersionId: undefined };
        }

        // Fallback: return empty to skip this track
        logger.warn(
          ENABLE_LOGGING,
          `[QueueOrchestrator] Failed to derive chapterId from startVerseId in playlist item ID: ${id}`
        );
        return { chapterId: '', audioVersionId: undefined };
      }

      // Handle regular chapter IDs
      const parts = id.replace(/^chapter_/, '').split('_');
      const chapterId = parts[0] ?? '';
      const audioVersionId = parts[1];

      // Validate chapterId format
      if (!chapterId || chapterId === 'verse' || chapterId === '') {
        logger.error(
          ENABLE_LOGGING,
          `[QueueOrchestrator] ❌ Invalid chapterId parsed from ID: "${id}" -> chapterId: "${chapterId}"`
        );
        logger.error(
          ENABLE_LOGGING,
          `[QueueOrchestrator] ❌ Original ID parts: [${parts.map(p => `"${p}"`).join(', ')}]`
        );
        return { chapterId: '', audioVersionId: undefined };
      }

      logger.debug(
        ENABLE_LOGGING,
        `[QueueOrchestrator] Parsed chapter ID: ${id} -> chapterId: ${chapterId}, audioVersionId: ${audioVersionId}`
      );
      return { chapterId, audioVersionId };
    };

    const concurrency = 3;
    let index = 0;

    const worker = async () => {
      while (index < ids.length) {
        const current = index++;
        const id = ids[current]!; // ids built by us; safe non-null

        logger.debug(
          ENABLE_LOGGING,
          `[QueueOrchestrator] Processing ID: "${id}"`
        );

        // Use cache if available
        const cached = trackCacheService.get(id);
        if (cached) {
          tracks[current] = cached;
          continue;
        }

        const { chapterId, audioVersionId } = parse(id);

        let built: BibleTrack | undefined;

        // Handle verse range tracks
        if (id.startsWith('verse_range_')) {
          const parts = id.replace(/^verse_range_/, '').split('_');
          if (parts.length >= 3 && parts[0] && parts[1]) {
            const startVerseId = parts[0];
            const endVerseId = parts[1];
            built = await trackBuilder.buildVerseRangeTrack(
              chapterId,
              startVerseId,
              endVerseId,
              audioVersionId ? { audioVersionId } : {}
            );
          }
        } else if (id.startsWith('playlist_item_')) {
          // Handle playlist items differently (robust to underscores in playlistItemId)
          const raw = id.slice('playlist_item_'.length);
          const last = raw.lastIndexOf('_');
          const secondLast = raw.lastIndexOf('_', last - 1);

          if (last !== -1 && secondLast !== -1) {
            const startVerseId = raw.slice(secondLast + 1, last);
            const endVerseId = raw.slice(last + 1);
            built = await trackBuilder.buildVerseRangeTrack(
              chapterId,
              startVerseId,
              endVerseId,
              audioVersionId ? { audioVersionId } : {}
            );
          }
        } else {
          // Handle regular chapter tracks
          built = await trackBuilder.buildChapterTrack(
            chapterId,
            audioVersionId ? { audioVersionId } : {}
          );
        }

        if (built) {
          trackCacheService.set(id, built);
          tracks[current] = built;
        } else {
          // Skip missing entries (leave hole)
          logger.warn(
            ENABLE_LOGGING,
            '[QueueOrchestrator] Skipping missing media for',
            {
              id,
              chapterId,
            }
          );
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, ids.length) },
      () => worker()
    );
    await Promise.all(workers);

    // Compact to remove any holes from missing media
    return tracks.filter(Boolean);
  }

  /** Heuristics to decide between minimal update and Clear & Rebuild. */
  private shouldClearAndRebuild(params: {
    rntpQueue: Array<Record<string, unknown>>;
    desiredTracks: BibleTrack[];
    manualQueueLength: number;
    lastManualLength: number;
  }): boolean {
    const { rntpQueue, desiredTracks, manualQueueLength, lastManualLength } =
      params;

    const activeDiffers =
      (rntpQueue[0]?.['id'] ?? null) !== (desiredTracks[0]?.id ?? null);
    const lengthDelta = Math.abs(rntpQueue.length - desiredTracks.length);
    const manualChanged = manualQueueLength !== lastManualLength;
    const compositionMismatches = this.countMismatches(
      rntpQueue,
      desiredTracks
    );

    // Special-case: initial expansion from single-track queue
    // Avoid reset when head matches; just append desired tail to prevent play/pause flapping
    const isInitialExpansion =
      !activeDiffers && rntpQueue.length <= 1 && desiredTracks.length > 1;
    if (isInitialExpansion) {
      return false;
    }

    // Manual-queue updates should not reset if head stays the same
    if (manualChanged && !activeDiffers && rntpQueue.length > 0) {
      return false;
    }

    if (
      activeDiffers ||
      (lengthDelta > 3 && rntpQueue.length > 1) ||
      manualChanged ||
      (compositionMismatches > 3 && rntpQueue.length > 1)
    ) {
      logger.info(
        ENABLE_LOGGING,
        '[QueueOrchestrator] Rebuild heuristic triggered',
        {
          activeDiffers,
          lengthDelta,
          manualChanged,
          compositionMismatches,
        }
      );
      return true;
    }
    return false;
  }

  private countMismatches(
    a: Array<Record<string, unknown>>,
    b: BibleTrack[]
  ): number {
    const min = Math.min(a.length, b.length);
    let mismatches = 0;
    for (let i = 0; i < min; i++) {
      const aId = a[i]?.['id'] as string | undefined;
      const bId = b[i]?.id as string | undefined;
      if ((aId ?? '') !== (bId ?? '')) mismatches++;
    }
    return mismatches + Math.abs(a.length - b.length);
  }

  private buildTrackId(chapterId: string, audioVersionId?: string): string {
    const versionPart = audioVersionId ? `_${audioVersionId}` : '';
    return `chapter_${chapterId}${versionPart}`;
  }
}

export const queueOrchestrator = QueueOrchestrator.getInstance();
