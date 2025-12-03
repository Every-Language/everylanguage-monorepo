/**
 * Joshua Project API Client
 *
 * Provides typed functions to interact with the Joshua Project API
 * through our Next.js API proxy.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Country statistics from Joshua Project
 */
export interface JPCountry {
  ROG3: string; // FIPS 10-4 country code (2-letter)
  Ctry: string; // Country name
  RegionCode: string; // Region code
  RegionName: string; // Region name
  ContinentCode: string; // Continent code
  ContinentName: string; // Continent name
  WindowStatus: string | null; // Window 10/40 status
  ISO3: string; // ISO 3166-1 alpha-3 code
  ISO2: string; // ISO 3166-1 alpha-2 code
  ROG2: string; // 2-letter country code
  WBGeo: string; // World Bank geographic region
  WBIncome: string; // World Bank income classification
  WBPopulation: number | null; // Population estimate (may be null, use Population instead)
  Population: number | null; // Population estimate (primary field)
  RLR3: string; // Primary language code (ISO 639-3)
  PrimaryLanguageName: string; // Name of primary language
  PrimaryReligion: string; // Primary religion
  ReligionSubdivision: string | null; // Religion subdivision
  RLG3: string; // Religion code
  PercentChristianPC: number; // Percent Christian (Primary Context)
  PercentChristianPD: number; // Percent Christian (Primary Diaspora)
  PercentEvangelical: number; // Percent Evangelical
  PercentBuddhism: number; // Percent Buddhist
  PercentEthnicReligions: number; // Percent Ethnic Religions
  PercentHinduism: number; // Percent Hindu
  PercentIslam: number; // Percent Islam
  PercentNonReligious: number; // Percent Non-Religious
  PercentOtherSmall: number; // Percent Other/Small religions
  PercentUnknown: number; // Percent Unknown
  PCBuddhism: number; // Population count - Buddhism
  PCChristianity: number; // Population count - Christianity
  PCEthnicReligions: number; // Population count - Ethnic Religions
  PCHinduism: number; // Population count - Hinduism
  PCIslam: number; // Population count - Islam
  PCNonReligious: number; // Population count - Non-Religious
  PCOtherSmall: number; // Population count - Other/Small
  PCUnknown: number; // Population count - Unknown
  SecurityLevel: number; // Security level (1-5)
  LRofTheLRinPC: number; // Least Reached of the Least Reached in Primary Context
  LRinPC: number; // Least Reached in Primary Context
  LeastReachedBasis: string; // Basis for least reached designation
  JPScale: number | null; // Joshua Project Progress Scale
  JPScaleText: string | null; // Text description of JP Scale
  JPScalePCtxt: string | null; // JP Scale Primary Context
  JPScalePCimg: string | null; // JP Scale Primary Context Image URL
  GospelAccess: string | null; // Gospel Access level
  PhoneDensity: number; // Phone density per 100 people
  InternetUsage: number; // Internet usage percentage
  BibleYear: number | null; // Year of Bible translation
  NTYear: number | null; // Year of New Testament translation
  PortionsYear: number | null; // Year of Portions translation
  TranslationNeedYear: number | null; // Year translation need identified
  TranslationUnspecified: string | null; // Translation status unspecified
  BibleStatus: string | number | null; // Bible translation status (can be string or number 0-5)
  BibleTranslationNeed: string; // Bible translation need description
  FIPS: string; // FIPS country code
  Longitude: number; // Longitude
  Latitude: number; // Latitude
  JF: string; // JESUS Film availability
  JFPrimaryText: string; // JESUS Film primary text
  JFPrimaryHist: string; // JESUS Film primary historical
  GRN: string; // Global Recordings Network availability
  AudioScripture: string; // Audio Scripture availability
  障Gospel: string; // Gospel films availability (Chinese character - "film")
  IndigenousLanguage: string | null; // Indigenous language
  SomeMediumLanguage: string | null; // Some medium language
  PrimaryMediumLanguage: string | null; // Primary medium language
  MediumTypeGospelPresentation: string | null; // Medium type for gospel presentation
  Unengaged: string | null; // Unengaged status
  RaceCode: string | null; // Race code
  PeopleGroups: number | null; // Number of people groups (deprecated, use CntPeoples)
  CntPeoples: number | null; // Number of people groups (primary field)
  CntPeoplesLR: number | null; // Number of least reached people groups
  CntPrimaryLanguages: number | null; // Number of primary languages
  PercentPeopleGroups: number; // Percent of people groups
  PoplPeoplesLR: number | null; // Population of least reached peoples
  PoplPeoplesFPG: number | null; // Population of frontier people groups
  ROL3OfficialLanguage: string | null; // Official language ISO 639-3 code
  // Scripture access statistics
  TranslationUnspecifiedCount: number | null; // Number of languages with unspecified translation status
  TranslationNeeded: number | null; // Number of languages needing translation
  TranslationStarted: number | null; // Number of languages with translation started
  BiblePortions: number | null; // Number of languages with Bible portions
  BibleNewTestament: number | null; // Number of languages with New Testament
  BibleComplete: number | null; // Number of languages with complete Bible
  JPScaleCtry: number | null; // Joshua Project Scale for country
}

