// Ingest LangQuest Chapter Export Edge Function
// - Fetches ready exports from LangQuest
// - Downloads audio from LangQuest storage
// - Uploads to EL R2 storage
// - Creates/updates EL records: audio_versions, media_files, media_files_verses, media_files_targets
// - Uses checksum for idempotency

import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';
import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
  handleUnexpectedError,
} from '../_shared/response-utils.ts';
import { R2StorageService } from '../_shared/r2-storage-service.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface LangQuestExport {
  id: string;
  quest_id: string;
  project_id: string;
  audio_url: string | null;
  metadata: {
    manifest: {
      project_id: string;
      language_id: string;
      languoid: {
        id: string;
        name: string | null;
        parent_id: string | null;
        level: 'family' | 'language' | 'dialect' | null;
        ui_ready: boolean | null;
        download_profiles: string[] | null;
        creator_id: string | null;
        sources: Array<{
          name: string;
          unique_identifier: string | null;
          version: string | null;
          url: string | null;
        }>;
        aliases: Array<{
          name: string;
          alias_type: 'endonym' | 'exonym';
          source_names: string[];
          label_languoid_id: string;
        }>;
        properties: Array<{
          key: string;
          value: string;
        }>;
      } | null;
      total_duration_ms: number;
      source_asset_ids: string[];
      exported_at: string;
    };
    bible?: {
      book_id: string;
      chapter_num: number;
      chapter_ref: string;
      verses: Record<string, { start_ms: number; end_ms: number }>; // Object with verse numbers as keys
    };
  };
  export_type: 'feedback' | 'distribution';
  status: string;
  checksum: string;
}

interface IngestRequest {
  export_id?: string; // Optional: ingest specific export, otherwise ingest all ready exports
}

type LanguageEntityLevel = 'family' | 'language' | 'dialect' | 'mother_tongue';

/**
 * Map languoid level to language_entity_level enum
 */
function mapLanguoidLevel(
  level: 'family' | 'language' | 'dialect' | null
): LanguageEntityLevel {
  switch (level) {
    case 'family':
      return 'family';
    case 'language':
      return 'language';
    case 'dialect':
      return 'dialect';
    case null:
    default:
      return 'language'; // Default to 'language' if null
  }
}

/**
 * Find or create language entity from languoid data
 * Follows the same pattern as sync_jp_people_groups migrations
 */
