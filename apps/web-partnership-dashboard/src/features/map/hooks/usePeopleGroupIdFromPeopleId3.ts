import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

/**
 * Hook to map people_id3 (Joshua Project ID) to people_group_id (UUID)
 */
export function usePeopleGroupIdFromPeopleId3(
  peopleId3: number | null | undefined
) {
  return useQuery({
    queryKey: ['people-group-id-from-people-id3', peopleId3],
    queryFn: async () => {
      if (!peopleId3) return null;

      const { data, error } = await supabase
        .from('people_groups')
        .select('id')
        .eq('people_id3', peopleId3)
        .is('deleted_at', null)
        .single();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return (data as { id: string } | null)?.id ?? null;
    },
    enabled: !!peopleId3,
    staleTime: 60 * 60 * 1000, // 1 hour - IDs rarely change
  });
}
