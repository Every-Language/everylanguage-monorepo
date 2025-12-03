import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JpCountryPayload = Record<string, unknown>;

type JpCountryCacheRow = {
  rog3: string;
  ctry: string | null;
  iso3: string | null;
  iso2: string | null;
  rog2: string | null;
  region_code: number | null;
  region_name: string | null;
  capital: string | null;
  population: number | null;
  percent_buddhism: number | null;
  percent_christianity: number | null;
  percent_ethnic_religions: number | null;
  percent_evangelical: number | null;
  percent_hinduism: number | null;
  percent_islam: number | null;
  percent_non_religious: number | null;
  percent_other_small: number | null;
  percent_unknown: number | null;
  religion_primary: string | null;
  rlg3_primary: number | null;
  bible_complete: number | null;
  bible_new_testament: number | null;
  bible_portions: number | null;
  translation_needed: number | null;
  translation_started: number | null;
  translation_unspecified: number | null;
  cnt_primary_languages: number | null;
  cnt_peoples: number | null;
  cnt_peoples_lr: number | null;
  popl_peoples_lr: number | null;
  popl_peoples_fpg: number | null;
  jpscale_ctry: number | null;
  jpscale_text: string | null;
  jpscale_image_url: string | null;
  rol3_official_language: string | null;
  window_1040: string | null;
  security_level: number | null;
  last_synced_at: string;
  updated_at: string;
};

const JP_BASE_URL = 'https://api.joshuaproject.net/v1/countries.json';
const UPSERT_BATCH_SIZE = 500;
const FETCH_PAGE_SIZE = 250;

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

function getField(payload: JpCountryPayload, candidates: string[]): unknown {
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

function extractRog3(payload: JpCountryPayload): string | null {
  const candidate = getField(payload, ['ROG3', 'rog3']);

  return toCleanString(candidate);
}

function normalizeCountry(
  payload: JpCountryPayload,
  timestamp: string
): JpCountryCacheRow | null {
  const rog3 = extractRog3(payload);
  if (!rog3) {
    return null; // Skip entries without ROG3
  }

  return {
    rog3: rog3.toUpperCase(),
    ctry: toCleanString(getField(payload, ['Ctry', 'ctry'])),
    iso3: toCleanString(getField(payload, ['ISO3', 'iso3'])),
    iso2: toCleanString(getField(payload, ['ISO2', 'iso2'])),
    rog2: toCleanString(getField(payload, ['ROG2', 'rog2'])),
    region_code: coerceNumber(getField(payload, ['RegionCode', 'region_code'])),
    region_name: toCleanString(
      getField(payload, ['RegionName', 'region_name'])
    ),
    capital: toCleanString(getField(payload, ['Capital', 'capital'])),
    population: coerceNumber(getField(payload, ['Population', 'population'])),
    percent_buddhism: coerceNumber(
      getField(payload, ['PercentBuddhism', 'percent_buddhism'])
    ),
    percent_christianity: coerceNumber(
      getField(payload, ['PercentChristianity', 'percent_christianity'])
    ),
    percent_ethnic_religions: coerceNumber(
      getField(payload, ['PercentEthnicReligions', 'percent_ethnic_religions'])
    ),
    percent_evangelical: coerceNumber(
      getField(payload, ['PercentEvangelical', 'percent_evangelical'])
    ),
    percent_hinduism: coerceNumber(
      getField(payload, ['PercentHinduism', 'percent_hinduism'])
    ),
    percent_islam: coerceNumber(
      getField(payload, ['PercentIslam', 'percent_islam'])
    ),
    percent_non_religious: coerceNumber(
      getField(payload, ['PercentNonReligious', 'percent_non_religious'])
    ),
    percent_other_small: coerceNumber(
      getField(payload, ['PercentOtherSmall', 'percent_other_small'])
    ),
    percent_unknown: coerceNumber(
      getField(payload, ['PercentUnknown', 'percent_unknown'])
    ),
    religion_primary: toCleanString(
      getField(payload, ['ReligionPrimary', 'religion_primary'])
    ),
    rlg3_primary: coerceNumber(
      getField(payload, ['RLG3Primary', 'rlg3_primary'])
    ),
    bible_complete: coerceNumber(
      getField(payload, ['BibleComplete', 'bible_complete'])
    ),
    bible_new_testament: coerceNumber(
      getField(payload, ['BibleNewTestament', 'bible_new_testament'])
    ),
    bible_portions: coerceNumber(
      getField(payload, ['BiblePortions', 'bible_portions'])
    ),
    translation_needed: coerceNumber(
      getField(payload, ['TranslationNeeded', 'translation_needed'])
    ),
    translation_started: coerceNumber(
      getField(payload, ['TranslationStarted', 'translation_started'])
    ),
    translation_unspecified: coerceNumber(
      getField(payload, ['TranslationUnspecified', 'translation_unspecified'])
    ),
    cnt_primary_languages: coerceNumber(
      getField(payload, ['CntPrimaryLanguages', 'cnt_primary_languages'])
    ),
    cnt_peoples: coerceNumber(getField(payload, ['CntPeoples', 'cnt_peoples'])),
    cnt_peoples_lr: coerceNumber(
      getField(payload, ['CntPeoplesLR', 'cnt_peoples_lr'])
    ),
    popl_peoples_lr: coerceNumber(
      getField(payload, ['PoplPeoplesLR', 'popl_peoples_lr'])
    ),
    popl_peoples_fpg: coerceNumber(
      getField(payload, ['PoplPeoplesFPG', 'popl_peoples_fpg'])
    ),
    jpscale_ctry: coerceNumber(
      getField(payload, ['JPScaleCtry', 'jpscale_ctry'])
    ),
    jpscale_text: toCleanString(
      getField(payload, ['JPScaleText', 'jpscale_text'])
    ),
    jpscale_image_url: toCleanString(
      getField(payload, ['JPScaleImageURL', 'jpscale_image_url'])
    ),
    rol3_official_language: toCleanString(
      getField(payload, ['ROL3OfficialLanguage', 'rol3_official_language'])
    ),
    window_1040: toCleanString(
      getField(payload, ['Window1040', 'window_1040'])
    ),
    security_level: coerceNumber(
      getField(payload, ['SecurityLevel', 'security_level'])
    ),
    last_synced_at: timestamp,
    updated_at: timestamp,
  };
}

async function fetchCountriesPage(
  apiKey: string,
  page: number
): Promise<{ countries: JpCountryPayload[]; hasMore: boolean }> {
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

    // The API returns an array of country objects
    if (!Array.isArray(jsonData)) {
      throw new Error('JP API did not return an array of countries');
    }

    return {
      countries: jsonData as JpCountryPayload[],
      hasMore: jsonData.length === FETCH_PAGE_SIZE,
    };
  } catch (error) {
    console.error(`Exception fetching page ${page} from JP API:`, error);
    throw error;
  }
}

