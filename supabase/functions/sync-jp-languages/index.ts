import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type LanguageSourceRow = {
  external_id: string | null;
};

type CachedLanguageRow = {
  iso639_3: string;
  updated_at: string | null;
};

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
const UPSERT_BATCH_SIZE = 300;
const FETCH_BATCH_SIZE = 5;
const STALE_AFTER_DAYS = 7;
const SOURCE_PAGE_SIZE = 1000;

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

function resolvePayloadList(data: unknown): JpLanguagePayload[] | null {
  if (Array.isArray(data)) {
    return data as JpLanguagePayload[];
  }

  if (
    data &&
    typeof data === 'object' &&
    'api' in data &&
    data.api &&
    typeof data.api === 'object' &&
    'data' in data.api
  ) {
    const apiData = (data.api as { data?: unknown }).data;
    if (Array.isArray(apiData)) {
      return apiData as JpLanguagePayload[];
    }
  }

  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data?: unknown }).data as JpLanguagePayload[];
  }

  return null;
}

function normalizeLanguage(
  iso: string,
  payload: JpLanguagePayload,
  timestamp: string
): JpCacheRow {
  const languageName =
    (getField(payload, ['Language', 'LanguageName', 'Name']) as string) ?? iso;
  const bibleStatus = coerceNumber(getField(payload, ['BibleStatus']));
  const bibleYear =
    (getField(payload, ['BibleYear', 'Bible_Year']) as string) ?? null;
  const ntYear = (getField(payload, ['NTYear', 'NT_Year']) as string) ?? null;
  const portionsYear =
    (getField(payload, ['PortionsYear', 'Portions_Year']) as string) ?? null;
  const hasAudio = coerceBoolean(
    getField(payload, [
      'HasAudioRecordings',
      'AudioRecordings',
      'AudioScripture',
    ])
  );
  const grnUrl =
    (getField(payload, ['GRN', 'GRNLink', 'GRN_URL']) as string) ?? null;

  return {
    iso639_3: iso,
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

async function fetchLanguageFromApi(
  iso: string,
  apiKey: string
): Promise<JpCacheRow | null> {
  const url = new URL(JP_BASE_URL);
  const normalizedIso = iso.trim();
  url.searchParams.set('ROL3', normalizedIso.toUpperCase());
  url.searchParams.set('api_key', apiKey);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    console.error(`JP language request failed for ${iso}: ${response.status}`);
    return null;
  }

  const payloadList = resolvePayloadList(await response.json());
  if (!payloadList || payloadList.length === 0) {
    return null;
  }

  const targetIso = normalizedIso.toLowerCase();
  const matched =
    payloadList.find(item => {
      const code = extractIsoCode(item);
      return code?.toLowerCase() === targetIso;
    }) ?? payloadList[0];

  const now = new Date().toISOString();
  return normalizeLanguage(normalizedIso, matched, now);
}

function filterStaleCodes(
  codes: string[],
  cache: CachedLanguageRow[]
): string[] {
  if (cache.length === 0) {
    return codes;
  }

  const threshold = Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

  const cacheMap = new Map(cache.map(row => [row.iso639_3, row.updated_at]));

  return codes.filter(code => {
    const updatedAt = cacheMap.get(code);
    if (!updatedAt) {
      return true;
    }
    const updatedTime = Date.parse(updatedAt);
    return Number.isFinite(updatedTime) && updatedTime < threshold;
  });
}

async function fetchIsoCodes(
  supabase: ReturnType<typeof createClient>
): Promise<string[]> {
  const codes: string[] = [];
  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const from = page * SOURCE_PAGE_SIZE;
    const to = from + SOURCE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('language_entity_sources')
      .select('external_id')
      .eq('external_id_type', 'iso-639-3')
      .eq('is_external', true)
      .is('deleted_at', null)
      .range(from, to)
      .returns<LanguageSourceRow[]>();

    if (error) {
      throw new Error(`Failed to load ISO codes: ${error.message}`);
    }

    const chunk = ((data ?? []) as LanguageSourceRow[])
      .map((row: LanguageSourceRow) => row.external_id?.trim() ?? null)
      .filter((val: string | null): val is string => Boolean(val));

    codes.push(...chunk);

    if (!data || data.length < SOURCE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return Array.from(new Set(codes));
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

    const [isoCodes, cacheRows] = await Promise.all([
      fetchIsoCodes(supabase),
      supabase.from('jp_language_cache').select('iso639_3, updated_at'),
    ]);

    const uniqueCodes = isoCodes;
    const staleCodes = filterStaleCodes(
      uniqueCodes,
      (cacheRows ?? []) as CachedLanguageRow[]
    );

    const upserts: JpCacheRow[] = [];
    let processed = 0;

    for (const batch of chunkArray(staleCodes, FETCH_BATCH_SIZE)) {
      const results = await Promise.all(
        batch.map(code => fetchLanguageFromApi(code, jpApiKey))
      );
      results.forEach(record => {
        if (record) {
          upserts.push(record);
        }
      });
      processed += batch.length;
    }

    for (const batch of chunkArray(upserts, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('jp_language_cache')
        .upsert(batch, { onConflict: 'iso639_3' });

      if (error) {
        throw new Error(`JP cache upsert failed: ${error.message}`);
      }
    }

    if (upserts.length > 0) {
      const { error: refreshError } = await supabase.rpc(
        'refresh_unified_bible_stats'
      );

      if (refreshError) {
        throw new Error(
          `Unified stats refresh failed: ${refreshError.message}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        upserted: upserts.length,
        skipped: uniqueCodes.length - staleCodes.length,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
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
