import { create } from 'zustand';
import { AudioVersion, TextVersion } from '../types/entities';
import { userVersionsService } from '../services/userVersionsService';
import { logger } from '@/shared/utils/logger';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { queryClient } from '@/shared/services/query/queryClient';
import type {
  PreloadProgress,
  PreloadStatus,
} from '../../onboarding/services/preloadVersionContentService';
import type { SyncProgress } from '../../onboarding/services/prioritySyncMonitor';

// Logging configuration for this module
const ENABLE_LOGGING = true;

interface TextVersionDownloadProgress {
  versionId: string;
  isDownloading: boolean;
  phase: 'syncing' | 'preloading' | 'complete' | 'error';
  progress?: PreloadProgress | null;
  status?: PreloadStatus | null;
  syncProgress?: SyncProgress | null;
  error?: Error | null;
}

interface VersionsStoreState {
  // Current selections
  currentAudioVersion: AudioVersion | null;
  currentTextVersion: TextVersion | null;

  // Saved versions
  savedAudioVersions: AudioVersion[];
  savedTextVersions: TextVersion[];

  // Status
  isReady: boolean;
  error: string | null;

  // Text version download progress (for future UI)
  textVersionDownloadProgress: TextVersionDownloadProgress | null;
}

interface SetCurrentTextVersionOptions {
  onProgress?: (progress: PreloadProgress) => void;
  onStatus?: (status: PreloadStatus) => void;
  onSyncProgress?: (progress: SyncProgress) => void;
}

interface VersionsStoreActions {
  refresh: () => Promise<void>;
  setCurrentAudioVersion: (version: AudioVersion | null) => Promise<void>;
  setCurrentTextVersion: (
    version: TextVersion | null,
    options?: SetCurrentTextVersionOptions
  ) => Promise<void>;
  addSavedVersion: (
    version: AudioVersion | TextVersion,
    type: 'audio' | 'text'
  ) => Promise<void>;
  removeSavedVersion: (
    versionId: string,
    type: 'audio' | 'text'
  ) => Promise<void>;
  isVersionSaved: (versionId: string, type: 'audio' | 'text') => boolean;
  clearError: () => void;
  clearTextVersionDownloadProgress: () => void;
}

export type VersionsStore = VersionsStoreState & VersionsStoreActions;

