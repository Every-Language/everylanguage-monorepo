import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JpPeopleGroupPayload = Record<string, unknown>;

type JpPeopleGroupCacheRow = {
  people_id3: number;
  people_id3_rog3: string;
  rog3: string | null;
  iso3: string | null;
  rog2: string | null;
  rop3: string | null;
  rop2: string | null;
  rop25: string | null;
  peop_name_in_country: string | null;
  peop_name_across_countries: string | null;
  longitude: number | null;
  latitude: number | null;
  rol3: string | null;
  primary_language_name: string | null;
  primary_language_dialect: string | null;
  number_languages_spoken: number | null;
  population: number | null;
  population_pgac: number | null;
  population_percent_un: number | null;
  primary_religion: string | null;
  rlg3: string | null;
  pc_evangelical: number | null;
  pc_christian_pc: number | null;
  pc_christian_pd: number | null;
  jpscale: number | null;
  jpscale_text: string | null;
  jpscale_pctxt: string | null;
  jpscale_pcimg: string | null;
  least_reached: string | null;
  least_reached_basis: string | null;
  frontier: string | null;
  unengaged: string | null;
  bible_status: number | null;
  bible_year: string | null;
  nt_year: string | null;
  portions_year: string | null;
  translation_need_year: number | null;
  translation_need_questionable: string | null;
  bible_translation_need: string | null;
  has_audio_recordings: string | null;
  audio_recordings: string | null;
  audio_scripture: string | null;
  has_jesus_film: string | null;
  jf: string | null;
  jf_lang: string | null;
  jf_primary_text: string | null;
  grn: string | null;
  grn_lang: string | null;
  four_laws: string | null;
  god_story: string | null;
  gospel_radio: string | null;
  region_code: string | null;
  region_name: string | null;
  continent_code: string | null;
  continent_name: string | null;
  window_status: string | null;
  location_in_country: string | null;
  ctry: string | null;
  affinity_bloc: string | null;
  people_cluster: string | null;
  race_code: string | null;
  race_name: string | null;
  map_id: string | null;
  security_level: number | null;
  image_url: string | null;
  photo_address: string | null;
  photo_credits: string | null;
  people_group_url: string | null;
  people_group_photo_url: string | null;
  country_url: string | null;
  jpscale_image_url: string | null;
  profile_text_exists: string | null;
  summary: string | null;
  indigenous_language: string | null;
  some_medium_language: string | null;
  primary_medium_language: string | null;
  medium_type_gospel_presentation: string | null;
  last_synced_at: string;
  updated_at: string;
};

const JP_BASE_URL = 'https://api.joshuaproject.net/v1/people_groups.json';
const UPSERT_BATCH_SIZE = 500;
const FETCH_PAGE_SIZE = 250;
const DELETE_BATCH_SIZE = 1000;

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

