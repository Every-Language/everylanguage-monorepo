import { supabase } from '@/shared/services/supabase';
import type { LanguageWithLocation } from './types';
import { getPointLimitForZoom } from '../analytics/constants';

/**
 * Fetch languages with location data filtered by viewport bounding box
 * Uses PostGIS spatial filtering for efficient viewport-based fetching
 */
export async function fetchLanguagesWithLocation(params: {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  zoom: number;
}): Promise<LanguageWithLocation[]> {
  const { bbox, zoom } = params;
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Get point limit for zoom level (reuse from analytics constants)
  const pointLimit = getPointLimitForZoom(zoom);

  // Call RPC function with bbox filtering
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    'get_all_language_coordinates',
    {
      p_min_lng: minLng,
      p_min_lat: minLat,
      p_max_lng: maxLng,
      p_max_lat: maxLat,
      p_limit: pointLimit,
      p_location_source: null, // No location source filter for now
    }
  );

  if (rpcError) {
    console.error('[fetchLanguagesWithLocation] RPC Error:', rpcError);
    throw rpcError;
  }

  if (!rpcData) {
    console.warn('[fetchLanguagesWithLocation] No data returned');
    return [];
  }

  // Debug logging for results
  const resultCount = rpcData.length;
  const hitLimit = resultCount >= pointLimit;

  if (hitLimit) {
    console.warn(
      `[fetchLanguagesWithLocation] WARNING: Hit point limit of ${pointLimit}. Some points may be missing from viewport.`
    );
  }

  // Map RPC response to LanguageWithLocation[]
  return (
    rpcData as Array<{
      language_entity_id?: string;
      language_name?: string;
      region_id?: string;
      region_name?: string;
      longitude?: number;
      latitude?: number;
      location_source?: string | null;
      has_full_audio_bible?: boolean | null;
      has_audio_portions?: boolean | null;
      has_text_portions?: boolean | null;
      bible_status?: number | null;
      has_jesus_film?: boolean | null;
      iso639_3?: string | null;
      rolv_code?: string | null;
      bible_stats_computed_at?: string | null;
    }>
  )
    .filter(
      row =>
        row.language_entity_id &&
        row.language_name &&
        row.region_id &&
        row.region_name &&
        typeof row.longitude === 'number' &&
        typeof row.latitude === 'number'
    )
    .map(row => ({
      language_entity_id: String(row.language_entity_id!),
      language_name: String(row.language_name!),
      region_id: String(row.region_id!),
      region_name: String(row.region_name!),
      longitude: Number(row.longitude!),
      latitude: Number(row.latitude!),
      location_source: row.location_source ?? null,
      has_full_audio_bible: row.has_full_audio_bible ?? null,
      has_audio_portions: row.has_audio_portions ?? null,
      has_text_portions: row.has_text_portions ?? null,
      bible_status: row.bible_status ?? null,
      has_jesus_film: row.has_jesus_film ?? null,
      iso639_3: row.iso639_3 ?? null,
      rolv_code: row.rolv_code ?? null,
      bible_stats_computed_at: row.bible_stats_computed_at ?? null,
    }));
}
