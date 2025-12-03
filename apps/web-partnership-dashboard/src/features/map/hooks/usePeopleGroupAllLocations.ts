import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { extractPointCoordinates } from '../services/locationUtils';

type LocationPoint = {
  coordinates: [number, number]; // [longitude, latitude]
  regionId: string;
};

/**
 * Hook for fetching ALL people_groups_regions rows with location_point
 * for a given people_group_id. Used to calculate bbox for fitting viewport
 * to show all points when selected from search (not clicked on map).
 */
export function usePeopleGroupAllLocations(peopleGroupId: string): {
  locations: LocationPoint[];
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!peopleGroupId && peopleGroupId.trim() !== '';

  const locationsQuery = useQuery({
    queryKey: ['people_group_all_locations', peopleGroupId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('people_groups_regions')
        .select('location_point, region_id')
        .eq('people_group_id', peopleGroupId)
        .not('location_point', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const locations: LocationPoint[] = [];

      for (const row of data) {
        const coordinates = extractPointCoordinates(row.location_point);
        if (coordinates) {
          locations.push({
            coordinates,
            regionId: row.region_id,
          });
        }
      }

      return locations;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  return {
    locations: locationsQuery.data ?? [],
    isLoading: locationsQuery.isLoading,
    error: locationsQuery.error as Error | null,
  };
}
