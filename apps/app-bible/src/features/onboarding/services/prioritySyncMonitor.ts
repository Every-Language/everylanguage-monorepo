import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = true;

export interface SyncProgress {
  phase: 'connecting' | 'syncing' | 'complete';
  progress: number; // 0-1
  message: string;
  priority1Complete: boolean;
  verseTextsCount?: number;
  mediaFilesCount?: number;
}

export interface PrioritySyncMonitorOptions {
  checkInterval?: number; // milliseconds between checks
  timeout?: number; // maximum time to wait (milliseconds)
  userId: string;
}

/**
 * Monitors PowerSync sync progress, specifically tracking when priority 1 buckets
 * (verse_texts and media_files) have completed syncing.
 */
export class PrioritySyncMonitor {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(progress: SyncProgress) => void> = [];
  private options: Required<PrioritySyncMonitorOptions>;
  private startTime: number = 0;

  constructor(options: PrioritySyncMonitorOptions) {
    this.options = {
      checkInterval: options.checkInterval ?? 1000, // Check every second
      timeout: options.timeout ?? 30000, // 30 second timeout
      userId: options.userId,
    };
  }

  /**
   * Check if PowerSync is connected and syncing
   */
  private isPowerSyncReady(): boolean {
    if (!powerSyncSystem.isInitialized) {
      return false;
    }

    const status = powerSyncSystem.getStatus();
    return status.connected === true;
  }

