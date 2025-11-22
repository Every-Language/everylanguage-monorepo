import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { extractPointCoordinates } from '../services/locationUtils';

type LanguageEntityLocation = {
  coordinates: [number, number]; // [longitude, latitude]
  regionId: string;
} | null;

/**
 * Hook for fetching the first language_entities_regions row with a location point
 * for a given language_entity_id, ordered by dominance_level DESC.
 * Also returns the region_id for fallback logic.
 */
export function useLanguageEntityLocation(languageEntityId: string): {
  location: LanguageEntityLocation;
  isLoading: boolean;
  error: Error | null;
  hasAnyRegions: boolean; // Whether any language_entities_regions exist (even without location)
  firstRegionId: string | null; // First region_id for fallback logic
} {
  const enabled = !!languageEntityId && languageEntityId.trim() !== '';

  // First, check if there are any language_entities_regions at all
  const hasRegionsQuery = useQuery({
    queryKey: ['language_entities_regions_exists', languageEntityId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('language_entities_regions')
        .select('id')
        .eq('language_entity_id', languageEntityId)
        .is('deleted_at', null)
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  // Query first language_entities_regions with location, ordered by dominance_level DESC
  const locationQuery = useQuery({
    queryKey: ['language_entity_location', languageEntityId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('language_entities_regions')
        .select('location, region_id, dominance_level')
        .eq('language_entity_id', languageEntityId)
        .not('location', 'is', null)
        .is('deleted_at', null)
        .order('dominance_level', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0] as {
        location: unknown;
        region_id: string;
      };

      const coordinates = extractPointCoordinates(row.location);
      if (!coordinates) return null;

      return {
        coordinates,
        regionId: row.region_id,
      } as LanguageEntityLocation;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  // Also fetch first region_id (even without location) for fallback
  const firstRegionQuery = useQuery({
    queryKey: ['language_entity_first_region', languageEntityId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('language_entities_regions')
        .select('region_id')
        .eq('language_entity_id', languageEntityId)
        .is('deleted_at', null)
        .order('dominance_level', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0] as { region_id: string };
      return row.region_id;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  return {
    location: locationQuery.data ?? null,
    isLoading: locationQuery.isLoading || hasRegionsQuery.isLoading,
    error: (locationQuery.error || hasRegionsQuery.error) as Error | null,
    hasAnyRegions: hasRegionsQuery.data ?? false,
    firstRegionId: firstRegionQuery.data ?? null,
  };
}
