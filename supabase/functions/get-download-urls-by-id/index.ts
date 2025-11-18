import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createSignedCdnUrl } from '../_shared/cdn-utils.ts';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface RequestBody {
  mediaFileIds?: string[];
  imageIds?: string[];
  projectUpdatesMediaIds?: string[];
  expirationHours?: number;
}

interface BatchUrlResult {
  success: boolean;
  expiresIn: number;
  media?: Record<string, string>; // media_file_id -> url
  images?: Record<string, string>; // image_id -> url
  projectUpdatesMedia?: Record<string, string>; // project_updates_media_id -> url
  errors?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    const {
      mediaFileIds = [],
      imageIds = [],
      projectUpdatesMediaIds = [],
      expirationHours = 24,
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

    // R2-only storage provider
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresInSeconds = Math.min(Math.max(1, expirationHours), 24) * 3600;
    const result: BatchUrlResult = {
      success: true,
      expiresIn: expiresInSeconds,
    };
    const errors: Record<string, string> = {};

    // Media files
    if (mediaFileIds.length > 0) {
      const { data, error } = await supabase
        .from('media_files')
        .select('id, object_key')
        .in('id', mediaFileIds);
      if (error) {
        return createErrorResponse(
          `DB error (media_files): ${error.message}`,
          500
        );
      }
      const media: Record<string, string> = {};
      for (const row of data ?? []) {
        const key = row.object_key;
        if (!key) {
          errors[row.id] = 'Missing object key';
          continue;
        }
        try {
          const base = Deno.env.get('CDN_BASE_URL') ?? '';
          const secret = Deno.env.get('CDN_SIGNING_SECRET') ?? '';
          let url = await createSignedCdnUrl(
            base,
            key,
            secret,
            expiresInSeconds
          );
          if ((Deno.env.get('ENV') ?? '').toLowerCase() === 'development') {
            const u = new URL(url);
            u.searchParams.set('env', 'dev');
            url = u.toString();
          }
          media[row.id] = url;
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
      result.media = media;
    }

    // Images
    if (imageIds.length > 0) {
      const { data, error } = await supabase
        .from('images')
        .select('id, object_key')
        .in('id', imageIds);
      if (error) {
        return createErrorResponse(`DB error (images): ${error.message}`, 500);
      }
      const images: Record<string, string> = {};
      for (const row of data ?? []) {
        const key = row.object_key;
        if (!key) {
          errors[row.id] = 'Missing object key';
          continue;
        }
        try {
          const base = Deno.env.get('CDN_BASE_URL') ?? '';
          const secret = Deno.env.get('CDN_SIGNING_SECRET') ?? '';
          let url = await createSignedCdnUrl(
            base,
            key,
            secret,
            expiresInSeconds
          );
          if ((Deno.env.get('ENV') ?? '').toLowerCase() === 'development') {
            const u = new URL(url);
            u.searchParams.set('env', 'dev');
            url = u.toString();
          }
          images[row.id] = url;
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
      result.images = images;
    }

    // Project updates media
    if (projectUpdatesMediaIds.length > 0) {
      const { data, error } = await supabase
        .from('project_updates_media')
        .select('id, object_key')
        .in('id', projectUpdatesMediaIds);
      if (error) {
        return createErrorResponse(
          `DB error (project_updates_media): ${error.message}`,
          500
        );
      }
      const projectUpdatesMedia: Record<string, string> = {};
      for (const row of data ?? []) {
        const key = row.object_key;
        if (!key) {
          errors[row.id] = 'Missing object key';
          continue;
        }
        try {
          const base = Deno.env.get('CDN_BASE_URL') ?? '';
          const secret = Deno.env.get('CDN_SIGNING_SECRET') ?? '';
          let url = await createSignedCdnUrl(
            base,
            key,
            secret,
            expiresInSeconds
          );
          if ((Deno.env.get('ENV') ?? '').toLowerCase() === 'development') {
            const u = new URL(url);
            u.searchParams.set('env', 'dev');
            url = u.toString();
          }
          projectUpdatesMedia[row.id] = url;
        } catch (e) {
          errors[row.id] = (e as Error).message;
        }
      }
      result.projectUpdatesMedia = projectUpdatesMedia;
    }

    if (Object.keys(errors).length > 0) {
      result.success =
        Object.keys(errors).length <
        mediaFileIds.length + imageIds.length + projectUpdatesMediaIds.length;
      result.errors = errors;
    }

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse((error as Error).message, 500);
  }
});
