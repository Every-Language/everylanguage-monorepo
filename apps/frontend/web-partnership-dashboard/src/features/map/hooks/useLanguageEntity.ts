import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { selectPrimaryRegion } from '../services/regionSelection';

type LanguageEntity = {
  id: string;
  name: string;
  level: string;
  aliases: string[];
};

type LanguageProperty = {
  id: string;
  key: string;
  value: string;
};

/**
 * Hook for fetching language entity data including entity info, properties,
 * descendants, and primary region.
 */
export function useLanguageEntity(id: string) {
  // Fetch entity with aliases
  const entity = useQuery({
    queryKey: ['language_entity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('id,name,level,language_aliases(alias_name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      const row = data as unknown as {
        id: string;
        name: string;
        level: string;
        language_aliases?: Array<{ alias_name: string | null }>;
      };
      const aliases = (row.language_aliases ?? [])
        .map(a => a.alias_name)
        .filter((v): v is string => !!v);
      return {
        id: row.id,
        name: row.name,
        level: row.level,
        aliases,
      } as LanguageEntity;
    },
  });

  // Fetch properties
  const properties = useQuery({
    queryKey: ['language_properties', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_properties')
        .select('id,key,value')
        .eq('language_entity_id', id);
      if (error) throw error;
      return (data ?? []) as LanguageProperty[];
    },
  });

  // Fetch descendants (for aggregated data)
  const descendants = useQuery({
    queryKey: ['language-descendants', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_language_entity_hierarchy',
        {
          entity_id: id,
          generations_up: 0,
          generations_down: 6,
        }
      );
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        hierarchy_entity_id: string;
        relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
      }>;
      const ids = new Set<string>();
      for (const r of rows) {
        if (
          r.relationship_type === 'self' ||
          r.relationship_type === 'descendant'
        ) {
          ids.add(r.hierarchy_entity_id);
        }
      }
      // Ensure self id is present even if hierarchy function returns empty
      ids.add(id);
      const arr = Array.from(ids);
      arr.sort(); // stabilize
      return arr;
    },
  });

  // Pick primary region based on dominance
  const primaryRegion = useQuery({
    queryKey: ['language_primary_region', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities_regions')
        .select('*,regions(id)')
        .eq('language_entity_id', id);
      if (error) throw error;
      type Row = { regions?: { id?: string | null } | null } & Record<
        string,
        unknown
      >;
      const rows = (data ?? []) as Row[];
      if (!rows.length) return null as { regionId: string } | null;

      const regionId = selectPrimaryRegion(rows);
      if (!regionId) return null;
      return { regionId };
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    entity,
    properties,
    descendants,
    primaryRegion,
  };
}
