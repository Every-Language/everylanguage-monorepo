import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type GrnLanguageFeed = {
  languages?: { language?: GrnLanguageEntry | GrnLanguageEntry[] };
};

type GrnLanguageEntry = {
  id?: number | string;
  iso?: string;
  name?: string;
  parent?: number | string;
  programs?: {
    program?: unknown;
  };
};

type GrnCacheRow = {
  grn_language_id: number;
  iso639_3: string | null;
  language_name: string;
  has_recordings: boolean;
  program_count: number;
  parent_id: number | null;
  last_synced_at: string;
  updated_at: string;
};

const GRN_FEED_URL =
  'https://api.globalrecordings.net/feeds/language/all?format=json';
const UPSERT_BATCH_SIZE = 500;

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

function getProgramInfo(programsField: unknown): {
  hasRecordings: boolean;
  count: number;
} {
  const programs =
    (programsField as { program?: unknown } | undefined)?.program ?? [];

  if (Array.isArray(programs)) {
    return { hasRecordings: programs.length > 0, count: programs.length };
  }

  if (programs && typeof programs === 'object') {
    return { hasRecordings: true, count: 1 };
  }

  if (typeof programs === 'string' && programs.trim().length > 0) {
    return { hasRecordings: true, count: 1 };
  }

  return { hasRecordings: false, count: 0 };
}

function normalizeLanguages(payload: unknown): GrnLanguageEntry[] {
  const root = payload as GrnLanguageFeed;
  const languagesField = root.languages?.language;

  if (!languagesField) {
    return [];
  }

  return Array.isArray(languagesField)
    ? languagesField
    : [languagesField].filter(Boolean);
}

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase service credentials' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const response = await fetch(GRN_FEED_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch GRN feed',
          status: response.status,
        }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }

    const payload: unknown = await response.json();
    const entries = normalizeLanguages(payload);
    const now = new Date().toISOString();

    const upserts: GrnCacheRow[] = entries
      .map(entry => {
        const grnId = coerceNumber(entry.id);
        if (!grnId) {
          return null;
        }

        const programInfo = getProgramInfo(entry.programs);

        return {
          grn_language_id: grnId,
          iso639_3: entry.iso?.trim() || null,
          language_name: entry.name?.trim() || `GRN ${grnId}`,
          has_recordings: programInfo.hasRecordings,
          program_count: programInfo.count,
          parent_id: coerceNumber(entry.parent),
          last_synced_at: now,
          updated_at: now,
        };
      })
      .filter((row): row is GrnCacheRow => Boolean(row));

    for (const batch of chunkArray(upserts, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('grn_language_cache')
        .upsert(batch, {
          onConflict: 'grn_language_id',
        });

      if (error) {
        console.error('GRN cache upsert failed', error);
        return new Response(
          JSON.stringify({ error: 'Failed to upsert GRN cache' }),
          { status: 500, headers: { 'content-type': 'application/json' } }
        );
      }
    }

    // Refresh the unified stats materialized view
    // Handle errors gracefully - don't fail the entire sync if refresh times out
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

    const summary = {
      success: true,
      upserted: upserts.length,
      refresh_status: refreshErrorMessage ? 'failed' : 'succeeded',
      refresh_error: refreshErrorMessage,
    };

    console.log('GRN sync summary:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled GRN sync error', error);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error while syncing GRN languages',
        details: (error as Error).message,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
});
