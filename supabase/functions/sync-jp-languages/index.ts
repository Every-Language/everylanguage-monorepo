import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JpLanguagePayload = Record<string, unknown>;

type JpCacheRow = {
  iso639_3: string;
  language_name: string;
  bible_status: number | null;
  bible_year: string | null;
  nt_year: string | null;
  portions_year: string | null;
  has_audio_recordings: boolean;
  grn_url: string | null;
  last_synced_at: string;
  updated_at: string;
};

const JP_BASE_URL = 'https://api.joshuaproject.net/v1/languages.json';
const UPSERT_BATCH_SIZE = 500;
const FETCH_PAGE_SIZE = 250; // Use smaller page size for API calls

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['y', 'yes', 'true', '1'].includes(normalized);
  }

  return false;
}

function toCleanString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function getField(payload: JpLanguagePayload, candidates: string[]): unknown {
  for (const key of candidates) {
    if (key in payload) {
      return payload[key];
    }
    const lowerKey = key.toLowerCase();
    for (const actualKey of Object.keys(payload)) {
      if (actualKey.toLowerCase() === lowerKey) {
        return payload[actualKey];
      }
    }
  }
  return undefined;
}

function extractIsoCode(payload: JpLanguagePayload): string | null {
  const candidate = getField(payload, [
    'ROL3',
    'rol3',
    'ROL_3',
    'ROD_Code',
    'rod_code',
    'ROD',
    'rod',
    'LanguageCode',
    'language_code',
    'ISO',
    'iso',
    'ISO6393',
    'iso639_3',
  ]);

  return toCleanString(candidate);
}

function normalizeLanguage(
  payload: JpLanguagePayload,
  timestamp: string
): JpCacheRow | null {
  const isoCode = extractIsoCode(payload);
  if (!isoCode) {
    return null; // Skip entries without ISO code
  }

  const normalizedIso = isoCode.toLowerCase().trim();
  const languageName =
    (getField(payload, ['Language', 'LanguageName', 'Name', 'WebLangText']) as
      | string
      | undefined) ?? normalizedIso;
  const bibleStatus = coerceNumber(getField(payload, ['BibleStatus']));
  const bibleYear =
    (getField(payload, ['BibleYear', 'Bible_Year']) as string | undefined) ??
    null;
  const ntYear =
    (getField(payload, ['NTYear', 'NT_Year']) as string | undefined) ?? null;
  const portionsYear =
    (getField(payload, ['PortionsYear', 'Portions_Year']) as
      | string
      | undefined) ?? null;
  const hasAudio = coerceBoolean(
    getField(payload, [
      'HasAudioRecordings',
      'AudioRecordings',
      'AudioScripture',
    ])
  );
  const grnUrl =
    (getField(payload, ['GRN', 'GRNLink', 'GRN_URL']) as string | undefined) ??
    null;

  return {
    iso639_3: normalizedIso,
    language_name: languageName,
    bible_status: bibleStatus,
    bible_year: bibleYear,
    nt_year: ntYear,
    portions_year: portionsYear,
    has_audio_recordings: hasAudio,
    grn_url: grnUrl,
    last_synced_at: timestamp,
    updated_at: timestamp,
  };
}

async function fetchLanguagesPage(
  apiKey: string,
  page: number
): Promise<{ languages: JpLanguagePayload[]; hasMore: boolean }> {
  const url = new URL(JP_BASE_URL);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('limit', String(FETCH_PAGE_SIZE));
  url.searchParams.set('page', String(page));

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `JP API request failed: ${response.status} ${response.statusText}`
      );
    }

    const jsonData = await response.json();

    // Check for API error responses
    if (
      jsonData &&
      typeof jsonData === 'object' &&
      'api' in jsonData &&
      jsonData.api &&
      typeof jsonData.api === 'object' &&
      'status' in jsonData.api &&
      jsonData.api.status === 'error'
    ) {
      throw new Error(
        `JP API returned error: ${JSON.stringify(
          jsonData.api.error || 'Unknown error'
        )}`
      );
    }

    // The API returns an array of language objects
    if (!Array.isArray(jsonData)) {
      throw new Error('JP API did not return an array of languages');
    }

    return {
      languages: jsonData as JpLanguagePayload[],
      hasMore: jsonData.length === FETCH_PAGE_SIZE,
    };
  } catch (error) {
    console.error(`Exception fetching page ${page} from JP API:`, error);
    throw error;
  }
}

async function fetchAllLanguagesFromApi(apiKey: string): Promise<JpCacheRow[]> {
  console.log('Fetching all languages from Joshua Project API (paginated)...');
  const normalized: JpCacheRow[] = [];
  const now = new Date().toISOString();
  let page = 1;
  let totalFetched = 0;

  while (true) {
    console.log(`Fetching page ${page}...`);
    const { languages, hasMore } = await fetchLanguagesPage(apiKey, page);

    for (const language of languages) {
      const normalizedLang = normalizeLanguage(language, now);
      if (normalizedLang) {
        normalized.push(normalizedLang);
      }
    }

    totalFetched += languages.length;
    console.log(
      `Page ${page}: fetched ${languages.length} languages (total: ${totalFetched}, normalized: ${normalized.length})`
    );

    if (!hasMore || languages.length === 0) {
      break;
    }

    page += 1;
  }

  console.log(
    `Completed: fetched ${totalFetched} languages, normalized ${normalized.length} entries`
  );

  return normalized;
}

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const jpApiKey = Deno.env.get('JOSHUA_PROJECT_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!jpApiKey || !supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Missing environment configuration' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all languages from JP API in one call
    const allLanguages = await fetchAllLanguagesFromApi(jpApiKey);

    console.log(`Upserting ${allLanguages.length} languages into cache...`);

    // Upsert all languages in batches
    let upserted = 0;
    for (const batch of chunkArray(allLanguages, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('jp_language_cache')
        .upsert(batch, { onConflict: 'iso639_3' });

      if (error) {
        throw new Error(`JP cache upsert failed: ${error.message}`);
      }
      upserted += batch.length;
      console.log(`Upserted batch: ${upserted}/${allLanguages.length}`);
    }

    // Refresh the unified stats materialized view
    let refreshErrorMessage: string | null = null;
    try {
      const { error: refreshError } = await supabase.rpc(
        'refresh_unified_bible_stats'
      );

      if (refreshError) {
        console.error('Unified stats refresh failed', refreshError);
        refreshErrorMessage =
          refreshError.message ?? 'Unknown refresh error occurred';
      }
    } catch (err) {
      console.error('Exception refreshing unified stats:', err);
      refreshErrorMessage =
        err instanceof Error ? err.message : 'Unknown refresh error occurred';
    }

    const response = {
      success: true,
      total_languages: allLanguages.length,
      upserted,
      refresh_status: refreshErrorMessage ? 'failed' : 'succeeded',
      refresh_error: refreshErrorMessage,
    };

    console.log('JP sync summary:', JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('JP sync error', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to sync Joshua Project languages',
        details: (error as Error).message,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
});
