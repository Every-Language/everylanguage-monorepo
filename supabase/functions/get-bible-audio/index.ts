import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createSignedCdnUrl } from '../_shared/cdn-utils.ts';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import { validateApiKey } from '../_shared/api-key-middleware.ts';

interface MediaFileVerse {
  id: string;
  verse_id: string;
  start_time_seconds: number;
  duration_seconds: number;
  verse_text_id: string | null;
  created_at: string;
}

interface MediaFile {
  id: string;
  language_entity_id: string;
  media_type: string;
  object_key: string | null;
  storage_provider: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  original_filename: string | null;
  file_type: string | null;
  publish_status: string;
  created_at: string;
  audio_version_id: string;
  media_files_verses: MediaFileVerse[];
  signed_url?: string;
}

interface AudioVersion {
  id: string;
  language_entity_id: string;
  bible_version_id: string;
  project_id: string | null;
  name: string;
  publish_status: string;
  created_at: string;
  media_files: MediaFile[];
}

interface QueryParams {
  language_entity_id?: string;
  bible_version_id?: string;
  audio_version_id?: string;
}

const DEFAULT_EXPIRATION_HOURS = 24;

function parseQueryParams(url: URL): QueryParams {
  return {
    language_entity_id: url.searchParams.get('language_entity_id') ?? undefined,
    bible_version_id: url.searchParams.get('bible_version_id') ?? undefined,
    audio_version_id: url.searchParams.get('audio_version_id') ?? undefined,
  };
}

function validateUUID(value: string | undefined, name: string): string | null {
  if (!value) return null;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return `Invalid ${name} format. Expected UUID.`;
  }
  return null;
}

async function generateSignedUrl(
  objectKey: string,
  expiresInSeconds: number
): Promise<string> {
  const baseUrl = Deno.env.get('CDN_BASE_URL') ?? '';
  const secret = Deno.env.get('CDN_SIGNING_SECRET') ?? '';

  let url = await createSignedCdnUrl(baseUrl, objectKey, secret, expiresInSeconds);

  // Add env param for development
  if ((Deno.env.get('ENV') ?? '').toLowerCase() === 'development') {
    const u = new URL(url);
    u.searchParams.set('env', 'dev');
    url = u.toString();
  }

  return url;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Validate API key
    const apiKeyResult = validateApiKey(req);
    if (!apiKeyResult.valid) {
      return createErrorResponse(apiKeyResult.error ?? 'Invalid API key', 401);
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const params = parseQueryParams(url);

    // Validate UUID formats if provided
    const languageError = validateUUID(
      params.language_entity_id,
      'language_entity_id'
    );
    if (languageError) {
      return createErrorResponse(languageError, 400);
    }

    const audioVersionError = validateUUID(
      params.audio_version_id,
      'audio_version_id'
    );
    if (audioVersionError) {
      return createErrorResponse(audioVersionError, 400);
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query for audio_versions with nested media_files and media_files_verses
    let query = supabase
      .from('audio_versions')
      .select(
        `
        id,
        language_entity_id,
        bible_version_id,
        project_id,
        name,
        publish_status,
        created_at,
        media_files!inner(
          id,
          language_entity_id,
          media_type,
          object_key,
          storage_provider,
          file_size,
          duration_seconds,
          original_filename,
          file_type,
          publish_status,
          created_at,
          audio_version_id,
          media_files_verses(
            id,
            verse_id,
            start_time_seconds,
            duration_seconds,
            verse_text_id,
            created_at
          )
        )
      `
      )
      // Only return published audio versions
      .eq('publish_status', 'published')
      // Only return published media files
      .eq('media_files.publish_status', 'published')
      // Exclude soft-deleted records
      .is('deleted_at', null)
      .is('media_files.deleted_at', null)
      .is('media_files.media_files_verses.deleted_at', null);

    // Apply optional filters
    if (params.language_entity_id) {
      query = query.eq('language_entity_id', params.language_entity_id);
    }

    if (params.bible_version_id) {
      query = query.eq('bible_version_id', params.bible_version_id);
    }

    if (params.audio_version_id) {
      query = query.eq('id', params.audio_version_id);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }

    // Generate signed URLs for media files
    const expiresInSeconds = DEFAULT_EXPIRATION_HOURS * 3600;
    const urlErrors: Record<string, string> = {};

    const audioVersions = (data as AudioVersion[]) ?? [];

    for (const audioVersion of audioVersions) {
      for (const mediaFile of audioVersion.media_files) {
        if (!mediaFile.object_key) {
          urlErrors[mediaFile.id] = 'Missing object key';
          continue;
        }

        try {
          mediaFile.signed_url = await generateSignedUrl(
            mediaFile.object_key,
            expiresInSeconds
          );
        } catch (e) {
          urlErrors[mediaFile.id] = (e as Error).message;
          console.error(
            `Failed to generate signed URL for media file ${mediaFile.id}:`,
            e
          );
        }
      }
    }

    // Build response
    const response: {
      audio_versions: AudioVersion[];
      expires_in_seconds: number;
      url_errors?: Record<string, string>;
    } = {
      audio_versions: audioVersions,
      expires_in_seconds: expiresInSeconds,
    };

    // Include URL generation errors if any occurred
    if (Object.keys(urlErrors).length > 0) {
      response.url_errors = urlErrors;
    }

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Unexpected error in get-bible-audio:', error);
    return createErrorResponse((error as Error).message, 500);
  }
});