async function fetchAllCountriesFromApi(
  apiKey: string
): Promise<JpCountryCacheRow[]> {
  console.log('Fetching all countries from Joshua Project API (paginated)...');
  const normalized: JpCountryCacheRow[] = [];
  const now = new Date().toISOString();
  let page = 1;
  let totalFetched = 0;

  while (true) {
    console.log(`Fetching page ${page}...`);
    const { countries, hasMore } = await fetchCountriesPage(apiKey, page);

    for (const country of countries) {
      const normalizedCountry = normalizeCountry(country, now);
      if (normalizedCountry) {
        normalized.push(normalizedCountry);
      }
    }

    totalFetched += countries.length;
    console.log(
      `Page ${page}: fetched ${countries.length} countries (total: ${totalFetched}, normalized: ${normalized.length})`
    );

    if (!hasMore || countries.length === 0) {
      break;
    }

    page += 1;
  }

  console.log(
    `Completed: fetched ${totalFetched} countries, normalized ${normalized.length} entries`
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

    // Fetch all countries from JP API
    const allCountries = await fetchAllCountriesFromApi(jpApiKey);

    console.log(`Upserting ${allCountries.length} countries into cache...`);

    // Upsert all countries in batches
    let upserted = 0;
    for (const batch of chunkArray(allCountries, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('jp_countries_cache')
        .upsert(batch, { onConflict: 'rog3' });

      if (error) {
        throw new Error(`JP cache upsert failed: ${error.message}`);
      }
      upserted += batch.length;
      console.log(`Upserted batch: ${upserted}/${allCountries.length}`);
    }

    // Deletion detection: mark cache entries not in API response as deleted
    const rog3sFromApi = new Set(allCountries.map(c => c.rog3));
    const { data: existingCountries } = await supabase
      .from('jp_countries_cache')
      .select('rog3')
      .is('deleted_at', null);

    if (existingCountries) {
      const toDelete = existingCountries.filter(c => !rog3sFromApi.has(c.rog3));

      if (toDelete.length > 0) {
        console.log(
          `Marking ${toDelete.length} countries as deleted (not in API response)`
        );
        const { error: deleteError } = await supabase
          .from('jp_countries_cache')
          .update({ deleted_at: new Date().toISOString() })
          .in(
            'rog3',
            toDelete.map(c => c.rog3)
          );

        if (deleteError) {
          console.error('Failed to mark deleted countries:', deleteError);
        }
      }
    }

    const response = {
      success: true,
      total_countries: allCountries.length,
      upserted,
      deleted_count: existingCountries
        ? existingCountries.filter(c => !rog3sFromApi.has(c.rog3)).length
        : 0,
    };

    console.log('JP countries sync summary:', JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('JP countries sync error', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to sync Joshua Project countries',
        details: (error as Error).message,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
});