  /**
   * Check if priority 1 data (verse_texts and media_files) exists in local database
   */
  private async checkPriority1SyncComplete(): Promise<{
    complete: boolean;
    verseTextsCount: number;
    mediaFilesCount: number;
  }> {
    if (!powerSyncSystem.isInitialized) {
      return { complete: false, verseTextsCount: 0, mediaFilesCount: 0 };
    }

    try {
      // Check if user has saved versions
      const [savedTextVersions, savedAudioVersions] = await Promise.all([
        powerSyncSystem.getAll(
          `SELECT text_version_id FROM user_saved_text_versions WHERE user_id = ?`,
          [this.options.userId]
        ),
        powerSyncSystem.getAll(
          `SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?`,
          [this.options.userId]
        ),
      ]);

      const hasTextVersions = savedTextVersions.length > 0;
      const hasAudioVersions = savedAudioVersions.length > 0;

      // If user has no saved versions, priority 1 is "complete" (nothing to sync)
      if (!hasTextVersions && !hasAudioVersions) {
        return { complete: true, verseTextsCount: 0, mediaFilesCount: 0 };
      }

      // Check if verse_texts exist for saved text versions
      let verseTextsCount = 0;
      if (hasTextVersions) {
        const textVersionIds = savedTextVersions.map(
          (v: Record<string, unknown>) => v['text_version_id'] as string
        );
        if (textVersionIds.length > 0) {
          const placeholders = textVersionIds.map(() => '?').join(',');
          const verseTextsResult = await powerSyncSystem.getAll(
            `SELECT COUNT(DISTINCT id) as count FROM verse_texts WHERE text_version_id IN (${placeholders})`,
            textVersionIds
          );
          verseTextsCount = Number(verseTextsResult[0]?.['count'] ?? 0);
        }
      }

      // Check if media_files exist for saved audio versions
      let mediaFilesCount = 0;
      if (hasAudioVersions) {
        const audioVersionIds = savedAudioVersions.map(
          (v: Record<string, unknown>) => v['audio_version_id'] as string
        );
        if (audioVersionIds.length > 0) {
          const placeholders = audioVersionIds.map(() => '?').join(',');
          const mediaFilesResult = await powerSyncSystem.getAll(
            `SELECT COUNT(DISTINCT id) as count FROM media_files 
             WHERE audio_version_id IN (${placeholders}) 
             AND publish_status = 'published' 
             AND deleted_at IS NULL`,
            audioVersionIds
          );
          mediaFilesCount = Number(mediaFilesResult[0]?.['count'] ?? 0);
        }
      }

      // Priority 1 is complete if:
      // 1. User has no saved versions, OR
      // 2. User has saved versions AND the corresponding data exists
      const textComplete = !hasTextVersions || verseTextsCount > 0;
      const audioComplete = !hasAudioVersions || mediaFilesCount > 0;
      const complete = textComplete && audioComplete;

      logger.info(ENABLE_LOGGING, `[PrioritySyncMonitor] Priority 1 check:`, {
        complete,
        hasTextVersions,
        hasAudioVersions,
        verseTextsCount,
        mediaFilesCount,
      });

      return { complete, verseTextsCount, mediaFilesCount };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PrioritySyncMonitor] Error checking priority 1 sync:',
        error
      );
      return { complete: false, verseTextsCount: 0, mediaFilesCount: 0 };
    }
  }

  /**
   * Get current sync progress
   */
  async checkProgress(): Promise<SyncProgress> {
    // Step 1: Check connection
    if (!this.isPowerSyncReady()) {
      return {
        phase: 'connecting',
        progress: 0,
        message: 'Connecting to server...',
        priority1Complete: false,
      };
    }

    // Step 2: Check if any sync has occurred
    const status = powerSyncSystem.getStatus();
    if (!status.status?.lastSyncedAt) {
      const elapsed = Date.now() - this.startTime;
      // Show progress based on time elapsed, but cap at 15% until sync starts
      const timeBasedProgress = Math.min((elapsed / 5000) * 0.15, 0.15);
      return {
        phase: 'syncing',
        progress: timeBasedProgress,
        message: 'Starting sync...',
        priority1Complete: false,
      };
    }

    // Step 3: Verify priority 1 data exists
    const { complete, verseTextsCount, mediaFilesCount } =
      await this.checkPriority1SyncComplete();

    // Step 4: Estimate overall progress
    // If complete, show 100%, otherwise show estimated progress based on time elapsed
    const elapsed = Date.now() - this.startTime;
    let estimatedProgress = Math.min(
      complete ? 1.0 : 0.3 + (elapsed / this.options.timeout) * 0.6,
      0.95
    );

    // If we have data counts, use them to estimate progress
    if (!complete && verseTextsCount !== undefined && verseTextsCount > 0) {
      // If we have some data, we're making progress
      estimatedProgress = Math.max(estimatedProgress, 0.4);
    }

    // Determine message based on progress
    let message = 'Downloading essential content...';
    if (complete) {
      message = 'Essential content ready';
    } else if (estimatedProgress >= 0.9) {
      message = 'Almost done...';
    } else if (estimatedProgress >= 0.5) {
      message = 'Downloading content...';
    } else if (estimatedProgress >= 0.2) {
      message = 'Syncing data...';
    }

    return {
      phase: complete ? 'complete' : 'syncing',
      progress: complete ? 1.0 : estimatedProgress,
      message,
      priority1Complete: complete,
      verseTextsCount,
      mediaFilesCount,
    };
  }

  /**
   * Start monitoring sync progress
   */
  startMonitoring(): void {
    this.stopMonitoring();
    this.startTime = Date.now();

    const check = async () => {
      try {
        const progress = await this.checkProgress();
        this.listeners.forEach(listener => {
          try {
            listener(progress);
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[PrioritySyncMonitor] Listener error:',
              error
            );
          }
        });

        // Stop monitoring if complete or timeout
        const elapsed = Date.now() - this.startTime;
        if (progress.priority1Complete || elapsed >= this.options.timeout) {
          this.stopMonitoring();
        }
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          '[PrioritySyncMonitor] Progress check error:',
          error
        );
      }
    };

    // Immediate check
    check();

    // Periodic checks
    this.checkInterval = setInterval(check, this.options.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Wait for priority 1 sync to complete
   * Returns true if complete, false if timeout
   * Starts monitoring immediately
   */
  async waitForPriority1Complete(): Promise<boolean> {
    // Start monitoring immediately to get early progress updates
    this.startMonitoring();

    return new Promise<boolean>(resolve => {
      const unsubscribe = this.subscribe(progress => {
        if (progress.priority1Complete) {
          unsubscribe();
          this.stopMonitoring();
          resolve(true);
        }

        // Check timeout
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= this.options.timeout) {
          unsubscribe();
          this.stopMonitoring();
          resolve(false);
        }
      });
    });
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(listener: (progress: SyncProgress) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}
