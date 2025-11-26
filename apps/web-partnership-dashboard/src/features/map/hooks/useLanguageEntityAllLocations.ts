import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { extractPointCoordinates } from '../services/locationUtils';

type LocationPoint = {
  coordinates: [number, number]; // [longitude, latitude]
  regionId: string;
};

/**
 * Hook for fetching ALL language_entities_regions rows with location points
 * for a given language_entity_id. Used to calculate bbox for fitting viewport
 * to show all points when selected from search (not clicked on map).
 */
export function useLanguageEntityAllLocations(languageEntityId: string): {
  locations: LocationPoint[];
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!languageEntityId && languageEntityId.trim() !== '';

  const locationsQuery = useQuery({
    queryKey: ['language_entity_all_locations', languageEntityId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('language_entities_regions')
        .select('location, region_id')
        .eq('language_entity_id', languageEntityId)
        .not('location', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const locations: LocationPoint[] = [];

      for (const row of data) {
        const coordinates = extractPointCoordinates(row.location);
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
