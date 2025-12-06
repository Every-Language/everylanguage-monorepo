import * as FileSystem from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import { useDownloadsStore } from '@/shared/store/downloadsStore';
import { userVersionsService } from '@/features/languages/services/userVersionsService';
import { generateUUID } from '@/shared/utils/uuid';
import {
  getMediaSignedUrlsById,
  maybeGetCachedMediaSignedUrl,
  cacheMediaSignedUrl,
} from './urlCache';
import { downloadToFile } from './fileDownloader';
import { queueManager } from './QueueManager';

// Logging configuration for this module
const ENABLE_LOGGING = true;

const BACKGROUND_TASK_NAME = 'downloads-background-task';

interface QueueItem {
  id: string;
  media_file_id: string;
  file_size_bytes: number | null;
  priority: number;
}

class DownloadManager {
  private static instance: DownloadManager;

  private initialized = false;
  private isProcessing = false;
  private maxConcurrency = 3;
  private activeCount = 0;
  private recomputing = false;
  private recomputePending = false;
  private lastNetworkCheckTs = 0;
  private lastNetworkOnline = false;
  private readonly NETWORK_CHECK_MIN_INTERVAL = 30000; // 30s throttle
  // Throttle map to reduce frequent DB writes for progress
  private lastProgressWriteByMediaId: Map<string, { ts: number; pct: number }> =
    new Map();

  // Migration lock to prevent race conditions
  private isMigrationLocked = false;

  private constructor() {}

