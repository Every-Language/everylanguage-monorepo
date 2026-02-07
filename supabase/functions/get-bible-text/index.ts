import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import { validateApiKey } from '../_shared/api-key-middleware.ts';

interface VerseText {
  id: string;
  verse_id: string;
  text_version_id: string;
  verse_text: string;
  created_at: string;
}

interface TextVersion {
  id: string;
  language_id: string;
  bible_version_id: string;
  project_id: string | null;
  name: string;
  text_version_source: string | null;
  publish_status: string;
  created_at: string;
  verse_texts: VerseText[];
}

interface QueryParams {
  language_entity_id?: string;
  bible_version_id?: string;
  text_version_id?: string;
}

function parseQueryParams(url: URL): QueryParams {
  return {
    language_entity_id: url.searchParams.get('language_entity_id') ?? undefined,
    bible_version_id: url.searchParams.get('bible_version_id') ?? undefined,
    text_version_id: url.searchParams.get('text_version_id') ?? undefined,
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

    const textVersionError = validateUUID(
      params.text_version_id,
      'text_version_id'
    );
    if (textVersionError) {
      return createErrorResponse(textVersionError, 400);
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build query for text_versions with nested verse_texts
    // Note: text_versions uses 'language_id' column, not 'language_entity_id'
    let query = supabase
      .from('text_versions')
      .select(
        `
        id,
        language_id,
        bible_version_id,
        project_id,
        name,
        text_version_source,
        publish_status,
        created_at,
        verse_texts(
          id,
          verse_id,
          text_version_id,
          verse_text,
          created_at
        )
      `
      )
      // Only return published text versions
      .eq('publish_status', 'published')
      // Exclude soft-deleted records
      .is('deleted_at', null)
      .is('verse_texts.deleted_at', null);

    // Apply optional filters
    // Note: text_versions uses 'language_id' column name
    if (params.language_entity_id) {
      query = query.eq('language_id', params.language_entity_id);
    }

    if (params.bible_version_id) {
      query = query.eq('bible_version_id', params.bible_version_id);
    }

    if (params.text_version_id) {
      query = query.eq('id', params.text_version_id);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }

    const textVersions = (data as TextVersion[]) ?? [];

    // Build response
    const response = {
      text_versions: textVersions,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Unexpected error in get-bible-text:', error);
    return createErrorResponse((error as Error).message, 500);
  }
});
