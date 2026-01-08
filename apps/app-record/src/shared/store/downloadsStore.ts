import { create } from 'zustand';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

interface DownloadQueueCounts {
  queued: number;
  active: number;
  completed: number; // completed in queue (removed from queue)
  failed: number;
}

interface DownloadFileCounts {
  totalCompleted: number; // actual files downloaded
  totalFailed: number; // actual files that failed
}

interface DownloadsStoreState extends DownloadQueueCounts {
  // File completion stats (separate from queue stats)
  fileStats: DownloadFileCounts;

  refreshCounts: () => Promise<void>;
  refreshFileStats: () => Promise<void>;
}

export const useDownloadsStore = create<DownloadsStoreState>((set, _get) => ({
  queued: 0,
  active: 0,
  completed: 0,
  failed: 0,
  fileStats: {
    totalCompleted: 0,
    totalFailed: 0,
  },

  refreshCounts: async () => {
    if (!powerSyncSystem.isInitialized) return;

    // Get download queue counts (active queue management)
    const [queuedRows, activeRows, completedRows, failedRows] =
      await Promise.all([
        powerSyncSystem.getAll(
          `SELECT COUNT(1) as c FROM download_queue WHERE status = 'queued'`
        ),
        powerSyncSystem.getAll(
          `SELECT COUNT(1) as c FROM download_queue WHERE status = 'active'`
        ),
        powerSyncSystem.getAll(
          `SELECT COUNT(1) as c FROM download_queue WHERE status = 'completed'`
        ),
        powerSyncSystem.getAll(
          `SELECT COUNT(1) as c FROM download_queue WHERE status = 'failed'`
        ),
      ]);

    type CountRow = { c: number };
    const queuedRow = queuedRows[0] as CountRow | undefined;
    const activeRow = activeRows[0] as CountRow | undefined;
    const completedRow = completedRows[0] as CountRow | undefined;
    const failedRow = failedRows[0] as CountRow | undefined;

    set({
      queued: Number(queuedRow?.c ?? 0),
      active: Number(activeRow?.c ?? 0),
      completed: Number(completedRow?.c ?? 0),
      failed: Number(failedRow?.c ?? 0),
    });
  },

  refreshFileStats: async () => {
    if (!powerSyncSystem.isInitialized) return;

    // Get actual file download statistics
    const [completedFiles, failedFiles] = await Promise.all([
      powerSyncSystem.getAll(
        `SELECT COUNT(1) as c FROM media_files_downloads WHERE download_status = 'completed'`
      ),
      powerSyncSystem.getAll(
        `SELECT COUNT(1) as c FROM media_files_downloads WHERE download_status = 'failed'`
      ),
    ]);

    type CountRow = { c: number };
    const completedRow = completedFiles[0] as CountRow | undefined;
    const failedRow = failedFiles[0] as CountRow | undefined;

    set({
      fileStats: {
        totalCompleted: Number(completedRow?.c ?? 0),
        totalFailed: Number(failedRow?.c ?? 0),
      },
    });
  },
}));
