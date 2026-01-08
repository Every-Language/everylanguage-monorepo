import { supabase } from '@/shared/services/api/supabase';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

type GetUrlsByIdResponse = {
  success: boolean;
  data?: {
    success: boolean;
    expiresIn: number;
    media?: Record<string, string>;
    images?: Record<string, string>;
    errors?: Record<string, string>;
  };
  // Legacy format fallback
  expiresIn?: number;
  media?: Record<string, string>;
  images?: Record<string, string>;
  errors?: Record<string, string>;
};

async function invokeWithRetry<T>(
  functionName: string,
  body: Record<string, unknown>,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke<T>(functionName, {
        body,
      });
      if (error) throw error;
      if (!data) throw new Error('No data returned from Edge Function');

      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        logger.info(
          ENABLE_LOGGING,
          `URL fetch succeeded on retry attempt ${attempt + 1}`,
          {
            functionName,
          }
        );
      }

      return data;
    } catch (err) {
      lastError = err;
      const error = err as Error;

      // Log retry attempts
      if (attempt < maxRetries) {
        logger.warn(
          ENABLE_LOGGING,
          `URL fetch failed, retrying attempt ${attempt + 1}/${maxRetries + 1}`,
          {
            functionName,
            error: error.message,
          }
        );
      } else {
        logger.error(
          ENABLE_LOGGING,
          `URL fetch failed after ${maxRetries + 1} attempts`,
          {
            functionName,
            error: error.message,
          }
        );
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) break;

      // Exponential backoff: 500ms, 1s, 2s
      const delay = 500 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function getMediaSignedUrlsById(
  mediaFileIds: string[],
  expirationHours = 6
): Promise<Record<string, string>> {
  const data = await invokeWithRetry<GetUrlsByIdResponse>(
    'get-download-urls-by-id',
    {
      mediaFileIds,
      expirationHours,
    }
  );

  // Handle nested response structure: data.data.media instead of data.media
  const responseData = data?.data || data;
  if (!responseData?.success) throw new Error('URL signing failed');

  return responseData.media ?? {};
}

export async function getImageSignedUrlsById(
  imageIds: string[],
  expirationHours = 6
): Promise<Record<string, string>> {
  const data = await invokeWithRetry<GetUrlsByIdResponse>(
    'get-download-urls-by-id',
    {
      imageIds,
      expirationHours,
    }
  );

  // Handle nested response structure: data.data.images instead of data.images
  const responseData = data?.data || data;
  if (!responseData?.success) throw new Error('URL signing failed');

  return responseData.images ?? {};
}

export async function maybeGetCachedMediaSignedUrl(
  mediaFileId: string
): Promise<string | null> {
  const rows = await powerSyncSystem.getAll(
    `SELECT signed_url, signed_url_expires_at FROM download_queue WHERE media_file_id = ? AND signed_url IS NOT NULL`,
    [mediaFileId]
  );
  const row = rows[0] as
    | { signed_url?: string; signed_url_expires_at?: string }
    | undefined;
  if (!row?.signed_url) return null;
  if (row.signed_url_expires_at) {
    const expires = new Date(row.signed_url_expires_at).getTime();
    if (Date.now() >= expires - 60_000) return null;
  }
  return row.signed_url ?? null;
}

export async function cacheMediaSignedUrl(
  mediaFileId: string,
  signedUrl: string,
  expiresInHours: number
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + expiresInHours * 3600 * 1000
  ).toISOString();
  await powerSyncSystem.execute(
    `UPDATE download_queue SET signed_url = ?, signed_url_expires_at = ? WHERE media_file_id = ?`,
    [signedUrl, expiresAt, mediaFileId]
  );
}

export async function maybeGetCachedImageSignedUrl(
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
    if (Date.now() >= expires - 60_000) return null;
  }
  return row.signed_url ?? null;
}

export async function cacheImageSignedUrl(
  queueId: string,
  signedUrl: string,
  hours: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  await powerSyncSystem.execute(
    `UPDATE images_download_queue SET signed_url = ?, signed_url_expires_at = ? WHERE id = ?`,
    [signedUrl, expiresAt, queueId]
  );
}
