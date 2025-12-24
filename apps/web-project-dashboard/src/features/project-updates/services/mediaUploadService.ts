import { supabase } from '@/shared/services/supabase';
import type {
  CreateProjectUpdateMediaData,
  MediaFileWithPreview,
} from '../types';

export interface UploadedMedia {
  id: string;
  objectKey: string;
  mediaType: 'image' | 'video';
  originalFilename: string;
  fileType: string;
  fileSize: number;
  caption?: string;
  displayOrder: number;
  durationSeconds?: number;
}

export class ProjectUpdateMediaUploadService {
  /**
   * Create pending media records in the database
   */
  async createPendingMediaRecords(
    projectUpdateId: string,
    files: MediaFileWithPreview[],
    userId: string
  ): Promise<string[]> {
    const pendingIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaData: CreateProjectUpdateMediaData = {
        project_update_id: projectUpdateId,
        media_type: file.mediaType,
        object_key: '', // Will be set after upload
        storage_provider: 'r2',
        original_filename: file.file.name,
        file_type: file.file.type || null,
        file_size: file.file.size,
        caption: file.caption || null,
        display_order: file.displayOrder,
        duration_seconds: file.durationSeconds || null,
        created_by: userId,
      };

      const { data, error } = await (
        supabase as unknown as {
          from: (table: string) => {
            insert: (data: unknown[]) => {
              select: (columns: string) => {
                single: () => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        }
      )
        .from('project_updates_media')
        .insert([mediaData])
        .select('id')
        .single();

      if (error) {
        const errorMessage =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';
        throw new Error(
          `Failed to create pending media record: ${errorMessage}`
        );
      }

      if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error('No valid data returned from media insert');
      }

      pendingIds.push(String((data as { id: unknown }).id));
    }

    return pendingIds;
  }

  /**
   * Get presigned upload URLs for media files
   */
  async getUploadUrls(
    mediaIds: string[],
    originalFilenames: Record<string, string>
  ): Promise<Map<string, { uploadUrl: string; objectKey: string }>> {
    const requestBody = {
      projectUpdatesMediaIds: mediaIds,
      expirationHours: 24,
      originalFilenames,
    };

    const { data, error } = await supabase.functions.invoke(
      'get-upload-urls-by-id',
      {
        body: requestBody,
      }
    );

    if (error) {
      console.error('Failed to get upload URLs:', error);
      throw new Error(`Failed to get upload URLs: ${error.message}`);
    }

    const functionResponse = data?.data;
    if (!functionResponse) {
      console.error('Invalid response format from Edge function:', data);
      throw new Error('Invalid response format from Edge function');
    }

    const response = functionResponse as {
      success: boolean;
      projectUpdatesMedia?: Array<{
        id: string;
        objectKey: string;
        uploadUrl: string;
      }>;
      errors?: Record<string, string>;
    };

    if (!response.success || !response.projectUpdatesMedia) {
      const errorDetails = Object.entries(response.errors || {})
        .map(([id, error]) => `${id}: ${error}`)
        .join('; ');
      console.error('Failed to get upload URLs:', errorDetails);
      throw new Error(`Failed to get upload URLs: ${errorDetails}`);
    }

    const urlMap = new Map<string, { uploadUrl: string; objectKey: string }>();
    response.projectUpdatesMedia.forEach(m => {
      urlMap.set(m.id, { uploadUrl: m.uploadUrl, objectKey: m.objectKey });
    });

    return urlMap;
  }

  /**
   * Upload a single file to R2
   */
  async uploadFile(file: File, uploadUrl: string): Promise<void> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        const responseText = await response
          .text()
          .catch(() => 'Unable to read response');
        console.error('Upload failed:', {
          fileName: file.name,
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText,
        });
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Upload failed: ${String(error)}`);
    }
  }

  /**
   * Upload multiple media files
   */
  async uploadMediaFiles(
    files: MediaFileWithPreview[],
    urlMap: Map<string, { uploadUrl: string; objectKey: string }>,
    mediaIds: string[]
  ): Promise<void> {
    const uploadPromises = files.map(async (file, index) => {
      const mediaId = mediaIds[index];
      const urlInfo = urlMap.get(mediaId);

      if (!urlInfo) {
        throw new Error(`No upload URL found for media ID: ${mediaId}`);
      }

      await this.uploadFile(file.file, urlInfo.uploadUrl);
    });

    await Promise.all(uploadPromises);
  }

  /**
   * Complete media upload flow
   */
  async uploadMedia(
    projectUpdateId: string,
    files: MediaFileWithPreview[],
    userId: string
  ): Promise<UploadedMedia[]> {
    if (files.length === 0) {
      return [];
    }

    // Step 1: Create pending records
    const mediaIds = await this.createPendingMediaRecords(
      projectUpdateId,
      files,
      userId
    );

    // Step 2: Get upload URLs
    const originalFilenames: Record<string, string> = {};
    files.forEach((file, index) => {
      originalFilenames[mediaIds[index]] = file.file.name;
    });

    const urlMap = await this.getUploadUrls(mediaIds, originalFilenames);

    // Step 3: Upload files
    await this.uploadMediaFiles(files, urlMap, mediaIds);

    // Step 4: Return uploaded media info
    return files.map((file, index) => {
      const mediaId = mediaIds[index];
      const urlInfo = urlMap.get(mediaId)!;
      return {
        id: mediaId,
        objectKey: urlInfo.objectKey,
        mediaType: file.mediaType,
        originalFilename: file.file.name,
        fileType: file.file.type || '',
        fileSize: file.file.size,
        caption: file.caption,
        displayOrder: file.displayOrder,
        durationSeconds: file.durationSeconds,
      };
    });
  }
}
