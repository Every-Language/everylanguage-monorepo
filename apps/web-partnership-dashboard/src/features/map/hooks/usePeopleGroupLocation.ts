import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { extractPointCoordinates } from '../services/locationUtils';

type PeopleGroupLocation = {
  coordinates: [number, number]; // [longitude, latitude]
  regionId: string;
} | null;

/**
 * Hook for fetching the first people_groups_regions row with a location_point
 * for a given people_group_id, ordered by population DESC.
 * Also returns the region_id for fallback logic.
 */
export function usePeopleGroupLocation(peopleGroupId: string): {
  location: PeopleGroupLocation;
  isLoading: boolean;
  error: Error | null;
  hasAnyRegions: boolean; // Whether any people_groups_regions exist (even without location)
  firstRegionId: string | null; // First region_id for fallback logic
} {
  const enabled = !!peopleGroupId && peopleGroupId.trim() !== '';

  // First, check if there are any people_groups_regions at all
  const hasRegionsQuery = useQuery({
    queryKey: ['people_groups_regions_exists', peopleGroupId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('people_groups_regions')
        .select('id')
        .eq('people_group_id', peopleGroupId)
        .is('deleted_at', null)
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  // Query first people_groups_regions with location_point, ordered by population DESC
  const locationQuery = useQuery({
    queryKey: ['people_group_location', peopleGroupId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('people_groups_regions')
        .select('location_point, region_id, population')
        .eq('people_group_id', peopleGroupId)
        .not('location_point', 'is', null)
        .is('deleted_at', null)
        .order('population', { ascending: false, nullsLast: true })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0] as {
        location_point: unknown;
        region_id: string;
      };

      const coordinates = extractPointCoordinates(row.location_point);
      if (!coordinates) return null;

      return {
        coordinates,
        regionId: row.region_id,
      } as PeopleGroupLocation;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  // Also fetch first region_id (even without location) for fallback
  const firstRegionQuery = useQuery({
    queryKey: ['people_group_first_region', peopleGroupId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('people_groups_regions')
        .select('region_id')
        .eq('people_group_id', peopleGroupId)
        .is('deleted_at', null)
        .order('population', { ascending: false, nullsLast: true })
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
