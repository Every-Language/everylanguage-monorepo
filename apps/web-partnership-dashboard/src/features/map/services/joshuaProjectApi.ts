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
  ROG3: string; // ISO 3166-1 alpha-3 country code
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
  WBPopulation: number; // Population estimate
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
  BibleStatus: string; // Bible translation status
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
  PeopleGroups: number; // Number of people groups
  PercentPeopleGroups: number; // Percent of people groups
}

/**
 * Language statistics from Joshua Project
 */
export interface JPLanguage {
  ROL3: string; // ISO 639-3 language code
  Language: string; // Language name
  HubCountry: string; // Hub country
  HubCountryISO: string; // Hub country ISO code
  PoplPeoplesLR: number; // Population of peoples that are least reached
  PoplPeoplesFPG: number; // Population of peoples in frontier people groups
  PoplPeoples: number; // Total population speaking this language
  JPScalePC: number | null; // Joshua Project Scale for Primary Context
  PercentChristianPC: number; // Percent Christian Primary Context
  PercentEvangelicalPC: number; // Percent Evangelical Primary Context
  BibleYear: number | null; // Year of Bible translation
  BibleStatus: string; // Bible translation status
  NTYear: number | null; // Year of New Testament translation
  PortionsYear: number | null; // Year of Portions translation
  PrimaryReligion: string; // Primary religion
  JPScaleText: string | null; // Text description of JP Scale
  TranslationNeedQuestionable: number; // Translation need questionable flag
  AudioRecordings: string; // Audio recordings availability
  BibleTranslationNeed: string; // Bible translation need
  GospelAccess: string | null; // Gospel Access level (only in some contexts)
  PercentEvangelical: number; // Percent Evangelical (available in language stats too)
  NTPrimaryText: string; // NT primary text status
  BiblePrimaryText: string; // Bible primary text status
  NTPrimaryAudio: string; // NT primary audio status
  BiblePrimaryAudio: string; // Bible primary audio status
  TranslationNeed: string; // Translation need status
  Countries: number; // Number of countries where spoken
  Peoples: number; // Number of people groups
}

/**
 * People Group from Joshua Project
 */
export interface JPPeopleGroup {
  PeopleID3: string; // People group ID
  PeopNameInCountry: string; // People name in country
  ROG3: string; // Country code (ISO 3166-1 alpha-3)
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
  BibleStatus: string; // Bible translation status
  BibleYear: number | null; // Year of Bible translation
  NTYear: number | null; // Year of New Testament translation
  PortionsYear: number | null; // Year of Portions translation
  TranslationNeedYear: number | null; // Year translation need identified
  BibleTranslationNeed: string; // Bible translation need description
  JF: string; // JESUS Film availability
  JFLang: string; // JESUS Film language
  JFPrimaryText: string; // JESUS Film primary text
  AudioScripture: string; // Audio Scripture availability
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
  ProfileTextExists: number; // Profile text exists flag (0/1)
  PeopleGroupURL: string; // URL to people group profile
  PeopleGroupPhotoURL: string; // URL to people group photo
  CountryURL: string; // URL to country profile
  JPScaleImageURL: string | null; // URL to JP Scale image
  Summary: string | null; // Summary text
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
function buildProxyUrl(endpoint: string, params?: Record<string, string | number>): string {
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
async function fetchFromProxy<T>(endpoint: string, params?: Record<string, string | number>): Promise<T[]> {
  const url = buildProxyUrl(endpoint, params);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }
  
  const data = await response.json();
  
  // Joshua Project API returns an array directly
  return Array.isArray(data) ? data : [];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch country statistics by ISO3 code
 * Note: We use the list endpoint with ISO3 filter because the single country
 * endpoint expects ROG3 (Joshua Project's code), not ISO3
 */
export async function fetchCountryStats(iso3: string): Promise<JPCountry | null> {
  try {
    const data = await fetchFromProxy<JPCountry>('countries', {
      ISO3: iso3,
    });
    return data[0] || null;
  } catch (error) {
    console.error(`Failed to fetch country stats for ${iso3}:`, error);
    throw error;
  }
}

/**
 * Fetch language statistics by ISO 639-3 code
 * Note: We use the list endpoint with ROL3 filter because the single language
 * endpoint expects Joshua Project's language code
 */
export async function fetchLanguageStats(iso6393: string): Promise<JPLanguage | null> {
  try {
    const data = await fetchFromProxy<JPLanguage>('languages', {
      ROL3: iso6393,
    });
    return data[0] || null;
  } catch (error) {
    console.error(`Failed to fetch language stats for ${iso6393}:`, error);
    throw error;
  }
}

/**
 * Fetch people groups by country (ISO3 code)
 */
export async function fetchPeopleGroupsByCountry(
  iso3: string,
  limit: number = 100
): Promise<JPPeopleGroup[]> {
  try {
    return await fetchFromProxy<JPPeopleGroup>('people_groups', {
      ROG3: iso3,
      limit,
    });
  } catch (error) {
    console.error(`Failed to fetch people groups for country ${iso3}:`, error);
    throw error;
  }
}

/**
 * Fetch people groups by language (ISO 639-3 code)
 */
export async function fetchPeopleGroupsByLanguage(
  iso6393: string,
  limit: number = 100
): Promise<JPPeopleGroup[]> {
  try {
    return await fetchFromProxy<JPPeopleGroup>('people_groups', {
      ROL3: iso6393,
      limit,
    });
  } catch (error) {
    console.error(`Failed to fetch people groups for language ${iso6393}:`, error);
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
export function extractISO3FromRegionSources(sources: ExternalIdSource[]): string | null {
  const iso3Source = sources.find(
    (s) => s.external_id_type === 'iso3166-1-alpha3' || s.external_id_type === 'iso3166-1-alpha-3'
  );
  return iso3Source?.external_id || null;
}

/**
 * Extracts ISO 639-3 code from language entity sources
 */
export function extractISO6393FromLanguageSources(sources: ExternalIdSource[]): string | null {
  const iso6393Source = sources.find(
    (s) => s.external_id_type === 'iso-639-3' || s.external_id_type === 'iso639-3'
  );
  return iso6393Source?.external_id || null;
}