/**
 * Language statistics from Joshua Project
 */
export interface JPLanguage {
  ROL3: string; // ISO 639-3 language code
  Language: string; // Language name
  HubCountry: string; // Hub country
  HubCountryISO: string; // Hub country ISO code
  PoplPeoplesLR: number | null; // Population of peoples that are least reached
  PoplPeoplesFPG: number | null; // Population of peoples in frontier people groups
  PoplPeoples: number | null; // Total population speaking this language (may not always be provided by API)
  JPScalePC: number | null; // Joshua Project Scale for Primary Context
  PercentChristianPC: number; // Percent Christian Primary Context
  PercentEvangelicalPC: number; // Percent Evangelical Primary Context
  BibleYear: number | null; // Year of Bible translation
  NTYear: number | null; // Year of New Testament translation
  PortionsYear: number | null; // Year of Portions translation
  PrimaryReligion: string; // Primary religion
  JPScaleText: string | null; // Text description of JP Scale
  TranslationNeedQuestionable: number; // Translation need questionable flag
  AudioRecordings: string | null; // Audio recordings availability (Y/N)
  BibleTranslationNeed: string; // Bible translation need
  GospelAccess: string | null; // Gospel Access level (only in some contexts)
  PercentEvangelical: number; // Percent Evangelical (available in language stats too)
  NTPrimaryText: string | null; // NT primary text status
  BiblePrimaryText: string | null; // Bible primary text status
  NTPrimaryAudio: string | null; // NT primary audio status
  BiblePrimaryAudio: string | null; // Bible primary audio status
  TranslationNeed: string; // Translation need status
  Countries: number; // Number of countries where spoken
  Peoples: number; // Number of people groups
  // Additional fields from API
  HasJesusFilm: string | null; // Y/N - Has Jesus Film
  JF: string | null; // Y/N - Jesus Film availability
  HasAudioRecordings: string | null; // Y/N - Has audio recordings (alternative field name)
  BibleStatus: string | number | null; // Bible status as string or number (0-5)
  WebLangText: string | null; // Web language text
  Status: string | null; // Language status
  GRN_URL: string | null; // Global Recordings Network URL
  JF_URL: string | null; // Jesus Film URL
  FCBH_URL: string | null; // Faith Comes By Hearing URL
  NbrPGICs: number | null; // Number of people groups in countries
  NbrCountries: number | null; // Number of countries
  PercentAdherents: number | null; // Percent adherents
  LeastReached: string | null; // Y/N - Least reached
  RLG3: number | null; // Religion code
}

/**
 * People Group from Joshua Project
 */
