import * as FileSystem from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import { generateUUID } from '@/shared/utils/uuid';
import { getImageSignedUrlsById } from './urlCache';
import { downloadToFile } from './fileDownloader';

// Logging configuration for this module
const ENABLE_LOGGING = true;

const BACKGROUND_TASK_NAME = 'images-downloads-background-task';

interface QueueItem {
  id: string;
  image_id: string;
  set_id: string | null;
  file_size_bytes: number | null;
  priority: number;
}

class ImageDownloadManager {
  private static instance: ImageDownloadManager;

  private initialized = false;
  private isProcessing = false;
  private maxConcurrency = 2;
  private activeCount = 0;
  private recomputing = false;
  private recomputePending = false;

  private constructor() {}

  public static getInstance(): ImageDownloadManager {
    if (!ImageDownloadManager.instance) {
      ImageDownloadManager.instance = new ImageDownloadManager();
    }
    return ImageDownloadManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
        try {
          this.kick();
        } catch (error) {
          logger.error(
            ENABLE_LOGGING,
            'Images downloads background task failed:',
            error
          );
        }
      });
    } catch (e) {
      void e;
    }

    this.initialized = true;

    await this.recomputeQueue();
    this.kick();

    this.startWatchers().catch(err =>
      logger.warn(ENABLE_LOGGING, 'Image watchers error:', err)
    );
  }

  public async shutdown(): Promise<void> {
    this.initialized = false;
    this.isProcessing = false;
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

    const rows = await powerSyncSystem.getAll(
      `SELECT COUNT(1) AS c FROM images_download_queue WHERE status = 'queued'`
    );
    const queuedCount = Number(rows?.[0]?.['c'] ?? 0);
    if (queuedCount === 0 && this.activeCount === 0) {
      return false;
    }

    // Network gating
    try {
      const { networkService } = await import('@/shared/services/network');
      const online = await networkService.checkOnlineCapabilities();
      if (!online) {
        await this.delay(5000);
        return false;
      }
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'Images: network check failed, proceeding cautiously',
        e
      );
    }

    const availableSlots = Math.max(0, this.maxConcurrency - this.activeCount);
    if (availableSlots <= 0) return false;

    const startedTag = new Date().toISOString();
    await powerSyncSystem.execute(
      `UPDATE images_download_queue
       SET status = 'active', started_at = ?
       WHERE id IN (
         SELECT id FROM images_download_queue
         WHERE status = 'queued'
         ORDER BY priority DESC, enqueued_at ASC
         LIMIT ?
       )`,
      [startedTag, availableSlots]
    );

    const items = (await powerSyncSystem.getAll(
      `SELECT id, image_id, set_id, file_size_bytes, priority
       FROM images_download_queue
       WHERE status = 'active' AND started_at = ?
       ORDER BY priority DESC, enqueued_at ASC`,
      [startedTag]
    )) as QueueItem[];

    if (items.length === 0) return false;

    const seen = new Set<string>();
    const uniqueItems = items.filter(it => {
      if (seen.has(it.image_id)) return false;
      seen.add(it.image_id);
      return true;
    });

    for (const item of uniqueItems) {
      this.activeCount++;
      this.downloadItem(item)
        .catch(err =>
          logger.error(ENABLE_LOGGING, 'Image download failed:', {
            id: item.id,
            err,
          })
        )
        .finally(() => {
          this.activeCount--;
        });
    }

    return true;
  }

  private async downloadItem(item: QueueItem): Promise<void> {
    await this.markQueueStatus(item.id, 'active');

    // Skip if already completed
    const existingRows = await powerSyncSystem.getAll(
      `SELECT download_status FROM images_downloads WHERE image_id = ?`,
      [item.image_id]
    );
    const existing = existingRows[0] as
      | { download_status?: string }
      | undefined;
    if (existing?.download_status === 'completed') {
      await this.markQueueStatus(item.id, 'completed');
      return;
    }

    const localDir = await this.ensureImagesDir(item.set_id || undefined);

    // Get image info to determine proper file extension
    const imageInfoRows = await powerSyncSystem.getAll(
      'SELECT file_type, original_filename FROM images WHERE id = ?',
      [item.image_id]
    );

    const imageInfo = imageInfoRows[0] as
      | { file_type?: string; original_filename?: string }
      | undefined;

    // Determine file extension - prefer file_type, fallback to extracting from original_filename
    let extension = '';
    if (imageInfo?.file_type) {
      extension = imageInfo.file_type.startsWith('.')
        ? imageInfo.file_type
        : `.${imageInfo.file_type}`;
    } else if (imageInfo?.original_filename) {
      const lastDot = imageInfo.original_filename.lastIndexOf('.');
      if (lastDot > 0) {
        extension = imageInfo.original_filename.substring(lastDot);
      }
    }

    const localPath = `${item.image_id}${extension}`;

    // Signed URL: fetch using image_id
    let signedUrl: string | null = await this.maybeGetCachedSignedUrl(
      `${item.image_id}`
    );
    if (!signedUrl) {
      const signedMap = await getImageSignedUrlsById([item.image_id]);
      const fresh = signedMap[item.image_id];
      if (!fresh) throw new Error('Missing signed URL for image');
      signedUrl = fresh;
      await this.cacheSignedUrl(item.id, `${item.image_id}`, fresh, 6);
    }

    try {
      const res = await downloadToFile(
        signedUrl as string,
        localDir + localPath,
        progress => {
          const progressRatio =
            progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : 0;
          this.updateProgress(
            item.image_id,
            progress.totalBytesWritten,
            progress.totalBytesExpectedToWrite,
            progressRatio
          ).catch(err =>
            logger.warn(ENABLE_LOGGING, 'Image progress update failed', err)
          );
        }
      );

      if (res && res.status === 200) {
        await this.onDownloadSuccess(
          item,
          localDir + localPath,
          item.file_size_bytes
        );
      } else {
        throw new Error(`HTTP ${res?.status ?? 'unknown'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      await this.onDownloadFailure(item, message);
    }
  }

  private async updateProgress(
    imageId: string,
    downloadedBytes: number,
    totalBytes: number,
    progress: number
  ) {
    const ts = new Date().toISOString();
    const exists = await powerSyncSystem.getAll(
      `SELECT id FROM images_downloads WHERE image_id = ?`,
      [imageId]
    );

    if (exists.length > 0) {
      await powerSyncSystem.execute(
        `UPDATE images_downloads SET progress = ?, downloaded_bytes = ?, file_size_bytes = ?, updated_at = ? WHERE image_id = ?`,
        [progress, downloadedBytes, totalBytes, ts, imageId]
      );
    } else {
      await powerSyncSystem.execute(
        `INSERT INTO images_downloads (
          id, image_id, set_id, local_file_path,
          download_status, progress, downloaded_bytes, file_size_bytes,
          created_at, updated_at
        ) VALUES (?, ?, NULL, '', 'downloading', ?, ?, ?, ?, ?)`,
        [generateUUID(), imageId, progress, downloadedBytes, totalBytes, ts, ts]
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
      `SELECT id FROM images_downloads WHERE image_id = ? LIMIT 1`,
      [item.image_id]
    );

    if (exists.length > 0) {
      await powerSyncSystem.execute(
        `UPDATE images_downloads
         SET local_file_path = ?, set_id = COALESCE(set_id, ?), download_status = 'completed',
             progress = 1.0, downloaded_bytes = ?, file_size_bytes = ?, downloaded_at = ?, updated_at = ?
         WHERE image_id = ?`,
        [
          relativePath,
          item.set_id,
          fileSizeBytes ?? 0,
          fileSizeBytes ?? 0,
          ts,
          ts,
          item.image_id,
        ]
      );
    } else {
      await powerSyncSystem.execute(
        `INSERT INTO images_downloads (
          id, image_id, set_id, local_file_path, download_status,
          progress, downloaded_bytes, file_size_bytes, downloaded_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'completed', 1.0, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          item.image_id,
          item.set_id,
          relativePath,
          fileSizeBytes ?? 0,
          fileSizeBytes ?? 0,
          ts,
          ts,
          ts,
        ]
      );
    }

    await powerSyncSystem.execute(
      `DELETE FROM images_download_queue WHERE id = ?`,
      [item.id]
    );
  }

  private async onDownloadFailure(item: QueueItem, message: string) {
    await powerSyncSystem.execute(
      `UPDATE images_downloads
       SET download_status = 'failed', error_message = ?, retry_count = COALESCE(retry_count, 0) + 1, last_attempt_at = ?, updated_at = ?
       WHERE image_id = ?`,
      [
        message,
        new Date().toISOString(),
        new Date().toISOString(),
        item.image_id,
      ]
    );

    const retryRows = await powerSyncSystem.getAll(
      `SELECT retry_count FROM images_downloads WHERE image_id = ?`,
      [item.image_id]
    );
    const { retry_count } = (retryRows[0] as { retry_count?: number }) || {};

    if ((retry_count ?? 0) < 3) {
      await powerSyncSystem.execute(
        `UPDATE images_download_queue SET status = 'queued', error_message = ?, started_at = NULL WHERE id = ?`,
        [message, item.id]
      );
      await this.delay(1000 * Math.pow(2, retry_count ?? 0));
    } else {
      await powerSyncSystem.execute(
        `UPDATE images_download_queue SET status = 'failed', error_message = ? WHERE id = ?`,
        [message, item.id]
      );
    }
  }

  private async startWatchers(): Promise<void> {
    // TODO: Once UX for selecting sets is finalized, we may need to watch additional preference tables.
    const imageSetsStream = await powerSyncSystem.watch(
      `SELECT set_id FROM user_saved_image_sets`
    );
    const imagesStream = await powerSyncSystem.watch(`SELECT id FROM images`);

    const consumeSets = async () => {
      try {
        for await (const _row of imageSetsStream as AsyncIterable<unknown>) {
          void _row;
          if (this.recomputing) this.recomputePending = true;
          else await this.recomputeQueue();
        }
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          'Images: saved image_sets watcher ended',
          e
        );
      }
    };

    const consumeImages = async () => {
      try {
        for await (const _row of imagesStream as AsyncIterable<unknown>) {
          void _row;
          if (this.recomputing) this.recomputePending = true;
          else await this.recomputeQueue();
        }
      } catch (e) {
        logger.warn(ENABLE_LOGGING, 'Images: images watcher ended', e);
      }
    };

    consumeSets();
    consumeImages();
  }

  private async recomputeQueue(): Promise<void> {
    if (this.recomputing) {
      this.recomputePending = true;
      return;
    }
    this.recomputing = true;
    try {
      // Restrict to images from the user's saved image sets
      const setRows = await powerSyncSystem.getAll(
        `SELECT set_id FROM user_saved_image_sets`
      );
      const setIds = (setRows as Array<{ set_id: string }>).map(r => r.set_id);
      if (setIds.length === 0) return;
      const placeholders = setIds.map(() => '?').join(',');
      const rows = await powerSyncSystem.getAll(
        `SELECT id AS image_id, set_id
         FROM images
         WHERE set_id IN (${placeholders})
           AND object_key IS NOT NULL AND object_key <> ''
           AND publish_status = 'published' AND deleted_at IS NULL`,
        setIds
      );

      for (const row of rows as Array<{
        image_id: string;
        set_id: string | null;
      }>) {
        const priority = 10;
        await powerSyncSystem.execute(
          `INSERT INTO images_download_queue (
            id, image_id, set_id, file_size_bytes, priority, enqueued_at, status
          )
          SELECT ?, ?, ?, NULL, ?, ?, 'queued'
          WHERE NOT EXISTS (
            SELECT 1 FROM images_downloads WHERE image_id = ? AND download_status = 'completed'
          )
          AND NOT EXISTS (
            SELECT 1 FROM images_download_queue WHERE image_id = ? AND status IN ('queued','active','paused')
          )`,
          [
            generateUUID(),
            row.image_id,
            row.set_id,
            priority,
            new Date().toISOString(),
            row.image_id,
            row.image_id,
          ]
        );
      }

      await powerSyncSystem.execute(
        `DELETE FROM images_download_queue
         WHERE status = 'queued' AND id NOT IN (
           SELECT MIN(id) FROM images_download_queue WHERE status = 'queued' GROUP BY image_id
         )`
      );

      this.kick();
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Images: recomputeQueue failed', error);
    } finally {
      this.recomputing = false;
      if (this.recomputePending) {
        this.recomputePending = false;
        void this.recomputeQueue();
      }
    }
  }

  public async prioritizeImage(imageId: string): Promise<void> {
    if (!imageId) return;
    const ts = new Date().toISOString();
    await powerSyncSystem.execute(
      `UPDATE images_download_queue SET priority = 1000, enqueued_at = COALESCE(enqueued_at, ?) WHERE image_id = ? AND status IN ('queued','paused')`,
      [ts, imageId]
    );
    await powerSyncSystem.execute(
      `INSERT INTO images_download_queue (id, image_id, set_id, file_size_bytes, priority, enqueued_at, status)
       SELECT ?, img.id, img.set_id, NULL, 1000, ?, 'queued'
       FROM images img
       WHERE img.id = ? AND img.object_key IS NOT NULL AND img.object_key <> ''
       AND NOT EXISTS (
         SELECT 1 FROM images_download_queue dq WHERE dq.image_id = img.id AND dq.status IN ('queued','active','paused')
       )
       AND NOT EXISTS (
         SELECT 1 FROM images_downloads d WHERE d.image_id = img.id AND d.download_status = 'completed'
       )`,
      [generateUUID(), ts, imageId]
    );
    this.kick();
  }

  public async prioritizeSet(setId: string): Promise<void> {
    if (!setId) return;
    const ts = new Date().toISOString();
    await powerSyncSystem.execute(
      `UPDATE images_download_queue SET priority = 1000, enqueued_at = COALESCE(enqueued_at, ?) WHERE set_id = ? AND status IN ('queued','paused')`,
      [ts, setId]
    );
    await powerSyncSystem.execute(
      `INSERT INTO images_download_queue (id, image_id, set_id, file_size_bytes, priority, enqueued_at, status)
       SELECT ?, img.id, img.set_id, NULL, 1000, ?, 'queued'
       FROM images img
       WHERE img.set_id = ? AND img.object_key IS NOT NULL AND img.object_key <> ''
       AND NOT EXISTS (
         SELECT 1 FROM images_download_queue dq WHERE dq.image_id = img.id AND dq.status IN ('queued','active','paused')
       )
       AND NOT EXISTS (
         SELECT 1 FROM images_downloads d WHERE d.image_id = img.id AND d.download_status = 'completed'
       )`,
      [generateUUID(), ts, setId]
    );
    this.kick();
  }

  public async resolveImageUrl(imageId: string): Promise<string | null> {
    const rows = await powerSyncSystem.getAll(
      `SELECT img.object_key, d.local_file_path, d.download_status
       FROM images img
       LEFT JOIN images_downloads d ON d.image_id = img.id
       WHERE img.id = ?
       LIMIT 1`,
      [imageId]
    );
    const row = rows[0] as
      | {
          object_key?: string | null;
          local_file_path?: string | null;
          download_status?: string | null;
        }
      | undefined;
    const key = (row?.object_key || '').toLowerCase();
    const isSvg = key.endsWith('.svg');
    if (!isSvg && row?.download_status === 'completed' && row.local_file_path) {
      // Convert relative path to absolute path for file:// URL
      return this.getAbsolutePath(row.local_file_path);
    }
    // Otherwise, sign by id
    const signedMap = await getImageSignedUrlsById([imageId]);
    return signedMap[imageId] ?? null;
  }

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
      `UPDATE images_download_queue SET ${sets} WHERE id = ?`,
      params
    );
  }

  private async ensureImagesDir(setId?: string): Promise<string> {
    const base =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const dir = `${base}downloads/images${setId ? '/' + setId : ''}/`;
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

  private async maybeGetCachedSignedUrl(
    imageId: string
  ): Promise<string | null> {
    const rows = await powerSyncSystem.getAll(
      `SELECT signed_url, signed_url_expires_at FROM images_download_queue WHERE image_id = ? AND signed_url IS NOT NULL ORDER BY enqueued_at DESC LIMIT 1`,
      [imageId]
    );
    const row = rows[0] as
      | { signed_url?: string; signed_url_expires_at?: string }
      | undefined;
    if (!row?.signed_url) return null;
    if (row.signed_url_expires_at) {
      const expires = new Date(row.signed_url_expires_at).getTime();
      if (Date.now() >= expires - 60_000) {
        return null;
      }
    }
    return row.signed_url ?? null;
  }

  private async cacheSignedUrl(
    queueId: string,
    imageId: string,
    signedUrl: string,
    hours: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await powerSyncSystem.execute(
      `UPDATE images_download_queue SET signed_url = ?, signed_url_expires_at = ? WHERE id = ? AND image_id = ?`,
      [signedUrl, expiresAt, queueId, imageId]
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const imageDownloadManager = ImageDownloadManager.getInstance();
export default ImageDownloadManager;