async function findOrCreateLanguageEntity(
  supabaseClient: any,
  languoid: {
    id: string;
    name: string | null;
    parent_id: string | null;
    level: 'family' | 'language' | 'dialect' | null;
    sources: Array<{
      name: string;
      unique_identifier: string | null;
      version: string | null;
      url: string | null;
    }>;
    aliases: Array<{
      name: string;
      alias_type: 'endonym' | 'exonym';
      source_names: string[];
      label_languoid_id: string;
    }>;
    properties: Array<{
      key: string;
      value: string;
    }>;
  }
): Promise<string> {
  // Extract ISO 639-3 code from sources
  const iso6393Source = languoid.sources.find(
    (s) => s.name.toLowerCase() === 'iso639-3' || s.name.toLowerCase() === 'iso639_3'
  );
  const iso6393Code = iso6393Source?.unique_identifier?.toUpperCase().trim() || null;

  let languageEntityId: string | null = null;

  // Strategy 1: Try to find via language_properties (ISO 639-3)
  if (iso6393Code) {
    // First get the language_entity_id from language_properties
    const { data: property } = await supabaseClient
      .from('language_properties')
      .select('language_entity_id')
      .eq('key', 'iso639-3')
      .eq('value', iso6393Code)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (property) {
      // Verify the language entity exists and is not deleted
      const { data: languageEntity } = await supabaseClient
        .from('language_entities')
        .select('id')
        .eq('id', property.language_entity_id)
        .is('deleted_at', null)
        .single();

      if (languageEntity) {
        languageEntityId = languageEntity.id;
      }
    }
  }

  // Strategy 2: Try to find via language_entity_sources (ISO 639-3)
  if (!languageEntityId && iso6393Code) {
    const { data: source } = await supabaseClient
      .from('language_entity_sources')
      .select('language_entity_id')
      .eq('external_id_type', 'iso-639-3')
      .eq('external_id', iso6393Code.toUpperCase())
      .eq('is_external', true)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (source) {
      // Verify the language entity exists and is not deleted
      const { data: languageEntity } = await supabaseClient
        .from('language_entities')
        .select('id')
        .eq('id', source.language_entity_id)
        .is('deleted_at', null)
        .single();

      if (languageEntity) {
        languageEntityId = languageEntity.id;
      }
    }
  }

  // Strategy 3: Create new language entity if not found
  if (!languageEntityId) {
    const level = mapLanguoidLevel(languoid.level);
    const name = languoid.name || iso6393Code || 'Unknown Language';

    // Handle parent_id resolution (recursive - may need to create parent first)
    let parentEntityId: string | null = null;
    if (languoid.parent_id) {
      // For now, we'll skip parent resolution to avoid complexity
      // TODO: Implement recursive parent resolution if needed
      // This would require fetching parent languoid from LangQuest and creating it first
    }

    // Create language_entity
    const { data: newLanguageEntity, error: createError } = await supabaseClient
      .from('language_entities')
      .insert({
        name,
        level,
        parent_id: parentEntityId,
      })
      .select('id')
      .single();

    if (createError || !newLanguageEntity) {
      throw new Error(
        `Failed to create language_entity: ${createError?.message || 'Unknown error'}`
      );
    }

    languageEntityId = newLanguageEntity.id;

    // Create language_property for ISO 639-3 code (if available)
    if (iso6393Code) {
      const { error } = await supabaseClient.from('language_properties').insert({
        language_entity_id: languageEntityId,
        key: 'iso639-3',
        value: iso6393Code,
      });
      // Ignore duplicate key errors - property may already exist
      if (error && !error.code?.includes('23505')) {
        console.warn(`Failed to create language_property: ${error.message}`);
      }
    }

    // Create language_entity_sources entries for each source
    for (const source of languoid.sources) {
      if (source.unique_identifier) {
        // Determine external_id_type based on source name
        let externalIdType: string | null = null;
        if (
          source.name.toLowerCase() === 'iso639-3' ||
          source.name.toLowerCase() === 'iso639_3'
        ) {
          externalIdType = 'iso-639-3';
        } else if (
          source.name.toLowerCase() === 'iso639-1' ||
          source.name.toLowerCase() === 'iso639_1'
        ) {
          externalIdType = 'iso-639-1';
        }
        // Add more mappings as needed

        if (externalIdType) {
          const { error } = await supabaseClient.from('language_entity_sources').insert({
            language_entity_id: languageEntityId,
            source: source.name,
            version: source.version || null,
            external_id_type: externalIdType,
            external_id: source.unique_identifier.toUpperCase(),
            is_external: true,
          });
          // Ignore duplicate key errors - source may already exist
          if (error && !error.code?.includes('23505')) {
            console.warn(`Failed to create language_entity_source: ${error.message}`);
          }
        }
      }
    }

    // Create language_aliases entries for each alias
    for (const alias of languoid.aliases) {
      const { error } = await supabaseClient.from('language_aliases').insert({
        language_entity_id: languageEntityId,
        alias_name: alias.name,
      });
      // Ignore duplicate key errors - alias may already exist
      if (error && !error.code?.includes('23505')) {
        console.warn(`Failed to create language_alias: ${error.message}`);
      }
    }
  }

  if (!languageEntityId) {
    throw new Error('Failed to find or create language entity');
  }
  return languageEntityId;
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return createCorsResponse();
    }

    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) {
      return createAuthErrorResponse(authResult);
    }

    const { supabaseClient } = authResult;

    // Parse request body
    const body: IngestRequest = await req.json().catch(() => ({}));

    // Get LangQuest Supabase URL from env
    const langquestSupabaseUrl = Deno.env.get('LANGQUEST_SUPABASE_URL');
    const langquestSupabaseKey = Deno.env.get('LANGQUEST_SUPABASE_SERVICE_KEY');

    if (!langquestSupabaseUrl || !langquestSupabaseKey) {
      return createErrorResponse(
        'Missing LangQuest Supabase configuration',
        500
      );
    }

    // Create LangQuest client
    const langquestClient = createClient(langquestSupabaseUrl, langquestSupabaseKey);

    // Fetch exports to ingest
    let exports: LangQuestExport[] = [];

    if (body.export_id) {
      // Fetch specific export
      const { data, error } = await langquestClient
        .from('export_quest_artifact')
        .select('*')
        .eq('id', body.export_id)
        .eq('export_type', 'distribution')
        .eq('status', 'ready')
        .single();

      if (error || !data) {
        return createErrorResponse(
          `Export not found or not ready: ${error?.message || 'Not found'}`,
          404
        );
      }

      exports = [data as LangQuestExport];
    } else {
      // Fetch all ready distribution exports
      const { data, error } = await langquestClient
        .from('export_quest_artifact')
        .select('*')
        .eq('export_type', 'distribution')
        .eq('status', 'ready')
        .order('created_at', { ascending: true })
        .limit(100); // Process in batches

      if (error) {
        return createErrorResponse(
          `Failed to fetch exports: ${error.message}`,
          500
        );
      }

      exports = (data || []) as LangQuestExport[];
    }

    if (exports.length === 0) {
      return createSuccessResponse({
        message: 'No exports to ingest',
        ingested: 0,
      });
    }

    // Initialize R2 storage service
    const r2Storage = new R2StorageService();

    const results = [];

    for (const exportRecord of exports) {
      try {
        // Check if already ingested (by checksum)
        const { data: existingMediaFile } = await supabaseClient
          .from('media_files')
          .select('id')
          .eq('remote_path', `langquest-export-${exportRecord.checksum}`)
          .single();

        if (existingMediaFile) {
          results.push({
            export_id: exportRecord.id,
            status: 'skipped',
            reason: 'Already ingested',
          });
          continue;
        }

        // Validate audio_url is present
        if (!exportRecord.audio_url) {
          throw new Error('Export audio_url is missing - export may not be ready');
        }

        // Download audio from LangQuest storage
        const audioResponse = await fetch(exportRecord.audio_url);
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        const audioData = new Uint8Array(audioBuffer);

        // Upload to EL R2 storage
        const r2Key = `langquest-exports/${exportRecord.id}.mp3`;
        const uploadUrl = await r2Storage.getPresignedPutUrl(r2Key, 3600);

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: audioData,
          headers: {
            'Content-Type': 'audio/mpeg',
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
        }

        const manifest = exportRecord.metadata.manifest;
        const durationSeconds = manifest.total_duration_ms / 1000; // Use float for precision

        // Find or create language_entity from languoid data
        if (!manifest.languoid) {
          throw new Error('Languoid data is missing from export manifest');
        }

        const languageEntityId = await findOrCreateLanguageEntity(
          supabaseClient,
          manifest.languoid
        );

        // Find or create audio_version
        // For now, use a default bible_version_id - you may need to determine this from project
        const defaultBibleVersionId = 'default'; // TODO: Get from project metadata

        const { data: audioVersion, error: audioVersionError } = await supabaseClient
          .from('audio_versions')
          .select('id')
          .eq('language_entity_id', languageEntityId)
          .eq('bible_version_id', defaultBibleVersionId)
          .maybeSingle();

        let audioVersionId: string;

        if (audioVersion) {
          audioVersionId = audioVersion.id;
        } else {
          // Create audio_version
          const { data: newAudioVersion, error: createError } = await supabaseClient
            .from('audio_versions')
            .insert({
              language_entity_id: languageEntityId,
              bible_version_id: defaultBibleVersionId,
              name: 'LangQuest Export',
              project_id: null, // EL projects are separate
            })
            .select('id')
            .single();

          if (createError || !newAudioVersion) {
            throw new Error(`Failed to create audio_version: ${createError?.message}`);
          }

          audioVersionId = newAudioVersion.id;
        }

        // Create media_file
        const { data: mediaFile, error: mediaFileError } = await supabaseClient
          .from('media_files')
          .insert({
            language_entity_id: languageEntityId,
            media_type: 'audio',
            remote_path: `langquest-export-${exportRecord.checksum}`,
            file_size: audioData.length,
            duration_seconds: durationSeconds,
            upload_status: 'completed',
            publish_status: 'pending', // Requires QA approval
            check_status: 'pending',
            audio_version_id: audioVersionId,
            created_by: authResult.publicUserId,
          })
          .select('id')
          .single();

        if (mediaFileError || !mediaFile) {
          throw new Error(`Failed to create media_file: ${mediaFileError?.message}`);
        }

        // Find chapter in EL database (only if bible chapter metadata is available)
        // Note: You'll need to map LangQuest chapter reference to EL chapter ID
        // This is simplified - you may need a mapping table or derive from book/chapter
        const bibleMetadata = exportRecord.metadata.bible;
        if (bibleMetadata?.book_id && bibleMetadata.chapter_num != null) {
          const { data: chapter } = await supabaseClient
            .from('chapters')
            .select('id')
            .eq('book_id', bibleMetadata.book_id)
            .eq('chapter_number', bibleMetadata.chapter_num)
            .single();

          if (chapter) {
            // Create media_files_targets
            await supabaseClient.from('media_files_targets').insert({
              media_file_id: mediaFile.id,
              is_bible_audio: true,
              target_type: 'chapter',
              target_id: chapter.id,
              created_by: authResult.publicUserId,
            });

            // Create media_files_verses using actual verse timings from export metadata
            const { data: verses } = await supabaseClient
              .from('verses')
              .select('id, verse_number')
              .eq('chapter_id', chapter.id)
              .order('verse_number', { ascending: true });

            if (verses && verses.length > 0) {
              const verseTimings = bibleMetadata.verses || {};

              for (const verse of verses) {
                const verseKey = verse.verse_number.toString();
                const timing = verseTimings[verseKey];

                if (timing) {
                  // Use actual timings from export metadata
                  const startTimeSeconds = timing.start_ms / 1000;
                  const endTimeSeconds = timing.end_ms / 1000;
                  const verseDurationSeconds = endTimeSeconds - startTimeSeconds;

                  await supabaseClient.from('media_files_verses').insert({
                    media_file_id: mediaFile.id,
                    verse_id: verse.id,
                    start_time_seconds: startTimeSeconds,
                    duration_seconds: verseDurationSeconds,
                    created_by: authResult.publicUserId,
                  });
                } else {
                  // Fallback: If verse timing is missing, skip it or use placeholder
                  // Log warning but don't fail the entire import
                  console.warn(
                    `Missing verse timing for verse ${verseKey} in export ${exportRecord.id}`
                  );
                }
              }
            }
          }
        }

        // Update export status to 'ingested'
        await langquestClient
          .from('export_quest_artifact')
          .update({ status: 'ingested' })
          .eq('id', exportRecord.id);

        results.push({
          export_id: exportRecord.id,
          status: 'success',
          media_file_id: mediaFile.id,
        });
      } catch (error) {
        console.error(`Failed to ingest export ${exportRecord.id}:`, error);
        results.push({
          export_id: exportRecord.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return createSuccessResponse({
      message: `Processed ${exports.length} exports`,
      results,
      ingested: results.filter((r) => r.status === 'success').length,
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
});