export interface JPPeopleGroup {
  PeopleID3: string; // People group ID
  PeopNameInCountry: string; // People name in country
  ROG3: string; // Joshua Project's internal country code
  ISO3: string; // ISO 3166-1 alpha-3 country code
  Ctry: string; // Country name
  PrimaryLanguageName: string; // Primary language name
  PrimaryLanguageDialect: string | null; // Primary language dialect
  ROL3: string; // Language code (ISO 639-3)
  PrimaryReligion: string; // Primary religion
  RLG3: string; // Religion code
  PercentEvangelical: number; // Percent Evangelical
  PercentChristianPC: number; // Percent Christian Primary Context
  PercentChristianPD: number; // Percent Christian Primary Diaspora
  JPScale: number | null; // Joshua Project Progress Scale (1-5)
  JPScaleText: string | null; // Text description of JP Scale
  JPScalePCtxt: string | null; // JP Scale Primary Context
  JPScalePCimg: string | null; // JP Scale Primary Context Image URL
  LeastReached: string; // Y/N - Is least reached
  LeastReachedBasis: string; // Basis for least reached designation
  Unengaged: string | null; // Unengaged status
  FrontierPeopleGroup: string; // Y/N - Is frontier people group
  MapID: string; // Map ID
  RaceCode: string | null; // Race code
  RaceName: string | null; // Race name
  AffinityBloc: string; // Affinity bloc
  PeopleCluster: string; // People cluster
  PeopNameAcrossCountries: string; // People name across countries
  Population: number; // Population
  PopulationPercentUN: number; // Population percent (UN)
  ROG2: string; // 2-letter country code
  ROP3: string; // People group code
  ROP2: string; // People group 2-letter code
  ROP25: string; // People group 2.5 code
  RegionCode: string; // Region code
  RegionName: string; // Region name
  ContinentCode: string; // Continent code
  ContinentName: string; // Continent name
  WindowStatus: string; // Window 10/40 status
  Longitude: number; // Longitude
  Latitude: number; // Latitude
  SecurityLevel: number; // Security level (1-5)
  BibleStatus: number | string; // Bible translation status (number 0-5 or string)
  BibleYear: string | number | null; // Year of Bible translation (can be range like "1933-2023")
  NTYear: string | number | null; // Year of New Testament translation (can be range)
  PortionsYear: string | number | null; // Year of Portions translation (can be range or "Yes")
  TranslationNeedYear: number | null; // Year translation need identified
  TranslationNeedQuestionable: string | number | null; // Translation need questionable flag
  BibleTranslationNeed: string; // Bible translation need description
  JF: string; // JESUS Film availability (Y/N)
  HasJesusFilm: string | null; // Y/N - Has Jesus Film
  JFLang: string; // JESUS Film language
  JFPrimaryText: string; // JESUS Film primary text
  AudioScripture: string; // Audio Scripture availability
  HasAudioRecordings: string | null; // Y/N - Has audio recordings
  AudioRecordings: string | null; // Y/N - Audio recordings availability
  GRN: string; // Global Recordings Network availability
  GRNLang: string; // GRN language
  FourLaws: string; // Four Spiritual Laws availability
  GodStory: string; // God Story availability
  IndigenousLanguage: string | null; // Indigenous language status
  SomeMediumLanguage: string | null; // Some medium language status
  PrimaryMediumLanguage: string | null; // Primary medium language status
  GospelRadio: string; // Gospel radio availability
  ImageURL: string | null; // Image URL
  PhotoAddress: string | null; // Photo address
  PhotoCredits: string | null; // Photo credits
  ProfileTextExists: string | number; // Profile text exists flag (Y/N or 0/1)
  PeopleGroupURL: string; // URL to people group profile
  PeopleGroupPhotoURL: string; // URL to people group photo
  CountryURL: string; // URL to country profile
  JPScaleImageURL: string | null; // URL to JP Scale image
  Summary: string | null; // Summary text
  Resources: Array<{
    ROL3: string;
    Category: string;
    WebText: string;
    URL: string;
  }> | null; // Resources array
  NTOnline: string | null; // Y/N - NT available online
  NumberLanguagesSpoken: number | null; // Number of languages spoken
  OfficialLang: string | null; // Official language
  SpeakNationalLang: string | null; // Speak national language
}

/**
 * Generic API response wrapper
 */
