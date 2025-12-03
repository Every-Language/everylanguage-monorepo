import { supabase } from '@/shared/services/supabase';
import type { CountryWithBibleStatus } from './types';

/**
 * Fetch all countries with their boundaries and bible status scores
 * Uses RPC function for efficient fetching with pre-calculated scores
 */
export async function fetchCountriesWithBibleStatus(): Promise<
  CountryWithBibleStatus[]
> {
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
    'get_countries_with_bible_status'
  );

  if (rpcError) {
    console.error('[fetchCountriesWithBibleStatus] RPC Error:', rpcError);
    throw rpcError;
  }

  if (!rpcData) {
    console.warn('[fetchCountriesWithBibleStatus] No data returned');
    return [];
  }

  // Map RPC response to CountryWithBibleStatus[]
  return (
    rpcData as Array<{
      region_id?: string;
      region_name?: string;
      boundary_simplified?: unknown;
      language_count?: number;
      languages_no_scripture?: number;
      languages_portions?: number;
      languages_new_testament?: number;
      languages_full_bible?: number;
      bible_status_score?: number;
    }>
  )
    .filter(
      row =>
        row.region_id &&
        row.region_name &&
        row.boundary_simplified &&
        typeof row.language_count === 'number' &&
        typeof row.bible_status_score === 'number'
    )
    .map(row => ({
      region_id: String(row.region_id!),
      region_name: String(row.region_name!),
      boundary_simplified: row.boundary_simplified as GeoJSON.MultiPolygon,
      language_count: Number(row.language_count!),
      languages_no_scripture: Number(row.languages_no_scripture ?? 0),
      languages_portions: Number(row.languages_portions ?? 0),
      languages_new_testament: Number(row.languages_new_testament ?? 0),
      languages_full_bible: Number(row.languages_full_bible ?? 0),
      bible_status_score: Number(row.bible_status_score!),
    }));
}