function getField(
  payload: JpPeopleGroupPayload,
  candidates: string[]
): unknown {
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

function extractPeopleId3Rog3(payload: JpPeopleGroupPayload): string | null {
  const peopleId3 = getField(payload, [
    'PeopleID3',
    'people_id3',
    'People_ID3',
  ]);
  const rog3 = getField(payload, ['ROG3', 'rog3']);

  if (!peopleId3 || !rog3) {
    return null;
  }

  const peopleId3Str = String(peopleId3);
  const rog3Str = String(rog3);

  return `${peopleId3Str}${rog3Str}`;
}

function normalizePeopleGroup(
  payload: JpPeopleGroupPayload,
  timestamp: string
): JpPeopleGroupCacheRow | null {
  const peopleId3 = coerceNumber(
    getField(payload, ['PeopleID3', 'people_id3', 'People_ID3'])
  );
  const peopleId3Rog3 = extractPeopleId3Rog3(payload);

  if (!peopleId3 || !peopleId3Rog3) {
    return null; // Skip entries without required IDs
  }

  return {
    people_id3: peopleId3,
    people_id3_rog3: peopleId3Rog3,
    rog3: toCleanString(getField(payload, ['ROG3', 'rog3'])),
    iso3: toCleanString(getField(payload, ['ISO3', 'iso3'])),
    rog2: toCleanString(getField(payload, ['ROG2', 'rog2'])),
    rop3: toCleanString(getField(payload, ['ROP3', 'rop3'])),
    rop2: toCleanString(getField(payload, ['ROP2', 'rop2'])),
    rop25: toCleanString(getField(payload, ['ROP25', 'rop25'])),
    peop_name_in_country: toCleanString(
      getField(payload, ['PeopNameInCountry', 'peop_name_in_country'])
    ),
    peop_name_across_countries: toCleanString(
      getField(payload, [
        'PeopNameAcrossCountries',
        'peop_name_across_countries',
      ])
    ),
    longitude: coerceNumber(getField(payload, ['Longitude', 'longitude'])),
    latitude: coerceNumber(getField(payload, ['Latitude', 'latitude'])),
    rol3: toCleanString(getField(payload, ['ROL3', 'rol3'])),
    primary_language_name: toCleanString(
      getField(payload, ['PrimaryLanguageName', 'primary_language_name'])
    ),
    primary_language_dialect: toCleanString(
      getField(payload, ['PrimaryLanguageDialect', 'primary_language_dialect'])
    ),
    number_languages_spoken: coerceNumber(
      getField(payload, ['NumberLanguagesSpoken', 'number_languages_spoken'])
    ),
    population: coerceNumber(getField(payload, ['Population', 'population'])),
    population_pgac: coerceNumber(
      getField(payload, ['PopulationPGAC', 'population_pgac'])
    ),
    population_percent_un: coerceNumber(
      getField(payload, ['PopulationPercentUN', 'population_percent_un'])
    ),
    primary_religion: toCleanString(
      getField(payload, ['PrimaryReligion', 'primary_religion'])
    ),
    rlg3: toCleanString(getField(payload, ['RLG3', 'rlg3'])),
    pc_evangelical: coerceNumber(
      getField(payload, ['PercentEvangelical', 'pc_evangelical'])
    ),
    pc_christian_pc: coerceNumber(
      getField(payload, ['PercentChristianPC', 'pc_christian_pc'])
    ),
    pc_christian_pd: coerceNumber(
      getField(payload, ['PercentChristianPD', 'pc_christian_pd'])
    ),
    jpscale: coerceNumber(getField(payload, ['JPScale', 'jpscale'])),
    jpscale_text: toCleanString(
      getField(payload, ['JPScaleText', 'jpscale_text'])
    ),
    jpscale_pctxt: toCleanString(
      getField(payload, ['JPScalePCtxt', 'jpscale_pctxt'])
    ),
    jpscale_pcimg: toCleanString(
      getField(payload, ['JPScalePCimg', 'jpscale_pcimg'])
    ),
    least_reached: toCleanString(
      getField(payload, ['LeastReached', 'least_reached'])
    ),
    least_reached_basis: toCleanString(
      getField(payload, ['LeastReachedBasis', 'least_reached_basis'])
    ),
    frontier: toCleanString(
      getField(payload, ['FrontierPeopleGroup', 'frontier'])
    ),
    unengaged: toCleanString(getField(payload, ['Unengaged', 'unengaged'])),
    bible_status: coerceNumber(
      getField(payload, ['BibleStatus', 'bible_status'])
    ),
    bible_year: toCleanString(getField(payload, ['BibleYear', 'bible_year'])),
    nt_year: toCleanString(getField(payload, ['NTYear', 'nt_year'])),
    portions_year: toCleanString(
      getField(payload, ['PortionsYear', 'portions_year'])
    ),
    translation_need_year: coerceNumber(
      getField(payload, ['TranslationNeedYear', 'translation_need_year'])
    ),
    translation_need_questionable: toCleanString(
      getField(payload, [
        'TranslationNeedQuestionable',
        'translation_need_questionable',
      ])
    ),
    bible_translation_need: toCleanString(
      getField(payload, ['BibleTranslationNeed', 'bible_translation_need'])
    ),
    has_audio_recordings: toCleanString(
      getField(payload, ['HasAudioRecordings', 'has_audio_recordings'])
    ),
    audio_recordings: toCleanString(
      getField(payload, ['AudioRecordings', 'audio_recordings'])
    ),
    audio_scripture: toCleanString(
      getField(payload, ['AudioScripture', 'audio_scripture'])
    ),
    has_jesus_film: toCleanString(
      getField(payload, ['HasJesusFilm', 'has_jesus_film'])
    ),
    jf: toCleanString(getField(payload, ['JF', 'jf'])),
    jf_lang: toCleanString(getField(payload, ['JFLang', 'jf_lang'])),
    jf_primary_text: toCleanString(
      getField(payload, ['JFPrimaryText', 'jf_primary_text'])
    ),
    grn: toCleanString(getField(payload, ['GRN', 'grn'])),
    grn_lang: toCleanString(getField(payload, ['GRNLang', 'grn_lang'])),
    four_laws: toCleanString(getField(payload, ['FourLaws', 'four_laws'])),
    god_story: toCleanString(getField(payload, ['GodStory', 'god_story'])),
    gospel_radio: toCleanString(
      getField(payload, ['GospelRadio', 'gospel_radio'])
    ),
    region_code: toCleanString(
      getField(payload, ['RegionCode', 'region_code'])
    ),
    region_name: toCleanString(
      getField(payload, ['RegionName', 'region_name'])
    ),
    continent_code: toCleanString(
      getField(payload, ['ContinentCode', 'continent_code'])
    ),
    continent_name: toCleanString(
      getField(payload, ['ContinentName', 'continent_name'])
    ),
    window_status: toCleanString(
      getField(payload, ['WindowStatus', 'window_status'])
    ),
    location_in_country: toCleanString(
      getField(payload, ['LocationInCountry', 'location_in_country'])
    ),
    ctry: toCleanString(getField(payload, ['Ctry', 'ctry'])),
    affinity_bloc: toCleanString(
      getField(payload, ['AffinityBloc', 'affinity_bloc'])
    ),
    people_cluster: toCleanString(
      getField(payload, ['PeopleCluster', 'people_cluster'])
    ),
    race_code: toCleanString(getField(payload, ['RaceCode', 'race_code'])),
    race_name: toCleanString(getField(payload, ['RaceName', 'race_name'])),
    map_id: toCleanString(getField(payload, ['MapID', 'map_id'])),
    security_level: coerceNumber(
      getField(payload, ['SecurityLevel', 'security_level'])
    ),
    image_url: toCleanString(getField(payload, ['ImageURL', 'image_url'])),
    photo_address: toCleanString(
      getField(payload, ['PhotoAddress', 'photo_address'])
    ),
    photo_credits: toCleanString(
      getField(payload, ['PhotoCredits', 'photo_credits'])
    ),
    people_group_url: toCleanString(
      getField(payload, ['PeopleGroupURL', 'people_group_url'])
    ),
    people_group_photo_url: toCleanString(
      getField(payload, ['PeopleGroupPhotoURL', 'people_group_photo_url'])
    ),
    country_url: toCleanString(
      getField(payload, ['CountryURL', 'country_url'])
    ),
    jpscale_image_url: toCleanString(
      getField(payload, ['JPScaleImageURL', 'jpscale_image_url'])
    ),
    profile_text_exists: toCleanString(
      getField(payload, ['ProfileTextExists', 'profile_text_exists'])
    ),
    summary: toCleanString(getField(payload, ['Summary', 'summary'])),
    indigenous_language: toCleanString(
      getField(payload, ['IndigenousLanguage', 'indigenous_language'])
    ),
    some_medium_language: toCleanString(
      getField(payload, ['SomeMediumLanguage', 'some_medium_language'])
    ),
    primary_medium_language: toCleanString(
      getField(payload, ['PrimaryMediumLanguage', 'primary_medium_language'])
    ),
    medium_type_gospel_presentation: toCleanString(
      getField(payload, [
        'MediumTypeGospelPresentation',
        'medium_type_gospel_presentation',
      ])
    ),
    last_synced_at: timestamp,
    updated_at: timestamp,
  };
}

async function fetchPeopleGroupsPage(
  apiKey: string,
  page: number
): Promise<{ peopleGroups: JpPeopleGroupPayload[]; hasMore: boolean }> {
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

    // The API returns an array of people group objects
    if (!Array.isArray(jsonData)) {
      throw new Error('JP API did not return an array of people groups');
    }

    return {
      peopleGroups: jsonData as JpPeopleGroupPayload[],
      hasMore: jsonData.length === FETCH_PAGE_SIZE,
    };
  } catch (error) {
    console.error(`Exception fetching page ${page} from JP API:`, error);
    throw error;
  }
}

