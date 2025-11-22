import { supabase } from '@/shared/services/supabase';
import type { PeopleGroupWithLocation } from './types';
import { getPointLimitForZoom } from '../analytics/constants';

/**
 * Fetch people groups with location data filtered by viewport bounding box
 * Uses PostGIS spatial filtering for efficient viewport-based fetching
 */
export async function fetchPeopleGroupsWithLocation(params: {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  zoom: number;
}): Promise<PeopleGroupWithLocation[]> {
  const { bbox, zoom } = params;
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Get point limit for zoom level (reuse from analytics constants)
  const pointLimit = getPointLimitForZoom(zoom);

  // Call RPC function with bbox filtering
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    'get_all_people_group_coordinates',
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
    console.error('[fetchPeopleGroupsWithLocation] RPC Error:', rpcError);
    throw rpcError;
  }

  if (!rpcData) {
    console.warn('[fetchPeopleGroupsWithLocation] No data returned');
    return [];
  }

  // Debug logging for results
  const resultCount = rpcData.length;
  const hitLimit = resultCount >= pointLimit;

  if (hitLimit) {
    console.warn(
      `[fetchPeopleGroupsWithLocation] WARNING: Hit point limit of ${pointLimit}. Some points may be missing from viewport.`
    );
  }

  // Map RPC response to PeopleGroupWithLocation[]
  return (
    rpcData as Array<{
      people_group_id?: string;
      people_group_name?: string;
      region_id?: string;
      region_name?: string;
      longitude?: number;
      latitude?: number;
      peop_name_in_country?: string | null;
      population?: number | null;
      language_count?: number | null;
      country_count?: number | null;
      primary_language_rol3?: string | null;
      primary_language_name?: string | null;
      primary_language_bible_status?: number | null;
      image_url?: string | null;
      jpscale?: number | null;
      least_reached?: boolean | null;
      frontier?: boolean | null;
      primary_religion?: string | null;
      percent_evangelical?: number | null;
      percent_christian_pc?: number | null;
      bible_status?: number | null;
      has_audio_recordings?: boolean | null;
      has_jesus_film?: boolean | null;
      stats_computed_at?: string | null;
    }>
  )
    .filter(
      row =>
        row.people_group_id &&
        row.people_group_name &&
        row.region_id &&
        row.region_name &&
        typeof row.longitude === 'number' &&
        typeof row.latitude === 'number'
    )
    .map(row => ({
      people_group_id: String(row.people_group_id!),
      people_group_name: String(row.people_group_name!),
      region_id: String(row.region_id!),
      region_name: String(row.region_name!),
      longitude: Number(row.longitude!),
      latitude: Number(row.latitude!),
      peop_name_in_country: row.peop_name_in_country ?? null,
      population: row.population ?? null,
      language_count: row.language_count ?? null,
      country_count: row.country_count ?? null,
      primary_language_rol3: row.primary_language_rol3 ?? null,
      primary_language_name: row.primary_language_name ?? null,
      primary_language_bible_status: row.primary_language_bible_status ?? null,
      image_url: row.image_url ?? null,
      jpscale: row.jpscale ?? null,
      least_reached: row.least_reached ?? null,
      frontier: row.frontier ?? null,
      primary_religion: row.primary_religion ?? null,
      percent_evangelical: row.percent_evangelical ?? null,
      percent_christian_pc: row.percent_christian_pc ?? null,
      bible_status: row.bible_status ?? null,
      has_audio_recordings: row.has_audio_recordings ?? null,
      has_jesus_film: row.has_jesus_film ?? null,
      stats_computed_at: row.stats_computed_at ?? null,
    }));
}
