import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { R2StorageService } from '../_shared/r2-storage-service.ts';
import { StorageUtils } from '../_shared/storage-utils.ts';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';

interface RequestBody {
  mediaFileIds?: string[];
  imageIds?: string[];
  projectUpdatesMediaIds?: string[];
  expirationHours?: number;
  originalFilenames?: Record<string, string>;
}

interface UrlInfo {
  id: string;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
}

interface BatchUploadUrlsResult {
  success: boolean;
  media?: UrlInfo[];
  images?: UrlInfo[];
  projectUpdatesMedia?: UrlInfo[];
  errors?: Record<string, string>;
}

interface UpdateData {
  object_key: string;
  storage_provider: string;
  original_filename?: string;
  file_type?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate the request - only logged-in users can request upload URLs
    const authCtx = await authenticateRequest(req);
    if (isAuthError(authCtx)) {
      return createAuthErrorResponse(authCtx);
    }

    const { publicUserId } = authCtx;

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const {
      mediaFileIds = [],
      imageIds = [],
      projectUpdatesMediaIds = [],
      expirationHours = 24,
      originalFilenames = {},
    } = body;
    if (
      mediaFileIds.length === 0 &&
      imageIds.length === 0 &&
      projectUpdatesMediaIds.length === 0
    ) {
      return createErrorResponse(
        'Provide mediaFileIds, imageIds, and/or projectUpdatesMediaIds',
        400
      );
    }

    // Use service role key for database operations
    // The user is authenticated above, but we need elevated privileges to update records
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const r2 = new R2StorageService();
    const expiresInSeconds = Math.min(Math.max(1, expirationHours), 24) * 3600;

    const errors: Record<string, string> = {};
    const media: UrlInfo[] = [];
    const images: UrlInfo[] = [];
    const projectUpdatesMedia: UrlInfo[] = [];

    // Helper to allocate object key (existing or new)
    const ensureKey = (
      existing: string | null,
      id: string,
      dbOriginalFilename: string | null | undefined,
      folder: 'media' | 'images'
    ): string => {
      if (existing && existing.length > 0) {
        return existing;
      }

      // Use filename from request mapping, fall back to DB value
      const originalFilename = originalFilenames[id] ?? dbOriginalFilename;

      // Generate clean object key with UUID and folder structure
      return StorageUtils.generateCleanObjectKey(
        originalFilename || undefined,
        folder
      );
    };

