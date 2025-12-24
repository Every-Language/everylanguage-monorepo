import { supabase } from '@/shared/services/supabase';
import type { GlobalHeatmapPoint } from './types';
import { getPointLimitForZoom } from './constants';

export type UUID = string;

// -------- Analytics (Materialized Views) --------

export type DownloadsByCountry = {
  country_code: string | null;
  downloads: number;
  last_download_at: string | null;
};
export type ListeningTimeByCountry = {
  country_code: string | null;
  total_listened_seconds: number;
  last_listened_at: string | null;
};
export type PopularChaptersByCountry = {
  country_code: string | null;
  chapter_id: string;
  listen_count: number;
  recent_listen_at: string | null;
};

export type DownloadsByLanguage = {
  language_entity_id: string;
  downloads: number;
  last_download_at: string | null;
};
export type ListeningTimeByLanguage = {
  language_entity_id: string;
  total_listened_seconds: number;
  last_listened_at: string | null;
};
export type PopularChaptersByLanguage = {
  language_entity_id: string;
  chapter_id: string;
  listen_count: number;
  recent_listen_at: string | null;
};

function safeUpper2(code: unknown): string | null {
  const s = (typeof code === 'string' ? code : '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

export async function fetchDownloadsByCountryForLanguages(
  languageEntityIds: string[],
  rowLimit = 5000
): Promise<DownloadsByCountry[]> {
  if (languageEntityIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from('mv_language_downloads_by_country')
    .select('language_entity_id,country_code,downloads,last_download_at')
    .in('language_entity_id', languageEntityIds)
    .order('downloads', { ascending: false })
    .limit(rowLimit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    country_code?: string | null;
    downloads?: number | null;
    last_download_at?: string | null;
  }>;
  return rows.map(r => ({
    country_code: safeUpper2(r.country_code),
    downloads: Number(r.downloads ?? 0),
    last_download_at: r.last_download_at ?? null,
  }));
}

export async function fetchListeningByCountryForLanguages(
  languageEntityIds: string[],
  rowLimit = 5000
): Promise<ListeningTimeByCountry[]> {
  if (languageEntityIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from('mv_language_listening_time_by_country')
    .select(
      'language_entity_id,country_code,total_listened_seconds,last_listened_at'
    )
    .in('language_entity_id', languageEntityIds)
    .order('total_listened_seconds', { ascending: false })
    .limit(rowLimit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    country_code?: string | null;
    total_listened_seconds?: number | null;
    last_listened_at?: string | null;
  }>;
  return rows.map(r => ({
    country_code: safeUpper2(r.country_code),
    total_listened_seconds: Number(r.total_listened_seconds ?? 0),
    last_listened_at: r.last_listened_at ?? null,
  }));
}

export async function fetchPopularChaptersByCountryForLanguages(
  languageEntityIds: string[],
  rowLimit = 5000
): Promise<PopularChaptersByCountry[]> {
  if (languageEntityIds.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from('mv_language_popular_chapters_by_country')
    .select(
      'language_entity_id,country_code,chapter_id,listen_count,recent_listen_at'
    )
    .in('language_entity_id', languageEntityIds)
    .order('listen_count', { ascending: false })
    .limit(rowLimit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    country_code?: string | null;
    chapter_id?: string | null;
    listen_count?: number | null;
    recent_listen_at?: string | null;
  }>;
  return rows
    .filter(r => !!r.chapter_id)
    .map(r => ({
      country_code: safeUpper2(r.country_code),
      chapter_id: String(r.chapter_id),
      listen_count: Number(r.listen_count ?? 0),
      recent_listen_at: r.recent_listen_at ?? null,
    }));
}

export async function fetchDownloadsByLanguageForCountryCodes(
  countryCodes: string[],
  rowLimit = 10000
): Promise<DownloadsByLanguage[]> {
  if (countryCodes.length === 0) return [];
  const codes = countryCodes.map(safeUpper2).filter((c): c is string => !!c);
  if (codes.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from('mv_language_downloads_by_country')
    .select('language_entity_id,downloads,last_download_at,country_code')
    .in('country_code', codes)
    .order('downloads', { ascending: false })
    .limit(rowLimit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    language_entity_id?: string | null;
    downloads?: number | null;
    last_download_at?: string | null;
  }>;
  return rows
    .filter(r => !!r.language_entity_id)
    .map(r => ({
      language_entity_id: String(r.language_entity_id),
      downloads: Number(r.downloads ?? 0),
      last_download_at: r.last_download_at ?? null,
    }));
}

export async function fetchListeningByLanguageForCountryCodes(
  countryCodes: string[],
  rowLimit = 10000
): Promise<ListeningTimeByLanguage[]> {
  if (countryCodes.length === 0) return [];
  const codes = countryCodes.map(safeUpper2).filter((c): c is string => !!c);
  if (codes.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from('mv_language_listening_time_by_country')
    .select(
      'language_entity_id,total_listened_seconds,last_listened_at,country_code'
    )
    .in('country_code', codes)
    .order('total_listened_seconds', { ascending: false })
    .limit(rowLimit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    language_entity_id?: string | null;
    total_listened_seconds?: number | null;
    last_listened_at?: string | null;
  }>;
  return rows
    .filter(r => !!r.language_entity_id)
    .map(r => ({
      language_entity_id: String(r.language_entity_id),
      total_listened_seconds: Number(r.total_listened_seconds ?? 0),
      last_listened_at: r.last_listened_at ?? null,
    }));
}

export async function fetchPopularChaptersByLanguageForCountryCodes(
  countryCodes: string[],
  rowLimit = 10000
): Promise<PopularChaptersByLanguage[]> {
  if (countryCodes.length === 0) return [];
  const codes = countryCodes.map(safeUpper2).filter((c): c is string => !!c);
  if (codes.length === 0) return [];
  const { data, error } = await (supabase as any)
    .from('mv_language_popular_chapters_by_country')
    .select(
      'language_entity_id,chapter_id,listen_count,recent_listen_at,country_code'
    )
    .in('country_code', codes)
    .order('listen_count', { ascending: false })
    .limit(rowLimit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    language_entity_id?: string | null;
    chapter_id?: string | null;
    listen_count?: number | null;
    recent_listen_at?: string | null;
  }>;
  return rows
    .filter(r => !!r.language_entity_id && !!r.chapter_id)
    .map(r => ({
      language_entity_id: String(r.language_entity_id),
      chapter_id: String(r.chapter_id),
      listen_count: Number(r.listen_count ?? 0),
      recent_listen_at: r.recent_listen_at ?? null,
    }));
}

export async function fetchLanguageNames(
  languageIds: string[]
): Promise<Record<string, string>> {
  if (languageIds.length === 0) return {};
  const { data, error } = await supabase
    .from('language_entities')
    .select('id,name')
    .in('id', languageIds);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of data ?? []) {
    map[(r as any).id as string] = (r as any).name as string;
  }
  return map;
}

// Global sessions heatmap: fetch sessions aggregated by grid location
// Uses optimized PostGIS RPC function for efficient spatial and time filtering
// Supports optional language and region filtering
export async function fetchGlobalSessionsHeatmap(params: {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  timePeriodHours: number;
  zoom: number;
  languageEntityId?: string | null; // Optional: Filter by language entity ID
  regionId?: string | null; // Optional: Filter by region ID
}): Promise<GlobalHeatmapPoint[]> {
  const { bbox, timePeriodHours, zoom, languageEntityId, regionId } = params;
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Get point limit for zoom level
  // Note: grid size is fixed at 0.5° in the view to prevent points from jumping on zoom
  const pointLimit = getPointLimitForZoom(zoom);

  // Call optimized RPC function that queries the language_heatmap MV with PostGIS spatial filtering
  // Function uses SECURITY DEFINER to bypass RLS policies for analytics aggregation
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    'get_language_heatmap',
    {
      p_min_lng: minLng,
      p_min_lat: minLat,
      p_max_lng: maxLng,
      p_max_lat: maxLat,
      p_time_period_hours: timePeriodHours,
      p_point_limit: pointLimit,
      p_language_entity_id: languageEntityId ?? null,
      p_region_id: regionId ?? null,
    }
  );

  if (rpcError) throw rpcError;
  if (!rpcData) return [];

  // Map RPC response directly to GlobalHeatmapPoint[]
  // RPC already returns lon/lat (not geometry), age_normalized, and formatted languages
  return (
    rpcData as Array<{
      lon?: number;
      lat?: number;
      intensity?: number;
      session_count?: number;
      total_duration_seconds?: number;
      most_recent_session_start?: string | null;
      most_recent_chapter_listen?: string | null;
      languages?: string[] | any; // JSONB array - Supabase may return as array or string
      age_normalized?: number;
    }>
  ).map(row => {
    // Handle languages - Supabase RPC returns JSONB which may be parsed or string
    let languagesArray: string[] = [];
    if (row.languages) {
      if (Array.isArray(row.languages)) {
        languagesArray = row.languages;
      } else if (typeof row.languages === 'string') {
        try {
          const parsed = JSON.parse(row.languages);
          languagesArray = Array.isArray(parsed) ? parsed : [];
        } catch {
          // Ignore parse errors, use empty array
        }
      }
    }

    return {
      lon: Number(row.lon ?? 0),
      lat: Number(row.lat ?? 0),
      intensity: Number(row.intensity ?? 0),
      sessionCount: Number(row.session_count ?? 0),
      totalDurationSeconds: Number(row.total_duration_seconds ?? 0),
      mostRecentSessionStart: row.most_recent_session_start ?? null,
      mostRecentChapterListen: row.most_recent_chapter_listen ?? null,
      languages: languagesArray,
      ageNormalized: Number(row.age_normalized ?? 0),
    };
  });
}