async function fetchAllPeopleGroupsFromApi(
  apiKey: string,
  maxPages?: number,
  startPage?: number
): Promise<JpPeopleGroupCacheRow[]> {
  console.log(
    'Fetching all people groups from Joshua Project API (paginated)...'
  );
  const normalized: JpPeopleGroupCacheRow[] = [];
  const now = new Date().toISOString();
  let page = startPage || 1;
  let totalFetched = 0;
  // Default to 50 pages if not specified (safer default to prevent timeouts)
  // When called from cron or without params, process in manageable batches
  const MAX_PAGES = maxPages !== undefined ? maxPages : 50;

  while (true) {
    if (page > (startPage || 1) + MAX_PAGES - 1) {
      console.log(
        `Reached max pages limit (${MAX_PAGES} pages starting from ${startPage || 1}), stopping fetch`
      );
      break;
    }

    console.log(`Fetching page ${page}...`);
    const { peopleGroups, hasMore } = await fetchPeopleGroupsPage(apiKey, page);

    for (const peopleGroup of peopleGroups) {
      const normalizedPg = normalizePeopleGroup(peopleGroup, now);
      if (normalizedPg) {
        normalized.push(normalizedPg);
      }
    }

    totalFetched += peopleGroups.length;
    console.log(
      `Page ${page}: fetched ${peopleGroups.length} people groups (total: ${totalFetched}, normalized: ${normalized.length})`
    );

    if (!hasMore || peopleGroups.length === 0) {
      break;
    }

    page += 1;
  }

  console.log(
    `Completed: fetched ${totalFetched} people groups, normalized ${normalized.length} entries`
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
    // Parse optional maxPages and startPage from request body to allow incremental processing
    let maxPages: number | undefined;
    let startPage: number | undefined;
    try {
      const body = await req.json().catch(() => ({}));
      maxPages = body?.maxPages;
      startPage = body?.startPage;
    } catch {
      // Ignore JSON parse errors, use default
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncTimestamp = new Date().toISOString();

    // Fetch all people groups from JP API (with optional page limit and start page)
    const allPeopleGroups = await fetchAllPeopleGroupsFromApi(
      jpApiKey,
      maxPages,
      startPage
    );

    console.log(
      `Upserting ${allPeopleGroups.length} people groups into cache...`
    );

    // Upsert all people groups in batches
    let upserted = 0;
    for (const batch of chunkArray(allPeopleGroups, UPSERT_BATCH_SIZE)) {
      const { error } = await supabase
        .from('jp_people_groups_cache')
        .upsert(batch, { onConflict: 'people_id3_rog3' });

      if (error) {
        throw new Error(`JP cache upsert failed: ${error.message}`);
      }
      upserted += batch.length;
      console.log(`Upserted batch: ${upserted}/${allPeopleGroups.length}`);
    }

    // Deletion detection: only run when doing a full sync (no startPage or maxPages limit)
    // For incremental syncs, we don't delete entries from other page ranges
    let deleted = 0;
    if (!startPage && !maxPages) {
      console.log('Detecting deleted entries (full sync mode)...');
      const apiPeopleIds = new Set(
        allPeopleGroups.map(pg => pg.people_id3_rog3)
      );

      // Get all cache entries that were synced before this sync
      const { data: staleEntries, error: staleError } = await supabase
        .from('jp_people_groups_cache')
        .select('people_id3_rog3')
        .lt('last_synced_at', syncTimestamp);

      if (staleError) {
        console.error('Error fetching stale entries:', staleError);
        throw new Error(`Failed to fetch stale entries: ${staleError.message}`);
      }

      // Find entries to delete (in cache but not in API response)
      const toDelete = (staleEntries || []).filter(
        entry => !apiPeopleIds.has(entry.people_id3_rog3)
      );

      console.log(`Found ${toDelete.length} entries to delete`);

      // Delete in batches
      if (toDelete.length > 0) {
        for (const batch of chunkArray(toDelete, DELETE_BATCH_SIZE)) {
          const idsToDelete = batch.map(e => e.people_id3_rog3);
          const { error: deleteError } = await supabase
            .from('jp_people_groups_cache')
            .delete()
            .in('people_id3_rog3', idsToDelete);

          if (deleteError) {
            console.error('Error deleting stale entries:', deleteError);
            throw new Error(
              `Failed to delete stale entries: ${deleteError.message}`
            );
          }
          deleted += batch.length;
          console.log(`Deleted batch: ${deleted}/${toDelete.length}`);
        }
      }
    } else {
      console.log('Skipping deletion detection (incremental sync mode)');
    }

    const response = {
      success: true,
      total_fetched: allPeopleGroups.length,
      upserted,
      deleted,
      max_pages_limit: maxPages || 1000,
      start_page: startPage || 1,
      end_page: (startPage || 1) + (maxPages || 1000) - 1,
      note: maxPages
        ? `Limited to ${maxPages} pages starting from page ${startPage || 1}`
        : 'Processed all available pages',
    };

    console.log('JP people groups sync summary:', JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('JP people groups sync error', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to sync Joshua Project people groups',
        details: (error as Error).message,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
});
