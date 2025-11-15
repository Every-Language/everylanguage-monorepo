/**
 * GRN API Client
 *
 * Provides typed functions to interact with the Global Recordings Network API
 * through our Next.js API proxy.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * GRN ISO Feed (for looking up GRN Language Numbers from ISO codes)
 */
export interface GRNISOFeed {
  iso: string;
  name: string;
  grnIds: {
    pair: Array<{
      id: number;
      value: string;
    }>;
  };
  version: number;
  fetchTime: string;
}

/**
 * GRN Program (from language feed)
 */
export interface GRNProgram {
  id: number;
  state: number;
  title: string;
  vernacular_title: string;
  programType: number;
  copyright_key: number;
  picture: string;
  youtubeVideoId?: string;
  duration: number;
  tracks: number;
}

/**
 * GRN Language Feed
 */
export interface GRNLanguageFeed {
  id: number;
  name: string;
  nameIetf: string;
  audioSample: boolean;
  ietf: string;
  iso: string;
  mediaIds: Array<{ org_key: number; code: string }>;
  alternateNames: Array<{ name: string; ietf: string; best?: string }>;
  programs: {
    program: GRNProgram[];
  };
  version: number;
  fetchTime: string;
}

/**
 * GRN Track Format
 */
export interface GRNTrackFormat {
  format: string;
  size: number;
  duration: string;
}

/**
 * GRN Track (from set feed)
 */
export interface GRNTrack {
  id: number;
  title: string;
  bible?: string;
  text?: string;
  langId: number;
  picture: string;
  scriptId: string;
  picno: number;
  pictures: Array<{ ratio: number; image: string }>;
  trackFileSuffix: string;
  trackFormats: GRNTrackFormat[];
}

/**
 * GRN Set Format
 */
export interface GRNSetFormat {
  format: string;
  size: number;
  duration: string;
}

/**
 * GRN Language in Set
 */
export interface GRNSetLanguage {
  id: number;
  value: string;
}

/**
 * GRN Set Feed (program details)
 */
export interface GRNSetFeed {
  grnId: number;
  state: number;
  title: string;
  vernacular_title: string;
  copyright_key: number;
  recyear?: string;
  primaryLanguage: number;
  languages: GRNSetLanguage[];
  textLang: string;
  youTube?: string;
  lastModified: string;
  setPath: string;
  setFileBase: string;
  setFileSuffix: string;
  setFormats: GRNSetFormat[];
  tracks: GRNTrack[];
  version: number;
  fetchTime: string;
}

/**
 * Type for external ID sources from our database
 */
export interface ExternalIdSource {
  external_id_type: string;
  external_id: string;
  source?: string; // Add source field for better matching
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
  const url = new URL('/api/grn', window.location.origin);
  url.searchParams.set('endpoint', endpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

/**
 * Fetches data from our GRN API proxy
 */
async function fetchFromProxy<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = buildProxyUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If response is not JSON, use default error message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Check if the response contains an error field
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(data.error || 'Unknown error from API');
  }

  return data;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch ISO feed to get GRN Language Number from ISO code
 */
export async function fetchISOFeed(
  isoCode: string
): Promise<GRNISOFeed | null> {
  try {
    const data = await fetchFromProxy<GRNISOFeed>(`feeds/iso/${isoCode}`);
    console.log(`[GRN API] Fetched ISO feed for ${isoCode}:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch ISO feed for ${isoCode}:`, error);
    throw error;
  }
}

/**
 * Fetch language feed by ROLV code
 */
export async function fetchLanguageFeed(
  rolvCode: string
): Promise<GRNLanguageFeed | null> {
  try {
    const data = await fetchFromProxy<GRNLanguageFeed>(
      `feeds/language/${rolvCode}`
    );
    console.log(`[GRN API] Fetched language feed for ROLV ${rolvCode}:`, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch language feed for ROLV ${rolvCode}:`, error);
    throw error;
  }
}

/**
 * Fetch set/program feed by set ID
 */
export async function fetchSetFeed(
  setId: string | number
): Promise<GRNSetFeed | null> {
  try {
    return await fetchFromProxy<GRNSetFeed>(`feeds/set/${setId}`);
  } catch (error) {
    console.error(`Failed to fetch set feed for ${setId}:`, error);
    throw error;
  }
}

/**
 * Get track audio URL
 * Note: This endpoint returns a redirect, so we return the proxy URL
 * The browser will follow the redirect to the actual audio file
 */
export function getTrackUrl(
  setId: string | number,
  trackId: string | number
): string {
  return buildProxyUrl(`files/track/${setId}/${trackId}`);
}

/**
 * Get set files URL
 * Note: This endpoint returns a redirect or JSON, so we return the proxy URL
 */
export function getSetFilesUrl(setId: string | number): string {
  return buildProxyUrl(`files/set/${setId}`);
}

/**
 * Get language files URL
 * Note: This endpoint returns a redirect or JSON, so we return the proxy URL
 */
export function getLanguageFilesUrl(rolvCode: string): string {
  return buildProxyUrl(`files/language/mp3/${rolvCode}`);
}

// ============================================================================
// EXTERNAL ID LOOKUP HELPERS
// ============================================================================

/**
 * Extracts ISO 639-3 code from language entity sources
 */
export function extractISO6393FromLanguageSources(
  sources: ExternalIdSource[]
): string | null {
  const isoSource = sources.find(
    s => s.external_id_type === 'iso-639-3' || s.external_id_type === 'iso639-3'
  );
  return isoSource?.external_id || null;
}

/**
 * Extracts ROLV code or GRN Language Number from language entity sources
 * Supports multiple external ID types for GRN identification
 * The GRN API uses Language Numbers (not ROLV codes) for the /feeds/language/{id} endpoint
 */
export function extractROLVFromLanguageSources(
  sources: ExternalIdSource[]
): string | null {
  if (!sources || sources.length === 0) {
    return null;
  }

  // First, try to find ROLV code by external_id_type
  const rolvTypes = ['rolv_code', 'rolv'];
  for (const type of rolvTypes) {
    const source = sources.find(s => s.external_id_type === type);
    if (source?.external_id) {
      return source.external_id;
    }
  }

  // Then, try to find GRN Language Number by external_id_type
  const grnLanguageNumberTypes = [
    'grn_language_number',
    'grn_language_id',
    'grn_id',
    'grn',
  ];
  for (const type of grnLanguageNumberTypes) {
    const source = sources.find(s => s.external_id_type === type);
    if (source?.external_id) {
      return source.external_id;
    }
  }

  // Also check if source field is 'GRN' (case-insensitive)
  // This catches cases where the source is GRN but external_id_type might be different
  const grnSource = sources.find(
    s => s.source?.toLowerCase() === 'grn' && s.external_id
  );
  if (grnSource?.external_id) {
    return grnSource.external_id;
  }

  return null;
}
