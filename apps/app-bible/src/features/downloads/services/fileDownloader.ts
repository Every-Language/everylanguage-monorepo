import * as FileSystem from 'expo-file-system';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

export async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export interface DownloadResult {
  status: number | undefined;
}

export async function downloadToFile(
  url: string,
  localPath: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadResult> {
  // Check if partial file exists and attempt resume
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  let downloadResumable;

  if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
    try {
      // Attempt to resume existing download
      downloadResumable = FileSystem.createDownloadResumable(
        url,
        localPath,
        {},
        progress => {
          onProgress?.({
            totalBytesWritten: progress.totalBytesWritten,
            totalBytesExpectedToWrite: progress.totalBytesExpectedToWrite,
          });
        }
      );

      const res = await downloadResumable.resumeAsync();
      return { status: res?.status };
    } catch (resumeError) {
      logger.warn(
        ENABLE_LOGGING,
        '[fileDownloader] resume failed; restarting fresh',
        resumeError
      );
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
  }

  // Create new download
  downloadResumable = FileSystem.createDownloadResumable(
    url,
    localPath,
    {},
    progress => {
      onProgress?.({
        totalBytesWritten: progress.totalBytesWritten,
        totalBytesExpectedToWrite: progress.totalBytesExpectedToWrite,
      });
    }
  );

  const res = await downloadResumable.downloadAsync();
  return { status: res?.status };
}