export const useVersionsStore = create<VersionsStore>()((set, get) => ({
  // Initial state
  currentAudioVersion: null,
  currentTextVersion: null,
  savedAudioVersions: [],
  savedTextVersions: [],
  isReady: false,
  error: null,
  textVersionDownloadProgress: null,

  // Load current selections and saved versions (one-time or on demand)
  refresh: async () => {
    try {
      if (!powerSyncSystem.isInitialized) {
        // Defer refresh until DB is ready
        return;
      }
      set({ error: null });
      const [saved, current] = await Promise.all([
        userVersionsService.getSavedVersions(),
        userVersionsService.getCurrentSelections(),
      ]);

      // Check if user exists (anonymous or authenticated) before setting default versions
      // During sign-out/reset, we don't want to set default versions
      const { useAuthStore } = await import('@/shared/store/authStore');
      const authState = useAuthStore.getState();
      const hasUser = !!authState.user; // Any user (anonymous or authenticated)

      // Offline default selection fallback: if no user selections and local versions exist,
      // set in-memory defaults to the first available to enable offline reading/listening.
      // This works for both anonymous and authenticated users to enable offline functionality
      let defaultAudio = current.audio;
      let defaultText = current.text;

      if (!defaultAudio && hasUser) {
        try {
          const audioRows = (await powerSyncSystem.getAll(
            'SELECT id, name, language_entity_id, created_at FROM audio_versions LIMIT 1'
          )) as Array<{
            id: string;
            name: string;
            language_entity_id: string;
            created_at: string;
          }>;
          if (audioRows.length > 0) {
            const first = audioRows[0];
            if (first && first.id) {
              defaultAudio = {
                id: first.id,
                name: first.name ?? '',
                languageEntityId: first.language_entity_id ?? '',
                languageName: '',
                mediaFileCount: 0,
                createdAt: first.created_at ?? new Date().toISOString(),
                updatedAt: first.created_at ?? new Date().toISOString(),
              };
            }
          }
        } catch {
          // ignore
        }
      }
      if (!defaultText && hasUser) {
        try {
          const textRows = (await powerSyncSystem.getAll(
            'SELECT id, name, language_entity_id, created_at FROM text_versions LIMIT 1'
          )) as Array<{
            id: string;
            name: string;
            language_entity_id: string;
            created_at: string;
          }>;
          if (textRows.length > 0) {
            const first = textRows[0];
            if (first && first.id) {
              defaultText = {
                id: first.id,
                name: first.name ?? '',
                languageEntityId: first.language_entity_id ?? '',
                languageName: '',
                source: 'project' as const,
                verseCount: 0,
                createdAt: first.created_at ?? new Date().toISOString(),
                updatedAt: first.created_at ?? new Date().toISOString(),
              };
            }
          }
        } catch {
          // ignore
        }
      }
      set({
        savedAudioVersions: saved.audio,
        savedTextVersions: saved.text,
        currentAudioVersion: defaultAudio ?? current.audio,
        currentTextVersion: defaultText ?? current.text,
        isReady: true,
      });
    } catch (e) {
      logger.error(ENABLE_LOGGING, 'versionsStore.refresh failed', e);
      set({ error: 'Failed to load versions', isReady: true });
    }
  },

  // Write via service then refresh
  setCurrentAudioVersion: async (version: AudioVersion | null) => {
    try {
      const previousAudioVersionId = get().currentAudioVersion?.id ?? null;
      // Ensure saved record exists for sync rules and server sync
      if (version) {
        const exists = get().savedAudioVersions.some(v => v.id === version.id);
        if (!exists) {
          await userVersionsService.addSavedVersion(version, 'audio');
          set({ savedAudioVersions: [version, ...get().savedAudioVersions] });
        }
      }
      // Optimistic update for immediate UI
      set({ currentAudioVersion: version });

      // Invalidate chapter metadata queries to reflect new audio version immediately
      try {
        await queryClient.invalidateQueries({
          predicate: ({ queryKey }) =>
            Array.isArray(queryKey) && queryKey[0] === 'chapters-metadata',
        });
      } catch {
        // non-fatal
      }

      // Persist selection in the background
      await userVersionsService.setCurrentAudioVersion(version);

      // If audio version actually changed, close media player and clear queues
      const newAudioVersionId = version?.id ?? null;
      if (previousAudioVersionId !== newAudioVersionId) {
        try {
          const [mediaSvcMod, trackPlayerMod] = await Promise.all([
            import('@/features/media/services/MediaPlayerService'),
            import('react-native-track-player'),
            import('@/features/media/store/PlaybackStore'),
          ]);

          // Stop playback gracefully (saves progress and clears currentTrack)
          await mediaSvcMod.mediaPlayerService.stop().catch(() => {});

          // Ensure RNTP queue is empty
          await trackPlayerMod.default.reset().catch(() => {});

          // Clear metadata and audio queues in queue store
          const { getQueueStore } =
            await import('@/features/media/store/QueueStore');
          const queueStore = getQueueStore();
          queueStore.updateQueue({
            metadataQueue: [],
            audioQueue: [],
            windowStartIndex: 0,
            currentIndex: 0,
            isQueueBuilding: false,
            isBuildingBackground: false,
          });
          // Clear any existing media error state
          const { getPlaybackStore } =
            await import('@/features/media/store/PlaybackStore');
          getPlaybackStore().clearError();
        } catch (err) {
          logger.warn(
            ENABLE_LOGGING,
            'versionsStore: failed to reset media after audio version change',
            err
          );
        }
      }
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'versionsStore.setCurrentAudioVersion failed',
        e
      );
      // Fall back to a full refresh to reconcile state
      await get().refresh();
    }
  },

  setCurrentTextVersion: async (
    version: TextVersion | null,
    options?: SetCurrentTextVersionOptions
  ) => {
    try {
      // Phase 1: Early return if same version
      const currentVersionId = get().currentTextVersion?.id;
      if (version?.id === currentVersionId) {
        logger.debug(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Same version selected, skipping',
          { versionId: version.id }
        );
        return;
      }

      if (!version) {
        // Setting to null - just update and persist
        set({ currentTextVersion: null });
        await userVersionsService.setCurrentTextVersion(null);
        return;
      }

      // Phase 2: Check if text is already downloaded
      let isTextDownloaded = false;
      try {
        const countResult = await powerSyncSystem.getAll<{ count: number }>(
          'SELECT COUNT(*) as count FROM verse_texts WHERE text_version_id = ? LIMIT 1',
          [version.id]
        );
        isTextDownloaded = (countResult[0]?.count ?? 0) > 0;
        logger.debug(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Text download check',
          { versionId: version.id, isDownloaded: isTextDownloaded }
        );
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Failed to check if text is downloaded',
          e
        );
        // Continue as if not downloaded to be safe
      }

      // Phase 3A: Fast path - text already downloaded
      if (isTextDownloaded) {
        logger.info(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Fast path - text already downloaded',
          { versionId: version.id }
        );

        // Add to saved versions if not already saved
        if (version) {
          const exists = get().savedTextVersions.some(v => v.id === version.id);
          if (!exists) {
            // Fire and forget - don't await
            userVersionsService
              .addSavedVersion(version, 'text')
              .then(() => {
                set({
                  savedTextVersions: [version, ...get().savedTextVersions],
                });
              })
              .catch(err => {
                logger.warn(
                  ENABLE_LOGGING,
                  '[setCurrentTextVersion] Failed to add saved version (non-blocking)',
                  err
                );
              });
          }
        }

        // Optimistic update for immediate UI
        set({ currentTextVersion: version });

        // Skip query invalidation - data is local
        // Persist selection in background (non-blocking)
        userVersionsService.setCurrentTextVersion(version).catch(err => {
          logger.warn(
            ENABLE_LOGGING,
            '[setCurrentTextVersion] Failed to persist selection (non-blocking)',
            err
          );
        });

        return;
      }

      // Phase 3B: New version, text not downloaded - sync + fallback
      logger.info(
        ENABLE_LOGGING,
        '[setCurrentTextVersion] New version - initiating sync/preload',
        { versionId: version.id }
      );

      // Set downloading state
      set({
        textVersionDownloadProgress: {
          versionId: version.id,
          isDownloading: true,
          phase: 'syncing',
        },
      });

      // Add to saved versions if not already saved
      if (version) {
        const exists = get().savedTextVersions.some(v => v.id === version.id);
        if (!exists) {
          try {
            await userVersionsService.addSavedVersion(version, 'text');
            set({ savedTextVersions: [version, ...get().savedTextVersions] });
          } catch (err) {
            logger.warn(
              ENABLE_LOGGING,
              '[setCurrentTextVersion] Failed to add saved version',
              err
            );
          }
        }
      }

      // Optimistic update for immediate UI
      set({ currentTextVersion: version });

      // Persist selection
      try {
        await userVersionsService.setCurrentTextVersion(version);
      } catch (err) {
        logger.warn(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Failed to persist selection',
          err
        );
      }

      // Get userId for sync monitoring
      const { useAuthStore } = await import('@/shared/store/authStore');
      const authState = useAuthStore.getState();
      const userId = authState.userId;

      if (!userId) {
        logger.warn(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] No userId, cannot sync'
        );
        set({
          textVersionDownloadProgress: {
            versionId: version.id,
            isDownloading: false,
            phase: 'error',
            error: new Error('User not authenticated'),
          },
        });
        // Still invalidate queries in case data exists
        try {
          await queryClient.invalidateQueries({
            predicate: ({ queryKey }) =>
              Array.isArray(queryKey) && queryKey[0] === 'verses-with-texts',
          });
        } catch {
          // non-fatal
        }
        return;
      }

      // Try PowerSync sync first
      try {
        const { PrioritySyncMonitor } =
          await import('../../onboarding/services/prioritySyncMonitor');

        const monitor = new PrioritySyncMonitor({
          userId,
          checkInterval: 1000,
          timeout: 30000, // 30 second timeout
        });

        // Subscribe to progress updates
        const unsubscribe = monitor.subscribe(progress => {
          if (options?.onSyncProgress) {
            options.onSyncProgress(progress);
          }
          set({
            textVersionDownloadProgress: {
              versionId: version.id,
              isDownloading: true,
              phase: 'syncing',
              syncProgress: progress,
            },
          });
        });

        // Wait for priority 1 sync to complete
        const syncComplete = await monitor.waitForPriority1Complete();
        unsubscribe();
        monitor.stopMonitoring();

        if (syncComplete) {
          // Sync completed successfully
          logger.info(
            ENABLE_LOGGING,
            '[setCurrentTextVersion] PowerSync sync complete',
            { versionId: version.id }
          );
          set({
            textVersionDownloadProgress: {
              versionId: version.id,
              isDownloading: false,
              phase: 'complete',
            },
          });

          // Invalidate queries to refresh UI
          try {
            await queryClient.invalidateQueries({
              predicate: ({ queryKey }) =>
                Array.isArray(queryKey) && queryKey[0] === 'verses-with-texts',
            });
          } catch {
            // non-fatal
          }
          return;
        }

        // Sync timed out, fallback to preload
        logger.warn(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] PowerSync sync timeout, falling back to preload',
          { versionId: version.id }
        );
      } catch (syncError) {
        logger.warn(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] PowerSync sync failed, falling back to preload',
          syncError
        );
      }

      // Fallback to preload
      try {
        const { preloadVersionContent } =
          await import('../../onboarding/services/preloadVersionContentService');

        set({
          textVersionDownloadProgress: {
            versionId: version.id,
            isDownloading: true,
            phase: 'preloading',
          },
        });

        await preloadVersionContent(
          version.id,
          null, // audioVersionId
          progress => {
            if (options?.onProgress) {
              options.onProgress(progress);
            }
            set({
              textVersionDownloadProgress: {
                versionId: version.id,
                isDownloading: true,
                phase: 'preloading',
                progress,
              },
            });
          },
          status => {
            if (options?.onStatus) {
              options.onStatus(status);
            }
            set({
              textVersionDownloadProgress: {
                versionId: version.id,
                isDownloading: true,
                phase: 'preloading',
                status,
              },
            });
          }
        );

        logger.info(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Preload complete',
          { versionId: version.id }
        );

        set({
          textVersionDownloadProgress: {
            versionId: version.id,
            isDownloading: false,
            phase: 'complete',
          },
        });

        // Invalidate queries to refresh UI
        try {
          await queryClient.invalidateQueries({
            predicate: ({ queryKey }) =>
              Array.isArray(queryKey) && queryKey[0] === 'verses-with-texts',
          });
        } catch {
          // non-fatal
        }
      } catch (preloadError) {
        logger.error(
          ENABLE_LOGGING,
          '[setCurrentTextVersion] Preload failed',
          preloadError
        );
        set({
          textVersionDownloadProgress: {
            versionId: version.id,
            isDownloading: false,
            phase: 'error',
            error:
              preloadError instanceof Error
                ? preloadError
                : new Error('Preload failed'),
          },
        });
        // Still invalidate queries in case partial data exists
        try {
          await queryClient.invalidateQueries({
            predicate: ({ queryKey }) =>
              Array.isArray(queryKey) && queryKey[0] === 'verses-with-texts',
          });
        } catch {
          // non-fatal
        }
      }
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'versionsStore.setCurrentTextVersion failed',
        e
      );
      if (version) {
        set({
          textVersionDownloadProgress: {
            versionId: version.id,
            isDownloading: false,
            phase: 'error',
            error: e instanceof Error ? e : new Error('Unknown error'),
          },
        });
      }
      await get().refresh();
    }
  },

  addSavedVersion: async (
    version: AudioVersion | TextVersion,
    type: 'audio' | 'text'
  ) => {
    try {
      await userVersionsService.addSavedVersion(
        version as AudioVersion | TextVersion,
        type
      );
      if (type === 'audio') {
        const exists = get().savedAudioVersions.some(v => v.id === version.id);
        if (!exists)
          set({
            savedAudioVersions: [
              version as AudioVersion,
              ...get().savedAudioVersions,
            ],
          });
      } else {
        const exists = get().savedTextVersions.some(v => v.id === version.id);
        if (!exists)
          set({
            savedTextVersions: [
              version as TextVersion,
              ...get().savedTextVersions,
            ],
          });
      }
    } catch (e) {
      logger.error(ENABLE_LOGGING, 'versionsStore.addSavedVersion failed', e);
      set({ error: 'Failed to add version' });
    }
  },

  removeSavedVersion: async (versionId: string, type: 'audio' | 'text') => {
    try {
      // For audio versions, first disable downloads to clean up downloaded files
      if (type === 'audio') {
        try {
          const { versionDownloadService } =
            await import('../../downloads/services');
          await versionDownloadService.disableVersionDownload(versionId);
        } catch (err) {
          logger.warn(
            ENABLE_LOGGING,
            'Failed to clean up downloads before removing version:',
            err
          );
          // Continue with version removal even if download cleanup fails
        }
      }

      await userVersionsService.removeSavedVersion(versionId, type);
      if (type === 'audio') {
        set({
          savedAudioVersions: get().savedAudioVersions.filter(
            v => v.id !== versionId
          ),
        });
        if (get().currentAudioVersion?.id === versionId) {
          set({ currentAudioVersion: null });
        }
      } else {
        set({
          savedTextVersions: get().savedTextVersions.filter(
            v => v.id !== versionId
          ),
        });
        if (get().currentTextVersion?.id === versionId) {
          set({ currentTextVersion: null });
        }
      }
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'versionsStore.removeSavedVersion failed',
        e
      );
      set({ error: 'Failed to remove version' });
    }
  },

  isVersionSaved: (versionId: string, type: 'audio' | 'text') => {
    return (
      type === 'audio' ? get().savedAudioVersions : get().savedTextVersions
    ).some(v => v.id === versionId);
  },

  clearError: () => set({ error: null }),

  clearTextVersionDownloadProgress: () =>
    set({ textVersionDownloadProgress: null }),
}));

// Helper init to be called once after PowerSync is ready
export const initializeVersionsStore = async () => {
  try {
    await useVersionsStore.getState().refresh();
  } catch (e) {
    logger.warn(
      ENABLE_LOGGING,
      'initializeVersionsStore failed (non-fatal)',
      e
    );
  }
};