export interface JPApiResponse<T> {
  data?: T[];
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Builds the URL for our Next.js API proxy
 */
function buildProxyUrl(
  endpoint: string,
  params?: Record<string, string | number>
): string {
  const url = new URL('/api/joshua-project', window.location.origin);
  url.searchParams.set('endpoint', endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

/**
 * Fetches data from our Joshua Project API proxy
 */
export async function fetchFromProxy<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T[]> {
  const url = buildProxyUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      errorData.error || `API request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  // Joshua Project API returns an array directly
  return Array.isArray(data) ? data : [];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetches a single country by FIPS code (ROG3) using the single country endpoint
 */
async function fetchCountryByFIPS(rog3: string): Promise<JPCountry | null> {
  try {
    // Use the single country endpoint: /countries/{id}.json where id is FIPS code
    const url = buildProxyUrl(`countries/${rog3}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store', // Disable caching to ensure fresh data
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Single endpoint returns an array with one item
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

    return result;
  } catch (error) {
    console.error(`Failed to fetch country by FIPS ${rog3}:`, error);
    throw error;
  }
}

/**
 * Fetch country statistics by FIPS code (ROG3)
 *
 * Uses the single country endpoint format: /v1/countries/{id}.json
 * where id is the 2-letter FIPS 10-4 code (ROG3).
 *
 * This function expects the FIPS code to be provided directly (typically from database).
 */
export async function fetchCountryStatsByFIPS(
  rog3: string
): Promise<JPCountry | null> {
  try {
    // Use the single country endpoint directly: /countries/{FIPS}.json
    const countryData = await fetchCountryByFIPS(rog3);

    return countryData;
  } catch (error) {
    console.error(`Failed to fetch country stats for FIPS ${rog3}:`, error);
    throw error;
  }
}

/**
 * Fetch country statistics by ISO3 code
 *
 * DEPRECATED: This function is kept for backward compatibility but should not be used.
 * Use fetchCountryStatsByFIPS instead, with FIPS code from database.
 *
 * This fallback builds a cache by fetching all countries if FIPS code is not available.
 */
export async function fetchCountryStats(
  iso3: string
): Promise<JPCountry | null> {
  try {
    // Fallback: fetch all countries and find the matching one
    const countries = await fetchFromProxy<JPCountry>('countries', {
      limit: 300,
    });

    const matchingCountry = countries.find(c => c.ISO3 === iso3);

    if (!matchingCountry || !matchingCountry.ROG3) {
      return null;
    }

    const rog3 = matchingCountry.ROG3;

    // Use the single country endpoint directly: /countries/{FIPS}.json
    return await fetchCountryStatsByFIPS(rog3);
  } catch (error) {
    console.error(`Failed to fetch country stats for ${iso3}:`, error);
    throw error;
  }
}

/**
 * Fetch language statistics by ROL3 code (Joshua Project language code)
 * Note: Joshua Project API uses ROL3 codes, which often match ISO 639-3 but not always.
 * We first try the direct endpoint /v1/languages/{ROL3}.json.
 * If that fails (404), we fall back to the list endpoint with ROL3 filter.
 */
export async function fetchLanguageStats(
  rol3: string
): Promise<JPLanguage | null> {
  try {
    // First, try direct endpoint: /v1/languages/{ROL3}.json
    try {
      const data = await fetchFromProxy<JPLanguage>(`languages/${rol3}`, {});

      return Array.isArray(data) ? data[0] || null : data || null;
    } catch (directError: unknown) {
      // If direct endpoint fails (e.g., 404), try list endpoint with filter
      if (
        directError instanceof Error &&
        (directError.message.includes('404') ||
          directError.message.includes('Failed to fetch'))
      ) {
        // Fallback to list endpoint with ROL3 filter
        const listData = await fetchFromProxy<JPLanguage>('languages', {
          ROL3: rol3,
        });

        return listData[0] || null;
      }

      // Re-throw if it's not a 404/network error
      throw directError;
    }
  } catch (error) {
    console.error(`Failed to fetch language stats for ROL3 ${rol3}:`, error);
    throw error;
  }
}

/**
 * Fetch people groups by FIPS code (2-letter FIPS 10-4 code)
 *
 * This is the preferred method as it uses FIPS codes directly from the database.
 * Uses the `countries` parameter with FIPS 10-4 code to filter people groups.
 * The API documentation specifies using 2-letter FIPS codes via the `countries` parameter.
 */
export async function fetchPeopleGroupsByFIPS(
  fips: string,
  page: number = 1,
  limit: number = 100,
  sortField?: string,
  sortDirection?: 'asc' | 'desc'
): Promise<JPPeopleGroup[]> {
  try {
    const params: Record<string, string | number> = {
      countries: fips, // FIPS 10-4 code (2-letter)
      limit,
      page,
      include_profile_text: 'Y',
      include_resources: 'Y',
    };

    if (sortField) {
      params.sort_field = sortField;
      if (sortDirection) {
        params.sort_direction = sortDirection;
      }
    }

    const data = await fetchFromProxy<JPPeopleGroup>('people_groups', params);

    return data;
  } catch (error) {
    console.error(`Failed to fetch people groups for FIPS ${fips}:`, error);
    throw error;
  }
}

/**
 * Fetch people groups by country (ISO3 code)
 *
 * DEPRECATED: Use fetchPeopleGroupsByFIPS instead with FIPS code from database.
 * This function is kept for backward compatibility.
 */
export async function fetchPeopleGroupsByCountry(
  iso3: string,
  limit: number = 100
): Promise<JPPeopleGroup[]> {
  try {
    // First, get the country stats to obtain ROG3 code (FIPS 10-4)
    const countryStats = await fetchCountryStats(iso3);

    if (!countryStats || !countryStats.ROG3) {
      return [];
    }

    const rog3 = countryStats.ROG3; // This is the FIPS 10-4 code (2-letter)

    // Use the `countries` parameter with FIPS code (ROG3) - this works correctly!
    const data = await fetchFromProxy<JPPeopleGroup>('people_groups', {
      countries: rog3, // FIPS 10-4 code (2-letter)
      limit,
      include_profile_text: 'Y',
      include_resources: 'Y',
    });

    return data;
  } catch (error) {
    console.error(`Failed to fetch people groups for country ${iso3}:`, error);
    throw error;
  }
}

/**
 * Fetch people groups by language (ROL3 code - Joshua Project language code)
 * Note: Joshua Project API uses ROL3 codes, which often match ISO 639-3 but not always.
 */
export async function fetchPeopleGroupsByLanguage(
  rol3: string,
  page: number = 1,
  limit: number = 100,
  sortField?: string,
  sortDirection?: 'asc' | 'desc'
): Promise<JPPeopleGroup[]> {
  try {
    const params: Record<string, string | number> = {
      languages: rol3,
      limit,
      page,
      include_profile_text: 'Y',
      include_resources: 'Y',
    };

    if (sortField) {
      params.sort_field = sortField;
      if (sortDirection) {
        params.sort_direction = sortDirection;
      }
    }

    const data = await fetchFromProxy<JPPeopleGroup>('people_groups', params);

    return data;
  } catch (error) {
    console.error(
      `Failed to fetch people groups for language ROL3 ${rol3}:`,
      error
    );
    throw error;
  }
}

// ============================================================================
// EXTERNAL ID LOOKUP HELPERS
// ============================================================================

/**
 * Type for external ID sources from our database
 */
export interface ExternalIdSource {
  external_id_type: string;
  external_id: string;
}

/**
 * Extracts ISO3 code from region sources
 */
export function extractISO3FromRegionSources(
  sources: ExternalIdSource[]
): string | null {
  const iso3Source = sources.find(
    s =>
      s.external_id_type === 'iso3166-1-alpha3' ||
      s.external_id_type === 'iso3166-1-alpha-3'
  );
  return iso3Source?.external_id || null;
}

/**
 * Extracts FIPS 10-4 code from region sources
 */
export function extractFIPSFromRegionSources(
  sources: ExternalIdSource[]
): string | null {
  const fipsSource = sources.find(s => s.external_id_type === 'fips-10-4');
  return fipsSource?.external_id || null;
}

/**
 * Extracts ISO 639-3 code from language entity sources
 */
export function extractISO6393FromLanguageSources(
  sources: ExternalIdSource[]
): string | null {
  const iso6393Source = sources.find(
    s => s.external_id_type === 'iso-639-3' || s.external_id_type === 'iso639-3'
  );
  return iso6393Source?.external_id || null;
}

/**
 * Extracts ROL3 code (Joshua Project language code) from language entity sources
 * ROL3 codes are Joshua Project's own language codes, which often match ISO 639-3
 * but not always. We try to find a dedicated ROL3 source first, then fall back to ISO 639-3.
 */
export function extractROL3FromLanguageSources(
  sources: ExternalIdSource[]
): string | null {
  if (!sources || sources.length === 0) {
    return null;
  }

  // First, try to find a dedicated ROL3/Joshua Project source
  const rol3Types = [
    'rol3',
    'rol_3',
    'jp_language_code',
    'joshua_project_code',
  ];
  for (const type of rol3Types) {
    const source = sources.find(
      s => s.external_id_type?.toLowerCase() === type.toLowerCase()
    );
    if (source?.external_id) {
      return source.external_id;
    }
  }

  // Fall back to ISO 639-3 (many ROL3 codes match ISO 639-3)
  const iso6393 = extractISO6393FromLanguageSources(sources);
  return iso6393;
}
