import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/api/supabase';
import { resolveTargetUserId } from '@/shared/services/auth/OfflineIdentity';
import { generateUUID } from '@/shared/utils/uuid';
import { PlaylistService } from './PlaylistService';
import type { Database } from '@everylanguage/shared-types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Service for handling playlist image uploads to R2 storage
 */
export class PlaylistImageService {
  /**
   * Upload an image for a playlist
   * @param playlistId The playlist ID to associate the image with
   * @param imageUri The local image URI from expo-image-picker
   * @returns The uploaded image ID
   */
  static async uploadPlaylistImage(
    playlistId: string,
    imageUri: string
  ): Promise<string> {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistImageService] Starting image upload for playlist:',
      playlistId
    );

    try {
      // Step 1: Get session user ID
      const session = await supabase.auth.getSession();
      const sessionUserId = session?.data?.session?.user?.id ?? null;
      const userId = await resolveTargetUserId(sessionUserId);

      // Step 2: Get file info and prepare for upload
      // Extract file extension from URI or default to jpg
      const uriParts = imageUri.split('.');
      const extension =
        uriParts.length > 1 ? (uriParts[uriParts.length - 1] ?? 'jpg') : 'jpg';
      const fileName = `playlist-${playlistId}-${Date.now()}.${extension}`;

      // Determine MIME type from extension
      const mimeTypeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const mimeType = mimeTypeMap[extension.toLowerCase()] || 'image/jpeg';

      // Step 3: Create pending image record in Supabase directly
      // We need to insert directly to Supabase (not PowerSync) because the Edge Function
      // queries Supabase immediately, and PowerSync syncs asynchronously
      const imageId = generateUUID();

      const { data: imageData, error: insertError } = await supabase
        .from('images')
        .insert({
          id: imageId,
          // Type assertion: 'playlist' was added to target_type enum in migration
          // 20251231171838_add_playlist_to_target_type_and_images_rls.sql
          // Types will be correct after TypeScript re-reads updated shared-types
          target_type: 'playlist' as Database['public']['Enums']['target_type'],
          target_id: playlistId,
          set_id: null,
          created_by: userId,
          version: 1,
          publish_status: 'published',
          original_filename: fileName,
          file_type: extension,
        })
        .select('id')
        .single();

      if (insertError || !imageData) {
        throw new Error(
          `Failed to create image record: ${insertError?.message || 'Unknown error'}`
        );
      }

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistImageService] Created pending image record:',
        imageId
      );

      // Step 4: Get presigned upload URL from Edge Function
      const { data: uploadData, error: uploadError } =
        await supabase.functions.invoke('get-upload-urls-by-id', {
          body: {
            imageIds: [imageId],
            expirationHours: 24,
            originalFilenames: {
              [imageId]: fileName,
            },
          },
        });

      if (uploadError) {
        throw new Error(`Failed to get upload URL: ${uploadError.message}`);
      }

      // Handle nested response structure (supabase.functions.invoke wraps in data)
      const functionResponse = uploadData?.data || uploadData;
      if (!functionResponse?.success) {
        throw new Error('Invalid response from upload URL service');
      }

      // Response structure: { success: true, images: Array<{ id, objectKey, uploadUrl, expiresIn }> }
      const imagesArray = functionResponse.images;
      if (!Array.isArray(imagesArray) || imagesArray.length === 0) {
        throw new Error('No images returned from upload URL service');
      }

      const imageInfo = imagesArray.find(
        (img: { id: string; uploadUrl?: string }) => img.id === imageId
      );
      if (!imageInfo?.uploadUrl) {
        throw new Error(`No upload URL returned for image ${imageId}`);
      }

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistImageService] Got upload URL, uploading to R2...'
      );

      // Step 5: Upload file to R2 using presigned PUT URL
      await this.uploadFileToR2(imageInfo.uploadUrl, imageUri, mimeType);

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistImageService] Upload complete, updating playlist image_id'
      );

      // Step 6: Update playlist's image_id
      await PlaylistService.edit(playlistId, { image_id: imageId });

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistImageService] Playlist image upload completed successfully:',
        imageId
      );

      return imageId;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistImageService] Failed to upload playlist image:',
        error
      );
      throw error;
    }
  }

  /**
   * Upload a file to R2 using a presigned PUT URL
   * @param uploadUrl The presigned PUT URL
   * @param fileUri The local file URI from expo-image-picker
   * @param mimeType The MIME type of the file
   */
  private static async uploadFileToR2(
    uploadUrl: string,
    fileUri: string,
    mimeType: string
  ): Promise<void> {
    // In React Native, we need to read the file as a blob first
    const response = await fetch(fileUri);
    if (!response.ok) {
      throw new Error(`Failed to read image file: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Upload to R2 using fetch (React Native compatible)
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `R2 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }
  }

  /**
   * Remove image from playlist (soft delete image and set image_id to null)
   * @param playlistId The playlist ID
   */
  static async removePlaylistImage(playlistId: string): Promise<void> {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistImageService] Removing image from playlist:',
      playlistId
    );

    try {
      // Step 1: Get the current image_id from the playlist
      const playlistResult = await supabase
        .from('playlists')
        .select('image_id')
        .eq('id', playlistId)
        .single();

      if (playlistResult.error) {
        throw new Error(
          `Failed to fetch playlist: ${playlistResult.error.message}`
        );
      }

      const imageId = playlistResult.data?.image_id;

      // Step 2: Soft delete the image if it exists
      if (imageId) {
        const now = new Date().toISOString();
        const { error: deleteError } = await supabase
          .from('images')
          .update({ deleted_at: now })
          .eq('id', imageId);

        if (deleteError) {
          logger.error(
            ENABLE_LOGGING,
            '[PlaylistImageService] Failed to soft delete image:',
            deleteError
          );
          throw new Error(`Failed to delete image: ${deleteError.message}`);
        }

        logger.info(
          ENABLE_LOGGING,
          '[PlaylistImageService] Image soft deleted:',
          imageId
        );
      }

      // Step 3: Set playlist image_id to null
      await PlaylistService.edit(playlistId, { image_id: null });

      logger.info(
        ENABLE_LOGGING,
        '[PlaylistImageService] Image removed from playlist successfully'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistImageService] Failed to remove playlist image:',
        error
      );
      throw error;
    }
  }
}