  public static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
        try {
          // Avoid parallel processOnce; just ensure the loop is running
          this.kick();
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            'Downloads background task failed:',
            error
          );
        }
      });
    } catch (e) {
      void e;
    }

    try {
      // Ensure DB is ready before touching PowerSync
      if (!powerSyncSystem.isInitialized) {
        await powerSyncSystem.waitUntilInitialized?.();
      }
      const savedAv = await powerSyncSystem.getAll(
        `SELECT audio_version_id FROM user_saved_audio_versions WHERE audio_version_id IS NOT NULL`
      );
      for (const row of savedAv as Array<{ audio_version_id: string }>) {
        await powerSyncSystem.execute(
          `INSERT INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
           SELECT ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?
           )`,
          [
            generateUUID(),
            row.audio_version_id,
            new Date().toISOString(),
            row.audio_version_id,
          ]
        );
      }
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Downloads: failed to seed download versions',
        e
      );
    }

    // Ensure uniqueness on media_files_downloads.media_file_id and clean up any duplicate rows from dev/HMR
    try {
      // Deduplicate by keeping the latest row per media_file_id (based on updated_at timestamp)
      await powerSyncSystem.execute(
        `DELETE FROM media_files_downloads
         WHERE id NOT IN (
           SELECT id FROM media_files_downloads mfd1
           WHERE mfd1.updated_at = (
             SELECT MAX(mfd2.updated_at) FROM media_files_downloads mfd2 
             WHERE mfd2.media_file_id = mfd1.media_file_id
           )
         )`
      );
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Downloads: failed to enforce unique media_file_id',
        e
      );
    }

    useDownloadsStore.getState().refreshCounts();

    this.initialized = true;

    void this.resetStuckDownloads();

    void this.reconcileAllMediaFiles();

    this.kick();

    // Gate watchers on DB readiness
    this.startMediaFilesWatcher().catch(err =>
      logger.warn(ENABLE_LOGGING, 'Media files watcher error:', err)
    );

    this.startSavedVersionsWatcher().catch(err =>
      logger.warn(ENABLE_LOGGING, 'Saved versions watcher error:', err)
    );
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    this.isProcessing = false;
  }

  /**
   * Pause all downloads during migration to prevent race conditions
   */
  async pauseForMigration(): Promise<void> {
    logger.info(
      ENABLE_LOGGING,
      'DownloadManager: Pausing downloads for migration'
    );
    this.isMigrationLocked = true;

    // Pause all active downloads by marking them as paused
    await powerSyncSystem.execute(
      `UPDATE download_queue SET status = 'paused' WHERE status = 'active'`
    );

    // Wait for active downloads to complete their current operations
    const maxWaitTime = 10000; // 10 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (this.activeCount > 0 && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (this.activeCount > 0) {
      logger.warn(
        ENABLE_LOGGING,
        'DownloadManager: Some downloads still active after pause timeout'
      );
    }
  }

  /**
   * Resume downloads after migration is complete
   */
  async resumeAfterMigration(): Promise<void> {
    logger.info(
      ENABLE_LOGGING,
      'DownloadManager: Resuming downloads after migration'
    );
    this.isMigrationLocked = false;

    // Resume paused downloads
    await powerSyncSystem.execute(
      `UPDATE download_queue SET status = 'queued' WHERE status = 'paused'`
    );

    // Kick the download manager to resume processing
    await this.kick();
  }

  /**
   * Check if downloads are paused for migration
   */
  isPausedForMigration(): boolean {
    return this.isMigrationLocked;
  }

  public async kick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      while (this.isProcessing && this.initialized) {
        const started = await this.processQueueOnce();
        if (!started) {
          await this.delay(2000);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueueOnce(): Promise<boolean> {
    if (!powerSyncSystem.isInitialized) return false;

    // Don't process downloads during migration to prevent race conditions
    if (this.isMigrationLocked) {
      logger.debug(
        ENABLE_LOGGING,
        'DownloadManager: Skipping queue processing - migration in progress'
      );
      return false;
    }

    // Only perform external network checks when there's work to do
    const queuedCountRows = await powerSyncSystem.getAll(
      `SELECT COUNT(1) AS c FROM download_queue WHERE status = 'queued'`
    );
    const queuedCount = Number(queuedCountRows?.[0]?.['c'] ?? 0);
    if (queuedCount === 0 && this.activeCount === 0) {
      return false;
    }

    // Throttled connectivity evaluation with store reuse
    try {
      const now = Date.now();
      let online: boolean | null = null;

      // Reuse recent decision
      if (now - this.lastNetworkCheckTs < this.NETWORK_CHECK_MIN_INTERVAL) {
        online = this.lastNetworkOnline;
      }

      if (online === null) {
        // Prefer store's last result if fresh
        const { useNetworkStore } = await import('@/shared/store/networkStore');
        const { capabilities, networkState } = useNetworkStore.getState();

        if (
          capabilities.lastChecked !== null &&
          now - (capabilities.lastChecked ?? 0) <
            this.NETWORK_CHECK_MIN_INTERVAL
        ) {
          online = capabilities.isOnline;
        } else if (
          networkState.isConnected === false ||
          networkState.isInternetReachable === false
        ) {
          online = false;
        }
      }

      if (online === null) {
        const { networkService } = await import('@/shared/services/network');
        online = await networkService.checkOnlineCapabilities();
      }

      this.lastNetworkCheckTs = Date.now();
      this.lastNetworkOnline = !!online;

      if (!online) {
        await this.delay(5000);
        return false;
      }
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Downloads: network check failed, proceeding cautiously',
        e
      );
    }

    const availableSlots = Math.max(0, this.maxConcurrency - this.activeCount);
    if (availableSlots <= 0) return false;

    // Atomically claim next queued items by marking them active with a unique started_at tag
    const startedTag = new Date().toISOString();
    await powerSyncSystem.execute(
      `UPDATE download_queue
       SET status = 'active', started_at = ?
       WHERE id IN (
         SELECT id FROM download_queue
         WHERE status = 'queued'
         ORDER BY priority DESC, enqueued_at ASC
         LIMIT ?
       )`,
      [startedTag, availableSlots]
    );

    const items = (await powerSyncSystem.getAll(
      `SELECT dq.id, dq.media_file_id, dq.file_size_bytes, dq.priority
       FROM download_queue dq
       WHERE dq.status = 'active' AND dq.started_at = ?
       ORDER BY dq.priority DESC, dq.enqueued_at ASC`,
      [startedTag]
    )) as QueueItem[];

    if (items.length === 0) {
      useDownloadsStore.getState().refreshCounts();
      return false;
    }

    // Ensure uniqueness by media_file_id just in case
    const seen = new Set<string>();
    const uniqueItems = items.filter(it => {
      if (seen.has(it.media_file_id)) return false;
      seen.add(it.media_file_id);
      return true;
    });

    for (const item of uniqueItems) {
      this.activeCount++;
      // logger.info(ENABLE_LOGGING, 'Downloads: starting download', {
      //   mediaFileId: item.media_file_id,
      // });
      this.downloadItem(item)
        .catch(err => {
          logger.error(ENABLE_LOGGING, 'Download failed:', {
            id: item.id,
            err,
          });
        })
        .finally(() => {
          this.activeCount--;
          useDownloadsStore.getState().refreshCounts();
        });
    }

    return true;
  }

  // NOTE: fetchNextQueueItems replaced by atomic claim logic in processQueueOnce

  private async markQueueStatus(
    id: string,
    status: 'queued' | 'active' | 'completed' | 'failed' | 'paused',
    errorMessage?: string
  ) {
    const ts = new Date().toISOString();
    const updates: Record<string, unknown> = { status };
    if (status === 'active') updates['started_at'] = ts;
    if (status === 'completed') updates['completed_at'] = ts;
    if (errorMessage) updates['error_message'] = errorMessage;
    const sets = Object.keys(updates)
      .map(k => `${k} = ?`)
      .join(', ');
    const params = [...Object.values(updates), id];
    await powerSyncSystem.execute(
      `UPDATE download_queue SET ${sets} WHERE id = ?`,
      params
    );
  }

  private async ensureDownloadsDir(versionId?: string): Promise<string> {
    const base =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const dir = `${base}downloads/audio${versionId ? '/' + versionId : ''}/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  }

  private getRelativePath(absolutePath: string): string {
    const base =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    if (absolutePath.startsWith(base)) {
      return absolutePath.substring(base.length);
    }
    return absolutePath;
  }

  private getAbsolutePath(relativePath: string): string {
    const base =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    if (relativePath.startsWith(base)) {
      return relativePath; // Already absolute
    }
    return `${base}${relativePath}`;
  }

  private async buildLocalPathForMedia(
    mediaFileId: string,
    versionId?: string
  ): Promise<string> {
    // Get file extension from media_files table
    const mediaFileRows = await powerSyncSystem.getAll(
      'SELECT file_type, original_filename FROM media_files WHERE id = ?',
      [mediaFileId]
    );

    const mediaFile = mediaFileRows[0] as
      | { file_type?: string; original_filename?: string }
      | undefined;

    // Determine file extension - prefer file_type, fallback to extracting from original_filename
    let extension = '';
    if (mediaFile?.file_type) {
      extension = mediaFile.file_type.startsWith('.')
        ? mediaFile.file_type
        : `.${mediaFile.file_type}`;
    } else if (mediaFile?.original_filename) {
      const lastDot = mediaFile.original_filename.lastIndexOf('.');
      if (lastDot > 0) {
        extension = mediaFile.original_filename.substring(lastDot);
      }
    }

    const base = FileSystem.documentDirectory || '';
    const fileName = `${mediaFileId}${extension}`;
    return `${base}downloads/audio${versionId ? '/' + versionId : ''}/${fileName}`;
  }

  private async downloadItem(item: QueueItem): Promise<void> {
    // status already marked active during claim; keep for safety in non-claimed paths
    await this.markQueueStatus(item.id, 'active');

    const mfRows = await powerSyncSystem.getAll(
      'SELECT audio_version_id FROM media_files WHERE id = ?',
      [item.media_file_id]
    );

    const mf = mfRows[0] as { audio_version_id?: string } | undefined;

    const versionId: string | undefined = mf?.audio_version_id || undefined;

    const existingRows = await powerSyncSystem.getAll(
      `SELECT download_status FROM media_files_downloads WHERE media_file_id = ?`,
      [item.media_file_id]
    );
    const existing = existingRows[0] as
      | { download_status?: string }
      | undefined;
    if (existing?.download_status === 'completed') {
      await this.markQueueStatus(item.id, 'completed');
      return;
    }

    await this.ensureDownloadsDir(versionId);
    const localPath = await this.buildLocalPathForMedia(
      item.media_file_id,
      versionId
    );

    let signedUrl: string | null = await maybeGetCachedMediaSignedUrl(
      item.media_file_id
    );
    if (!signedUrl) {
      const signedMap = await getMediaSignedUrlsById([item.media_file_id]);
      const fresh = signedMap[item.media_file_id];
      if (!fresh) throw new Error('Missing signed URL');
      signedUrl = fresh;
      await cacheMediaSignedUrl(item.media_file_id, fresh, 6);
    }

    try {
      const downloadRes = await downloadToFile(
        signedUrl as string,
        localPath,
        progress => {
          const progressRatio =
            progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : 0;
          this.updateProgress(
            item.media_file_id,
            progress.totalBytesWritten,
            progress.totalBytesExpectedToWrite,
            progressRatio
          ).catch(err =>
            logger.warn(ENABLE_LOGGING, 'Progress update failed', err)
          );
        }
      );

      if (downloadRes && downloadRes.status === 200) {
        // logger.info(ENABLE_LOGGING, 'Downloads: completed download', {
        //   mediaFileId: item.media_file_id,
        // });
        await this.onDownloadSuccess(item, localPath, item.file_size_bytes);
      } else {
        throw new Error(`HTTP ${downloadRes?.status ?? 'unknown'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      await this.onDownloadFailure(item, message);
    }
  }

  private async updateProgress(
    mediaFileId: string,
    downloadedBytes: number,
    totalBytes: number,
    progress: number
  ) {
    // Throttle writes: only if >= 0.01 delta or >= 500ms since last write
    try {
      const now = Date.now();
      const last = this.lastProgressWriteByMediaId.get(mediaFileId);
      const pct = Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0;
      const minIntervalMs = 500;
      const minDelta = 0.01; // 1%
      if (last) {
        const tooSoon = now - last.ts < minIntervalMs;
        const smallDelta = Math.abs(pct - last.pct) < minDelta;
        if (tooSoon && smallDelta) return;
      }
      this.lastProgressWriteByMediaId.set(mediaFileId, { ts: now, pct });
    } catch (_err) {
      // best-effort throttling; proceed with DB write
      void _err;
    }

    const ts = new Date().toISOString();
    // Try update-first (avoid UPSERT on views); insert if missing
    const existing = await powerSyncSystem.getAll(
      `SELECT download_status FROM media_files_downloads WHERE media_file_id = ? LIMIT 1`,
      [mediaFileId]
    );

    if (existing.length > 0) {
      const status = (existing[0] as { download_status?: string })
        ?.download_status;
      if (status !== 'completed') {
        await powerSyncSystem.execute(
          `UPDATE media_files_downloads
           SET progress = ?, downloaded_bytes = ?, file_size_bytes = ?, updated_at = ?
           WHERE media_file_id = ? AND download_status <> 'completed'`,
          [progress, downloadedBytes, totalBytes, ts, mediaFileId]
        );
      }
    } else {
      // Conditional insert to avoid unique constraint races
      await powerSyncSystem.execute(
        `INSERT INTO media_files_downloads (
           id, media_file_id, local_file_path,
           download_status, progress, downloaded_bytes, file_size_bytes,
           created_at, updated_at
         )
         SELECT ?, ?, '', 'downloading', ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM media_files_downloads WHERE media_file_id = ?
         )`,
        [
          generateUUID(),
          mediaFileId,
          progress,
          downloadedBytes,
          totalBytes,
          ts,
          ts,
          mediaFileId,
        ]
      );
    }
  }

  private async onDownloadSuccess(
    item: QueueItem,
    localPath: string,
    fileSizeBytes: number | null
  ) {
    const ts = new Date().toISOString();
    const relativePath = this.getRelativePath(localPath);

    const exists = await powerSyncSystem.getAll(
      'SELECT id FROM media_files_downloads WHERE media_file_id = ? LIMIT 1',
      [item.media_file_id]
    );

    if (exists.length > 0) {
      await powerSyncSystem.execute(
        `UPDATE media_files_downloads
         SET local_file_path = ?, download_status = 'completed',
             progress = 1.0, downloaded_bytes = ?, file_size_bytes = ?, downloaded_at = ?, updated_at = ?
         WHERE media_file_id = ?`,
        [
          relativePath,
          fileSizeBytes ?? 0,
          fileSizeBytes ?? 0,
          ts,
          ts,
          item.media_file_id,
        ]
      );
    } else {
      await powerSyncSystem.execute(
        `INSERT INTO media_files_downloads (
          id, media_file_id, local_file_path, download_status,
          progress, downloaded_bytes, file_size_bytes, downloaded_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'completed', 1.0, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          item.media_file_id,
          relativePath,
          fileSizeBytes ?? 0,
          fileSizeBytes ?? 0,
          ts,
          ts,
          ts,
        ]
      );
    }

    await powerSyncSystem.execute(`DELETE FROM download_queue WHERE id = ?`, [
      item.id,
    ]);

    // 🚀 PERFORMANCE: Invalidate chapter media cache when download completes
    try {
      const { chapterMediaResolver } =
        await import('@/features/media/services/ChapterMediaResolver');
      // Get chapter ID from media file to invalidate cache
      const mediaFileResults = await powerSyncSystem.getAll(
        'SELECT chapter_id FROM media_files WHERE id = ?',
        [item.media_file_id]
      );
      if (mediaFileResults.length > 0 && mediaFileResults[0]?.chapter_id) {
        chapterMediaResolver.invalidateCacheForChapter(
          mediaFileResults[0].chapter_id
        );
      }
    } catch (error) {
      // Non-fatal - cache invalidation failure shouldn't break downloads
      logger.warn(
        ENABLE_LOGGING,
        'Failed to invalidate chapter media cache after download:',
        error
      );
    }

    useDownloadsStore.getState().refreshCounts();
  }

  private async onDownloadFailure(item: QueueItem, message: string) {
    await powerSyncSystem.execute(
      `UPDATE media_files_downloads
       SET download_status = 'failed', error_message = ?, retry_count = COALESCE(retry_count, 0) + 1, last_attempt_at = ?, updated_at = ?
       WHERE media_file_id = ?`,
      [
        message,
        new Date().toISOString(),
        new Date().toISOString(),
        item.media_file_id,
      ]
    );

    const retryRows = await powerSyncSystem.getAll(
      'SELECT retry_count FROM media_files_downloads WHERE media_file_id = ?',
      [item.media_file_id]
    );
    const { retry_count } = (retryRows[0] as { retry_count?: number }) || {};

    if ((retry_count ?? 0) < 3) {
      await powerSyncSystem.execute(
        `UPDATE download_queue SET status = 'queued', error_message = ?, started_at = NULL WHERE id = ?`,
        [message, item.id]
      );
      await this.delay(1000 * Math.pow(2, retry_count ?? 0));
    } else {
      await powerSyncSystem.execute(
        `UPDATE download_queue SET status = 'failed', error_message = ? WHERE id = ?`,
        [message, item.id]
      );
    }
  }

  private async startSavedVersionsWatcher(): Promise<void> {
    const saved = await userVersionsService.watchSavedVersions();
    const current = await userVersionsService.watchCurrentSelections();

    const consumeSaved = async () => {
      try {
        for await (const batch of saved as AsyncIterable<
          Record<string, unknown>[]
        >) {
          if (!Array.isArray(batch)) continue;
          for (const row of batch) {
            const type = (row as Record<string, unknown>)?.['type'] as
              | string
              | undefined;
            const versionId = (row as Record<string, unknown>)?.[
              'version_id'
            ] as string | undefined;
            if (type === 'audio' && versionId) {
              await powerSyncSystem.execute(
                `INSERT INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
                 SELECT ?, ?, ? WHERE NOT EXISTS (
                   SELECT 1 FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?
                 )`,
                [generateUUID(), versionId, new Date().toISOString(), versionId]
              );
            }
          }
          await this.recomputeQueue();
        }
      } catch (e) {
        logger.warn(ENABLE_LOGGING, 'Saved versions stream ended', e);
      }
    };

    const consumeCurrent = async () => {
      try {
        for await (const batch of current as AsyncIterable<
          Record<string, unknown>[]
        >) {
          if (!Array.isArray(batch)) continue;
          for (const row of batch) {
            const selectedAudio = (row as Record<string, unknown>)?.[
              'selected_audio_version'
            ] as string | null | undefined;
            if (selectedAudio) {
              // Ensure current audio selection is tracked for downloads
              await powerSyncSystem.execute(
                `INSERT INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
                 SELECT ?, ?, ? WHERE NOT EXISTS (
                   SELECT 1 FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?
                 )`,
                [
                  generateUUID(),
                  selectedAudio,
                  new Date().toISOString(),
                  selectedAudio,
                ]
              );
            }
          }
          await this.recomputeQueue();
        }
      } catch (e) {
        logger.warn(ENABLE_LOGGING, 'Current selections stream ended', e);
      }
    };

    consumeSaved();
    consumeCurrent();

    await this.recomputeQueue();
  }

  private async startMediaFilesWatcher(): Promise<void> {
    const mediaFilesStream = await powerSyncSystem.watch(
      'SELECT id FROM media_files'
    );
    const consumeMedia = async () => {
      try {
        for await (const _row of mediaFilesStream as AsyncIterable<unknown>) {
          void _row;
          if (this.recomputing) {
            this.recomputePending = true;
          } else {
            await this.recomputeQueue();
          }
        }
      } catch (e) {
        logger.warn(ENABLE_LOGGING, 'Media files stream ended', e);
      }
    };
    consumeMedia();
  }

  private async reconcileAllMediaFiles(): Promise<void> {
    try {
      await this.recomputeQueue();
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Downloads: reconcileAllMediaFiles failed',
        e
      );
    }
  }

  /** Reset stuck active downloads back to queued */
  public async resetStuckDownloads(): Promise<void> {
    try {
      // Reset downloads that have been active for more than 2 minutes without progress
      // Reduced from 5 minutes to improve recovery time after app restarts
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      await powerSyncSystem.execute(
        `UPDATE download_queue 
         SET status = 'queued', started_at = NULL 
         WHERE status = 'active' AND (started_at IS NULL OR started_at < ?)`,
        [twoMinutesAgo]
      );

      // Also clean up any orphaned partial files that might be corrupted
      await this.cleanupOrphanedPartialFiles();
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Downloads: resetStuckDownloads failed', e);
    }
  }

  /** Clean up partial files that don't have corresponding active downloads */
  private async cleanupOrphanedPartialFiles(): Promise<void> {
    try {
      // Get all partial downloads that are no longer in the queue
      const orphanedFiles = await powerSyncSystem.getAll(
        `SELECT mfd.local_file_path, mfd.media_file_id
         FROM media_files_downloads mfd
         LEFT JOIN download_queue dq ON dq.media_file_id = mfd.media_file_id
         WHERE mfd.download_status = 'in_progress' 
         AND dq.id IS NULL
         AND mfd.local_file_path IS NOT NULL`
      );

      for (const row of orphanedFiles as Array<{
        local_file_path: string;
        media_file_id: string;
      }>) {
        try {
          const filePath = row.local_file_path;
          if (filePath) {
            // Convert relative path to absolute path for file operations
            const absolutePath = this.getAbsolutePath(filePath);
            const fileInfo = await FileSystem.getInfoAsync(absolutePath);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(absolutePath, { idempotent: true });
              logger.info(
                ENABLE_LOGGING,
                'Cleaned up orphaned partial file:',
                absolutePath
              );
            }
          }

          // Reset the download record
          await powerSyncSystem.execute(
            `UPDATE media_files_downloads 
             SET download_status = 'queued', local_file_path = NULL, progress = NULL
             WHERE media_file_id = ?`,
            [row.media_file_id]
          );
        } catch (fileError) {
          logger.warn(
            ENABLE_LOGGING,
            'Failed to cleanup orphaned file:',
            fileError
          );
        }
      }
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Orphaned file cleanup failed:', e);
    }
  }

  private async recomputeQueue(): Promise<void> {
    if (this.recomputing) {
      this.recomputePending = true;
      return;
    }
    this.recomputing = true;
    try {
      // Delegate to the dedicated QueueManager
      await queueManager.recomputeQueue();
      // Still need to kick the processing loop
      this.kick();
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to recompute download queue:',
        error
      );
    } finally {
      this.recomputing = false;
      if (this.recomputePending) {
        this.recomputePending = false;
        void this.recomputeQueue();
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const downloadManager = DownloadManager.getInstance();
export default DownloadManager;