    if (mediaFileIds.length > 0) {
      const { data, error } = await supabase
        .from('media_files')
        .select('id, object_key, original_filename, file_type, created_by')
        .in('id', mediaFileIds);
      if (error) {
        return createErrorResponse(`DB error: ${error.message}`, 500);
      }

      // Authorization check: verify all requested media files belong to the authenticated user
      const unauthorizedFiles = (data ?? []).filter(
        row => row.created_by !== publicUserId
      );
      if (unauthorizedFiles.length > 0) {
        return createErrorResponse(
          `Not authorized to upload to ${unauthorizedFiles.length} media file(s)`,
          403
        );
      }

      for (const row of data ?? []) {
        try {
          // Use existing object_key if available, otherwise generate new one
          const objectKey = ensureKey(
            row.object_key,
            row.id,
            row.original_filename,
            'media'
          );
          const uploadUrl = await r2.getPresignedPutUrl(
            objectKey,
            expiresInSeconds
          );

          // Prepare update data - only update what's needed
          const updateData: UpdateData = {
            object_key: objectKey,
            storage_provider: 'r2',
          };

          // If we have new original_filename from request mapping, use it
          const requestFilename = originalFilenames[row.id];
          if (requestFilename && !row.original_filename) {
            updateData.original_filename = requestFilename;
            updateData.file_type =
              StorageUtils.extractFileExtension(requestFilename);
          }

          // Persist object_key, provider, and metadata for future fetches
          await supabase
            .from('media_files')
            .update(updateData)
            .eq('id', row.id);

          media.push({
            id: row.id,
            objectKey,
            uploadUrl,
            expiresIn: expiresInSeconds,
          });
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
    }

    if (imageIds.length > 0) {
      const { data, error } = await supabase
        .from('images')
        .select('id, object_key, original_filename, file_type, created_by')
        .in('id', imageIds);
      if (error) {
        return createErrorResponse(`DB error: ${error.message}`, 500);
      }

      // Authorization check: verify all requested images belong to the authenticated user
      const unauthorizedImages = (data ?? []).filter(
        row => row.created_by !== publicUserId
      );
      if (unauthorizedImages.length > 0) {
        return createErrorResponse(
          `Not authorized to upload to ${unauthorizedImages.length} image(s)`,
          403
        );
      }

      for (const row of data ?? []) {
        try {
          // Use existing object_key if available, otherwise generate new one
          const objectKey = ensureKey(
            row.object_key,
            row.id,
            row.original_filename,
            'images'
          );
          const uploadUrl = await r2.getPresignedPutUrl(
            objectKey,
            expiresInSeconds
          );

          // Prepare update data - only update what's needed
          const updateData: UpdateData = {
            object_key: objectKey,
            storage_provider: 'r2',
          };

          // If we have new original_filename from request mapping, use it
          const requestFilename = originalFilenames[row.id];
          if (requestFilename && !row.original_filename) {
            updateData.original_filename = requestFilename;
            updateData.file_type =
              StorageUtils.extractFileExtension(requestFilename);
          }

          // Persist object_key, provider, and metadata for future fetches
          await supabase.from('images').update(updateData).eq('id', row.id);

          images.push({
            id: row.id,
            objectKey,
            uploadUrl,
            expiresIn: expiresInSeconds,
          });
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
    }

    if (projectUpdatesMediaIds.length > 0) {
      const { data, error } = await supabase
        .from('project_updates_media')
        .select(
          'id, object_key, original_filename, file_type, created_by, project_update_id'
        )
        .in('id', projectUpdatesMediaIds);
      if (error) {
        return createErrorResponse(`DB error: ${error.message}`, 500);
      }

      // Authorization check: verify user has project.write permission for the update's project
      for (const row of data ?? []) {
        // Check if user has permission via project_updates
        const { data: updateData, error: updateError } = await supabase
          .from('project_updates')
          .select('project_id, deleted_at')
          .eq('id', row.project_update_id)
          .single();

        if (updateError || !updateData || updateData.deleted_at) {
          errors[row.id] = 'Project update not found or deleted';
          continue;
        }

        // Check permission using has_permission function
        const { data: hasPermission, error: permError } = await supabase.rpc(
          'has_permission',
          {
            user_id: publicUserId,
            permission: 'project.write',
            resource_type: 'project',
            resource_id: updateData.project_id,
          }
        );

        if (permError || !hasPermission) {
          errors[row.id] = 'Not authorized to upload media for this update';
          continue;
        }

        try {
          // Use existing object_key if available, otherwise generate new one
          const objectKey = ensureKey(
            row.object_key,
            row.id,
            row.original_filename,
            'media'
          );
          const uploadUrl = await r2.getPresignedPutUrl(
            objectKey,
            expiresInSeconds
          );

          // Prepare update data
          const updateData: UpdateData = {
            object_key: objectKey,
            storage_provider: 'r2',
          };

          // If we have new original_filename from request mapping, use it
          const requestFilename = originalFilenames[row.id];
          if (requestFilename && !row.original_filename) {
            updateData.original_filename = requestFilename;
            updateData.file_type =
              StorageUtils.extractFileExtension(requestFilename);
          }

          // Persist object_key, provider, and metadata
          await supabase
            .from('project_updates_media')
            .update(updateData)
            .eq('id', row.id);

          projectUpdatesMedia.push({
            id: row.id,
            objectKey,
            uploadUrl,
            expiresIn: expiresInSeconds,
          });
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
    }

    const response: BatchUploadUrlsResult = {
      success: Object.keys(errors).length === 0,
    };
    if (media.length > 0) response.media = media;
    if (images.length > 0) response.images = images;
    if (projectUpdatesMedia.length > 0)
      response.projectUpdatesMedia = projectUpdatesMedia;
    if (!response.success) response.errors = errors;

    return createSuccessResponse(response);
  } catch (error) {
    return createErrorResponse((error as Error).message, 500);
  }
});
